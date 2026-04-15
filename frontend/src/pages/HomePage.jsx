import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

function formatScore(value) {
  if (value === null || value === undefined) return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "—";
  return `${Math.round(numeric)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function HomePage() {
  const navigate = useNavigate();
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const loading = useAppStore((state) => state.loading);
  const error = useAppStore((state) => state.error);
  const success = useAppStore((state) => state.success);
  const uploadAndSegment = useAppStore((state) => state.uploadAndSegment);
  const addManualRequirement = useAppStore(
    (state) => state.addManualRequirement,
  );
  const deleteRequirement = useAppStore((state) => state.deleteRequirement);
  const selectRequirement = useAppStore((state) => state.selectRequirement);
  const updateRequirement = useAppStore((state) => state.updateRequirement);
  const sendChatMessage = useAppStore((state) => state.sendChatMessage);
  const requestRequirementReview = useAppStore(
    (state) => state.requestRequirementReview,
  );

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualRequirement, setManualRequirement] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [editorDraft, setEditorDraft] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1280px)").matches
      : false,
  );
  const [columnWeights, setColumnWeights] = useState({
    left: 22,
    right: 26,
  });
  const [draggingSeparator, setDraggingSeparator] = useState(null);

  const activeSession = useMemo(
    () =>
      sessions.find((item) => item.id === activeSessionId) ||
      sessions[0] ||
      null,
    [sessions, activeSessionId],
  );

  const requirements = activeSession?.requirements || [];
  const selectedRequirement = useMemo(
    () =>
      requirements.find(
        (item) => item.id === activeSession?.selectedRequirementId,
      ) ||
      requirements[0] ||
      null,
    [requirements, activeSession?.selectedRequirementId],
  );

  const visibleMessages = useMemo(() => {
    const selectedId = selectedRequirement?.id || null;
    const messages = activeSession?.chatMessages || [];
    if (!selectedId) return messages;
    return messages.filter(
      (item) =>
        item.requirementId === selectedId || item.requirementId === null,
    );
  }, [activeSession?.chatMessages, selectedRequirement?.id]);

  useEffect(() => {
    setEditorDraft(selectedRequirement?.text || "");
  }, [selectedRequirement?.id, selectedRequirement?.text]);

  useEffect(() => {
    if (!selectedRequirement?.id) {
      return;
    }

    void requestRequirementReview(selectedRequirement.id);
  }, [
    selectedRequirement?.id,
    selectedRequirement?.updatedAt,
    requestRequirementReview,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(min-width: 1280px)");
    const update = (event) => setIsDesktop(event.matches);

    setIsDesktop(media.matches);
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isDesktop || !draggingSeparator) {
      return undefined;
    }

    const handleMove = (event) => {
      const viewportWidth = window.innerWidth || 1;
      const pointerPercent = (event.clientX / viewportWidth) * 100;

      setColumnWeights((current) => {
        const minCenter = 28;

        if (draggingSeparator === "left") {
          const maxLeft = 100 - current.right - minCenter;
          return {
            ...current,
            left: clamp(pointerPercent, 16, maxLeft),
          };
        }

        const nextRight = clamp(100 - pointerPercent, 18, 34);
        const maxRight = 100 - current.left - minCenter;
        return {
          ...current,
          right: clamp(nextRight, 18, maxRight),
        };
      });
    };

    const stopDrag = () => setDraggingSeparator(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [draggingSeparator, isDesktop]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAndSegment(file);
    event.target.value = "";
  };

  const handleManualAdd = async () => {
    const text = manualRequirement.trim();
    if (!text) return;
    await addManualRequirement(text);
    setManualRequirement("");
    setManualModalOpen(false);
  };

  const handleSendChat = async (event) => {
    event.preventDefault();
    const message = chatDraft.trim();
    if (!message) return;
    setChatDraft("");
    await sendChatMessage(message);
  };

  const handleSaveRequirement = async () => {
    if (!selectedRequirement || !editorDraft.trim()) return;
    await updateRequirement(selectedRequirement.id, editorDraft);
  };

  const centerWeight = clamp(
    100 - columnWeights.left - columnWeights.right,
    24,
    64,
  );

  const desktopGridTemplate = `${columnWeights.left}% 10px ${centerWeight}% 10px ${columnWeights.right}%`;

  return (
    <>
      <div
        className="grid h-full gap-4 overflow-hidden xl:gap-0"
        style={
          isDesktop ? { gridTemplateColumns: desktopGridTemplate } : undefined
        }
      >
        <aside
          className="panel fade-in-up flex min-h-0 flex-col gap-4 overflow-hidden p-4"
          style={isDesktop ? { gridColumn: 1, marginRight: 12 } : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Session sources
              </p>
            </div>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
              {requirements.length}
            </span>
          </div>

          <div className="space-y-2">
            <label className="button-secondary ring-focus w-full cursor-pointer py-2 text-center">
              Upload requirement file
              <input
                className="hidden"
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={handleUpload}
              />
            </label>
            <button
              className="button-secondary ring-focus w-full py-2"
              type="button"
              onClick={() => setManualModalOpen(true)}
            >
              Add requirement manually
            </button>
          </div>

          <div className="app-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
            {requirements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                No requirements in this session yet.
              </div>
            ) : (
              requirements.map((item, index) => (
                <div
                  key={item.id}
                  className={`card-hover rounded-2xl border-2 p-3 transition ${
                    item.id === selectedRequirement?.id
                      ? "border-white bg-white/10 shadow-[0_0_24px_rgba(255,255,255,0.2)]"
                      : "border-slate-700 bg-slate-950/60 hover:border-slate-600"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Requirement {index + 1}
                    </p>
                    <button
                      className="ring-focus inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900/80 text-zinc-300 transition hover:border-red-500 hover:bg-red-950/60 hover:text-red-300"
                      type="button"
                      aria-label="Delete requirement"
                      onClick={() => setDeleteConfirmId(item.id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M4 7h16" strokeLinecap="round" />
                        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        <path d="M7 7l1 12a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L17 7" />
                        <path d="M10 11v5M14 11v5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  <button
                    className="w-full text-left ring-focus"
                    type="button"
                    onClick={() => selectRequirement(item.id)}
                  >
                    <p className="line-clamp-3 text-sm text-slate-100">
                      {item.text}
                    </p>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {isDesktop ? (
          <button
            type="button"
            aria-label="Resize left panel"
            className="group relative cursor-col-resize"
            style={{ gridColumn: 2 }}
            onMouseDown={() => setDraggingSeparator("left")}
          >
            <span className="absolute inset-x-[3px] top-2 bottom-2 rounded-full bg-slate-800/80 transition group-hover:bg-slate-600" />
          </button>
        ) : null}

        <section
          className="panel fade-in-up flex min-h-0 flex-col gap-3 overflow-hidden p-4"
          style={
            isDesktop
              ? { gridColumn: 3, marginLeft: 6, marginRight: 6 }
              : undefined
          }
        >
          {requirements.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-10 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-400">
                Notebook workspace
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-white">
                Start by adding your first requirement
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                Upload a file or add a requirement manually. Once data is
                available, this area becomes your conversation workspace with AI
                for each requirement.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <label className="button-primary ring-focus cursor-pointer">
                  Upload file
                  <input
                    className="hidden"
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                    onChange={handleUpload}
                  />
                </label>
                <button
                  className="button-secondary ring-focus"
                  type="button"
                  onClick={() => setManualModalOpen(true)}
                >
                  Add manually
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="app-scrollbar flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                {visibleMessages.length === 0 ? (
                  <div className="flex h-full min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
                    No conversation yet. Ask AI about the selected requirement.
                  </div>
                ) : (
                  visibleMessages.map((item, index) => (
                    <div
                      key={`${item.createdAt || "m"}-${index}`}
                      className={`fade-in-up max-w-[88%] rounded-2xl px-4 py-3 text-sm ${item.role === "user" ? "ml-auto border border-white/25 bg-white/10 text-white" : "border border-slate-800/90 bg-slate-900 text-slate-100"}`}
                    >
                      <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-slate-400">
                        {item.role}
                      </p>
                      <p className="whitespace-pre-wrap leading-6">
                        {item.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form
                className="flex items-center gap-2"
                onSubmit={handleSendChat}
              >
                <input
                  className="input ring-focus h-11"
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Message AI about the selected requirement..."
                />
                <button
                  className="button-primary ring-focus h-11 w-11 rounded-xl p-0"
                  type="submit"
                  disabled={loading || !chatDraft.trim()}
                  aria-label="Send message"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-5 w-5"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M4 12L20 4L14 20L11 13L4 12Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </>
          )}
        </section>

        {isDesktop ? (
          <button
            type="button"
            aria-label="Resize right panel"
            className="group relative cursor-col-resize"
            style={{ gridColumn: 4 }}
            onMouseDown={() => setDraggingSeparator("right")}
          >
            <span className="absolute inset-x-[3px] top-2 bottom-2 rounded-full bg-slate-800/80 transition group-hover:bg-slate-600" />
          </button>
        ) : null}

        <aside
          className="fade-in-up flex min-h-0 flex-col gap-4"
          style={isDesktop ? { gridColumn: 5, marginLeft: 12 } : undefined}
        >
          <section className="panel space-y-3 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Requirement score
            </p>
            {selectedRequirement ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Clarity", selectedRequirement.clarity],
                    ["Completeness", selectedRequirement.completeness],
                    ["Consistency", selectedRequirement.consistency],
                    ["Ambiguity", selectedRequirement.ambiguity],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="card-hover rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                    >
                      <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-base font-semibold text-white">
                        {formatScore(value)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center pt-0.5">
                  <div className="w-full max-w-44 rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-center">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">
                      Score
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-white">
                      {formatScore(selectedRequirement.score)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                Select a requirement to view scores.
              </div>
            )}
          </section>

          <section className="panel flex min-h-0 flex-1 flex-col gap-3 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Editor
            </p>
            <textarea
              className="input ring-focus app-scrollbar min-h-0 flex-1 resize-none"
              value={editorDraft}
              onChange={(event) => setEditorDraft(event.target.value)}
              placeholder="The selected requirement content appears here..."
            />
            <div className="flex gap-2">
              <button
                className="button-primary ring-focus flex-1"
                type="button"
                disabled={
                  !selectedRequirement || loading || !editorDraft.trim()
                }
                onClick={handleSaveRequirement}
              >
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                className="button-secondary ring-focus flex-1"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Go to dashboard
              </button>
            </div>
          </section>
        </aside>
      </div>

      {manualModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="panel fade-in-up w-full max-w-2xl space-y-4 p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-white">
                Add requirement manually
              </h3>
              <button
                className="ring-focus rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setManualModalOpen(false)}
              >
                Close
              </button>
            </div>
            <textarea
              className="input ring-focus min-h-44 resize-y"
              value={manualRequirement}
              onChange={(event) => setManualRequirement(event.target.value)}
              placeholder="Example: The system shall allow admins to export session reports to PDF within 5 seconds."
            />
            <div className="flex justify-end gap-2">
              <button
                className="button-secondary ring-focus"
                type="button"
                onClick={() => setManualModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="button-primary ring-focus"
                type="button"
                disabled={loading || !manualRequirement.trim()}
                onClick={handleManualAdd}
              >
                {loading ? "Adding..." : "Add requirement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="panel fade-in-up w-full max-w-sm space-y-4 p-5">
            <h3 className="text-lg font-semibold text-white">
              Delete requirement?
            </h3>
            <p className="text-sm text-slate-300">
              This action cannot be undone. The requirement will be permanently
              deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="button-secondary ring-focus"
                type="button"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                className="ring-focus rounded-lg border border-red-700 bg-red-950/60 px-4 py-2 font-medium text-red-200 transition hover:border-red-600 hover:bg-red-950/80"
                type="button"
                onClick={() => {
                  deleteRequirement(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
