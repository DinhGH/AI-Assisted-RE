import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

function formatScore(value) {
  if (value === null || value === undefined) return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "—";
  return `${Math.round(numeric)}`;
}

function buildRequirementSummary(requirement) {
  if (!requirement) {
    return "Select a requirement in the left column to view analysis and chat with AI.";
  }

  const score = formatScore(requirement.score);
  const clarity = formatScore(requirement.clarity);
  const completeness = formatScore(requirement.completeness);
  const consistency = formatScore(requirement.consistency);
  const ambiguity = formatScore(requirement.ambiguity);

  return `AI quick assessment for this requirement:\n- Overall score: ${score}/100\n- Clarity: ${clarity}\n- Completeness: ${completeness}\n- Consistency: ${consistency}\n- Ambiguity: ${ambiguity}\n\nTip: ask AI to rewrite this requirement for better clarity, lower ambiguity, and stronger testability.`;
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

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualRequirement, setManualRequirement] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [editorDraft, setEditorDraft] = useState("");

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

  return (
    <>
      <div className="grid min-h-[calc(100vh-170px)] gap-4 xl:grid-cols-[320px_1fr_420px]">
        <aside className="panel fade-in-up flex min-h-0 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Session sources
              </p>
              <h2 className="text-lg font-semibold text-white">
                📚 Requirements
              </h2>
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

          <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
            {requirements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                No requirements in this session yet.
              </div>
            ) : (
              requirements.map((item, index) => (
                <div
                  key={item.id}
                  className={`card-hover rounded-2xl border p-3 ${item.id === selectedRequirement?.id ? "border-white/35 bg-white/5 shadow-[0_0_18px_rgba(255,255,255,0.14)]" : "border-slate-800 bg-slate-950/60"}`}
                >
                  <button
                    className="w-full text-left ring-focus"
                    type="button"
                    onClick={() => selectRequirement(item.id)}
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Requirement {index + 1}
                    </p>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-100">
                      {item.text}
                    </p>
                  </button>
                  <button
                    className="ring-focus mt-3 w-full rounded-lg border border-zinc-600/70 bg-zinc-900/70 px-3 py-2 text-xs font-semibold text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-800/80"
                    type="button"
                    onClick={() => deleteRequirement(item.id)}
                  >
                    Delete requirement
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <section className="panel fade-in-up flex min-h-0 flex-col gap-4 p-4">
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
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/80 to-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
                  AI Insight
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                  {buildRequirementSummary(selectedRequirement)}
                </p>
              </div>

              <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
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

              <form className="space-y-3" onSubmit={handleSendChat}>
                <textarea
                  className="input ring-focus min-h-28 resize-y"
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Ask AI about this requirement, request a rewrite, or discuss improvements..."
                />
                <button
                  className="button-primary ring-focus"
                  type="submit"
                  disabled={loading || !chatDraft.trim()}
                >
                  {loading ? "Sending..." : "Send to AI"}
                </button>
              </form>
            </>
          )}
        </section>

        <aside className="fade-in-up grid min-h-0 gap-4 xl:grid-rows-[0.45fr_0.55fr]">
          <section className="panel space-y-3 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Requirement score
            </p>
            {selectedRequirement ? (
              <>
                <h3 className="line-clamp-3 text-sm font-semibold text-white">
                  {selectedRequirement.text}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Score", selectedRequirement.score],
                    ["Clarity", selectedRequirement.clarity],
                    ["Completeness", selectedRequirement.completeness],
                    ["Consistency", selectedRequirement.consistency],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="card-hover rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                    >
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        {label}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {formatScore(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                Select a requirement to view scores.
              </div>
            )}
          </section>

          <section className="panel flex min-h-0 flex-col gap-3 p-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Editor
            </p>
            <textarea
              className="input ring-focus no-scrollbar min-h-0 flex-1 resize-none"
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

      {(error || success) && (
        <div className="fixed bottom-4 right-4 z-40 max-w-md space-y-2">
          {error ? (
            <p className="rounded-xl border border-zinc-600/70 bg-zinc-900/85 px-4 py-3 text-sm text-zinc-100">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-xl border border-zinc-500/70 bg-zinc-800/85 px-4 py-3 text-sm text-zinc-100">
              {success}
            </p>
          ) : null}
        </div>
      )}

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
    </>
  );
}
