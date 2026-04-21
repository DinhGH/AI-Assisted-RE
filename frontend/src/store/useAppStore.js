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

function clampScoreValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  if (numeric >= 10 && numeric <= 90) {
    return numeric;
  }

  const bounded = Math.max(0, Math.min(100, numeric));
  const projected = 10 + 80 / (1 + Math.exp(-(bounded - 50) / 12));
  return Number(projected.toFixed(2));
}

function normalizeRequirement(item) {
  if (!item || typeof item !== "object") {
    return item;
  }

  return {
    ...item,
    ambiguity: clampScoreValue(item.ambiguity),
    clarity: clampScoreValue(item.clarity),
    completeness: clampScoreValue(item.completeness),
    consistency: clampScoreValue(item.consistency),
    score: clampScoreValue(item.score),
  };
}

const AUTO_REVIEW_VERSION = 3;

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
  const rawSessions = Array.isArray(state.sessions) ? state.sessions : [];

  const normalizedSessions = rawSessions
    .map((session, index) => {
      const safeSession =
        session && typeof session === "object" ? session : createSession();
      const requirements = Array.isArray(safeSession.requirements)
        ? safeSession.requirements.map((item) => normalizeRequirement(item))
        : [];
      const requirementIds = new Set(
        requirements.map((item) => item?.id).filter(Boolean),
      );

      const selectedRequirementId = requirementIds.has(
        safeSession.selectedRequirementId,
      )
        ? safeSession.selectedRequirementId
        : requirements[0]?.id || null;

      return {
        id:
          typeof safeSession.id === "string" && safeSession.id.trim()
            ? safeSession.id
            : createId("session"),
        name:
          typeof safeSession.name === "string" && safeSession.name.trim()
            ? safeSession.name
            : `Session ${index + 1}`,
        createdAt: safeSession.createdAt || new Date().toISOString(),
        updatedAt:
          safeSession.updatedAt ||
          safeSession.createdAt ||
          new Date().toISOString(),
        documentIds: Array.isArray(safeSession.documentIds)
          ? Array.from(new Set(safeSession.documentIds.filter(Boolean)))
          : [],
        activeDocumentId: safeSession.activeDocumentId || null,
        requirements,
        selectedRequirementId,
        chatMessages: Array.isArray(safeSession.chatMessages)
          ? safeSession.chatMessages
              .map((item) => {
                const message = String(
                  item?.message ?? item?.content ?? "",
                ).trim();
                if (!message) {
                  return null;
                }

                return {
                  ...item,
                  role: item?.role === "assistant" ? "assistant" : "user",
                  message,
                  createdAt: item?.createdAt || new Date().toISOString(),
                  requirementId: item?.requirementId ?? null,
                };
              })
              .filter(Boolean)
          : [],
      };
    })
    .filter((item) => item?.id);

  if (normalizedSessions.length) {
    const uniqueSessions = [];
    const ids = new Set();

    normalizedSessions.forEach((session) => {
      let id = session.id;
      while (ids.has(id)) {
        id = createId("session");
      }
      ids.add(id);
      uniqueSessions.push({
        ...session,
        id,
      });
    });

    const activeSessionId = ids.has(state.activeSessionId)
      ? state.activeSessionId
      : uniqueSessions[0].id;

    return {
      ...state,
      sessions: uniqueSessions,
      activeSessionId,
    };
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
    requirementsById.set(
      item.id,
      normalizeRequirement({
        ...current,
        ...item,
      }),
    );
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
      reviewInFlight: {},
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

      selectRequirement: (requirementId) => {
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
        });

        void get().requestRequirementReview(requirementId);
      },

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
          const response = await chatService.sendMessage(currentSession.id, {
            message: text,
            mode: "followup",
            requirementId: selectedRequirement?.id || null,
            requirementText: selectedRequirement?.text || null,
          });
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

      requestRequirementReview: async (requirementId) => {
        const state = get();
        const currentSession = state.sessions.find(
          (item) => item.id === state.activeSessionId,
        );

        if (!currentSession) {
          return null;
        }

        const requirement = currentSession.requirements.find(
          (item) => item.id === requirementId,
        );

        if (!requirement) {
          return null;
        }

        const hasExistingChatForRequirement = (
          currentSession.chatMessages || []
        ).some((item) => item?.requirementId === requirementId);

        if (hasExistingChatForRequirement) {
          return null;
        }

        const reviewKey = `${currentSession.id}:${requirementId}`;
        if (state.reviewInFlight?.[reviewKey]) {
          return null;
        }

        set((s) => ({
          reviewInFlight: {
            ...(s.reviewInFlight || {}),
            [reviewKey]: true,
          },
        }));

        let requirementForReview = requirement;

        const needsReanalysis =
          String(requirement.status || "").toLowerCase() !== "analyzed" ||
          [
            requirement.score,
            requirement.clarity,
            requirement.completeness,
            requirement.consistency,
            requirement.ambiguity,
          ].some((value) => value === null || value === undefined);

        if (needsReanalysis) {
          try {
            const reEvaluate =
              await requirementService.reEvaluateRequirement(requirementId);
            const analysis = reEvaluate?.analysis;

            if (analysis && typeof analysis === "object") {
              requirementForReview = normalizeRequirement({
                ...requirement,
                actor: analysis.actor ?? requirement.actor ?? null,
                action: analysis.action ?? requirement.action ?? null,
                object: analysis.object ?? requirement.object ?? null,
                ambiguity: analysis.ambiguity ?? requirement.ambiguity ?? null,
                readability:
                  analysis.readability ?? requirement.readability ?? null,
                similarity:
                  analysis.similarity ?? requirement.similarity ?? null,
                contradiction:
                  analysis.contradiction ?? requirement.contradiction ?? null,
                clarity: analysis.clarity ?? requirement.clarity ?? null,
                completeness:
                  analysis.completeness ?? requirement.completeness ?? null,
                consistency:
                  analysis.consistency ?? requirement.consistency ?? null,
                score: analysis.score ?? requirement.score ?? null,
                status: "analyzed",
              });

              set((s) => {
                const patch = updateActiveSession(
                  ensureDefaultSession({
                    ...s,
                    activeSessionId:
                      s.activeSessionId || s.sessions[0]?.id || null,
                  }),
                  (session) => ({
                    ...session,
                    requirements: session.requirements.map((item) =>
                      item.id === requirementId ? requirementForReview : item,
                    ),
                  }),
                );

                return patch;
              });
            }
          } catch {
            // Keep existing requirement snapshot if re-evaluation fails.
          }
        }

        const alreadyReviewed = currentSession.chatMessages.some(
          (item) =>
            item.role === "assistant" &&
            item.autoReview === true &&
            item.reviewVersion === AUTO_REVIEW_VERSION &&
            item.requirementId === requirementId &&
            item.requirementUpdatedAt === requirementForReview.updatedAt,
        );

        if (alreadyReviewed) {
          set((s) => {
            const next = { ...(s.reviewInFlight || {}) };
            delete next[reviewKey];
            return { reviewInFlight: next };
          });
          return null;
        }

        try {
          const response = await chatService.sendMessage(currentSession.id, {
            message: "Please provide a full analysis for this requirement.",
            mode: "initial",
            requirementId,
            requirementText: requirementForReview.text,
          });

          const assistantChat = {
            role: "assistant",
            message: response.response || "No response from AI.",
            createdAt: new Date().toISOString(),
            requirementId,
            autoReview: true,
            reviewVersion: AUTO_REVIEW_VERSION,
            requirementUpdatedAt: requirementForReview.updatedAt,
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

            const next = { ...(s.reviewInFlight || {}) };
            delete next[reviewKey];

            return {
              ...patch,
              reviewInFlight: next,
            };
          });

          return assistantChat;
        } catch (error) {
          const message =
            error?.response?.data?.message ||
            error.message ||
            "Unable to generate AI requirement review";
          set((s) => {
            const next = { ...(s.reviewInFlight || {}) };
            delete next[reviewKey];
            return {
              error: message,
              reviewInFlight: next,
            };
          });
          return null;
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
