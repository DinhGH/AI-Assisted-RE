import { create } from "zustand";
import { persist } from "zustand/middleware";
import { requirementService } from "../services/requirementService";
import { chatService } from "../services/chatService";

function createId(prefix = "session") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

function createSession(name) {
  return {
    id: createId("session"),
    name: name || `Session ${new Date().toLocaleString()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    documentIds: [],
    activeDocumentId: null,
    requirements: [],
    selectedRequirementId: null,
    chatMessages: [],
  };
}

function updateActiveSession(state, updater) {
  const sessionIndex = state.sessions.findIndex(
    (item) => item.id === state.activeSessionId,
  );

  if (sessionIndex < 0) {
    const fallback = createSession();
    const updated = updater(fallback);
    return {
      sessions: [updated],
      activeSessionId: updated.id,
    };
  }

  const sessions = [...state.sessions];
  const current = sessions[sessionIndex];
  const next = updater(current);
  sessions[sessionIndex] = {
    ...next,
    updatedAt: new Date().toISOString(),
  };

  return { sessions };
}

function ensureDefaultSession(state) {
  if (state.sessions?.length) {
    return state;
  }
  const initialSession = createSession("First session");
  return {
    ...state,
    sessions: [initialSession],
    activeSessionId: initialSession.id,
  };
}

function mergeRequirementsById(existingRequirements, fetchedRequirements) {
  const requirementsById = new Map();

  [...existingRequirements, ...fetchedRequirements].forEach((item) => {
    if (!item?.id) {
      return;
    }

    const current = requirementsById.get(item.id) || {};
    requirementsById.set(item.id, {
      ...current,
      ...item,
    });
  });

  return Array.from(requirementsById.values()).sort(
    (left, right) => left.id - right.id,
  );
}

const initialSession = createSession("First session");

export const useAppStore = create(
  persist(
    (set, get) => ({
      sessions: [initialSession],
      activeSessionId: initialSession.id,
      loading: false,
      error: null,
      success: null,

      refreshActiveSessionRequirements: async ({
        retries = 6,
        delayMs = 1200,
      } = {}) => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        for (let attempt = 0; attempt < retries; attempt += 1) {
          const state = get();
          const session = state.sessions.find(
            (item) => item.id === state.activeSessionId,
          );

          if (!session) {
            return [];
          }

          const documentIds = Array.from(
            new Set((session.documentIds || []).filter(Boolean)),
          );

          if (documentIds.length === 0) {
            return [];
          }

          const fetchedBatches = await Promise.all(
            documentIds.map((documentId) =>
              requirementService.getRequirements(documentId),
            ),
          );

          const fetchedRequirements = fetchedBatches.flat();

          set((currentState) => {
            const patch = updateActiveSession(
              ensureDefaultSession({
                ...currentState,
                activeSessionId:
                  currentState.activeSessionId ||
                  currentState.sessions[0]?.id ||
                  null,
              }),
              (currentSession) => ({
                ...currentSession,
                requirements: mergeRequirementsById(
                  currentSession.requirements,
                  fetchedRequirements,
                ),
              }),
            );

            return patch;
          });

          const stillPending = fetchedRequirements.some(
            (item) => String(item?.status || "").toLowerCase() === "pending",
          );

          if (!stillPending) {
            return fetchedRequirements;
          }

          if (attempt < retries - 1) {
            await wait(delayMs);
          }
        }

        return [];
      },

      clearMessages: () => set({ error: null, success: null }),

      newSession: (name) => {
        const nextSession = createSession(name);
        set((state) => ({
          sessions: [nextSession, ...state.sessions],
          activeSessionId: nextSession.id,
          error: null,
          success: "New session created.",
        }));
      },

      setActiveSession: (sessionId) =>
        set({
          activeSessionId: sessionId,
          error: null,
          success: null,
        }),

      uploadAndSegment: async (file) => {
        set({ loading: true, error: null, success: null });
        try {
          const upload = await requirementService.uploadDocument(file);
          const documentId = upload.document_id;
          await requirementService.segmentDocument(documentId);
          const requirements =
            await requirementService.getRequirements(documentId);

          set((state) => {
            const patch = updateActiveSession(
              ensureDefaultSession({
                ...state,
                activeSessionId:
                  state.activeSessionId || state.sessions[0]?.id || null,
              }),
              (session) => {
                const existed = new Set(
                  session.requirements.map((item) => item.id),
                );
                const mergedRequirements = [
                  ...session.requirements,
                  ...requirements.filter((item) => !existed.has(item.id)),
                ];

                return {
                  ...session,
                  activeDocumentId: documentId,
                  documentIds: Array.from(
                    new Set([...(session.documentIds || []), documentId]),
                  ),
                  requirements: mergedRequirements,
                  selectedRequirementId:
                    requirements[0]?.id ||
                    session.selectedRequirementId ||
                    null,
                };
              },
            );

            return {
              ...patch,
              success: `Uploaded and segmented ${requirements.length} requirement(s).`,
            };
          });

          void get().refreshActiveSessionRequirements();

          return documentId;
        } catch (error) {
          const message =
            error?.response?.data?.message || error.message || "Upload failed";
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      addManualRequirement: async (text) => {
        const trimmed = String(text || "").trim();
        if (!trimmed) return null;

        set({ loading: true, error: null, success: null });

        try {
          const state = get();
          const currentSession = state.sessions.find(
            (item) => item.id === state.activeSessionId,
          );
          const activeDocumentId = currentSession?.activeDocumentId || null;

          const created = await requirementService.createRequirement({
            text: trimmed,
            documentId: activeDocumentId,
          });

          set((currentState) => {
            const patch = updateActiveSession(
              ensureDefaultSession({
                ...currentState,
                activeSessionId:
                  currentState.activeSessionId ||
                  currentState.sessions[0]?.id ||
                  null,
              }),
              (session) => {
                const nextRequirement = created.requirement;
                const targetDocumentId = created.document_id;
                return {
                  ...session,
                  activeDocumentId: targetDocumentId,
                  documentIds: Array.from(
                    new Set([...(session.documentIds || []), targetDocumentId]),
                  ),
                  requirements: [...session.requirements, nextRequirement],
                  selectedRequirementId: nextRequirement.id,
                };
              },
            );

            return {
              ...patch,
              success: "Requirement added.",
            };
          });

          void get().refreshActiveSessionRequirements();

          return created.requirement;
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error.message ||
            "Unable to add requirement";
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteRequirement: async (requirementId) => {
        set({ loading: true, error: null, success: null });
        try {
          await requirementService.deleteRequirement(requirementId);

          set((state) => {
            const patch = updateActiveSession(
              ensureDefaultSession({
                ...state,
                activeSessionId:
                  state.activeSessionId || state.sessions[0]?.id || null,
              }),
              (session) => {
                const nextRequirements = session.requirements.filter(
                  (item) => item.id !== requirementId,
                );

                return {
                  ...session,
                  requirements: nextRequirements,
                  selectedRequirementId:
                    session.selectedRequirementId === requirementId
                      ? nextRequirements[0]?.id || null
                      : session.selectedRequirementId,
                };
              },
            );

            return {
              ...patch,
              success: "Requirement deleted.",
            };
          });
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error.message ||
            "Unable to delete requirement";
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      selectRequirement: (requirementId) =>
        set((state) => {
          const patch = updateActiveSession(
            ensureDefaultSession({
              ...state,
              activeSessionId:
                state.activeSessionId || state.sessions[0]?.id || null,
            }),
            (session) => ({
              ...session,
              selectedRequirementId: requirementId,
            }),
          );
          return {
            ...patch,
            error: null,
            success: null,
          };
        }),

      updateRequirement: async (requirementId, text) => {
        const trimmed = String(text || "").trim();
        if (!trimmed) return;

        set({ loading: true, error: null, success: null });

        try {
          await requirementService.updateRequirement(requirementId, trimmed);

          set((state) => {
            const patch = updateActiveSession(
              ensureDefaultSession({
                ...state,
                activeSessionId:
                  state.activeSessionId || state.sessions[0]?.id || null,
              }),
              (session) => ({
                ...session,
                requirements: session.requirements.map((item) =>
                  item.id === requirementId
                    ? {
                        ...item,
                        text: trimmed,
                        status: "pending",
                      }
                    : item,
                ),
                selectedRequirementId: requirementId,
              }),
            );

            return {
              ...patch,
              success: "Requirement changes saved.",
            };
          });

          void get().refreshActiveSessionRequirements();
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error.message ||
            "Unable to update requirement";
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      sendChatMessage: async (message) => {
        const text = String(message || "").trim();
        if (!text) return null;

        const state = get();
        const currentSession = state.sessions.find(
          (item) => item.id === state.activeSessionId,
        );

        if (!currentSession) {
          throw new Error("No active session");
        }

        const selectedRequirement = currentSession.requirements.find(
          (item) => item.id === currentSession.selectedRequirementId,
        );

        const requestMessage = selectedRequirement
          ? `Selected requirement: ${selectedRequirement.text}\n\nUser question: ${text}`
          : text;

        const userChat = {
          role: "user",
          message: text,
          createdAt: new Date().toISOString(),
          requirementId: selectedRequirement?.id || null,
        };

        set((s) => {
          const patch = updateActiveSession(
            ensureDefaultSession({
              ...s,
              activeSessionId: s.activeSessionId || s.sessions[0]?.id || null,
            }),
            (session) => ({
              ...session,
              chatMessages: [...session.chatMessages, userChat],
            }),
          );

          return {
            ...patch,
            loading: true,
            error: null,
            success: null,
          };
        });

        try {
          const response = await chatService.sendMessage(
            currentSession.id,
            requestMessage,
          );
          const assistantChat = {
            role: "assistant",
            message: response.response || "No response from AI.",
            createdAt: new Date().toISOString(),
            requirementId: selectedRequirement?.id || null,
          };

          set((s) => {
            const patch = updateActiveSession(
              ensureDefaultSession({
                ...s,
                activeSessionId: s.activeSessionId || s.sessions[0]?.id || null,
              }),
              (session) => ({
                ...session,
                chatMessages: [...session.chatMessages, assistantChat],
              }),
            );
            return {
              ...patch,
              loading: false,
            };
          });

          return response;
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error.message ||
            "Chat request failed";
          set({ error: message, loading: false });
          throw error;
        }
      },
    }),
    {
      name: "ai-assisted-re-session-store",
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const withDefault = ensureDefaultSession(state);
        if (withDefault !== state) {
          state.sessions = withDefault.sessions;
          state.activeSessionId = withDefault.activeSessionId;
        }
        if (!state.activeSessionId && state.sessions.length > 0) {
          state.activeSessionId = state.sessions[0].id;
        }
      },
    },
  ),
);
