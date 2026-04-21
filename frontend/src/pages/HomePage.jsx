import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

function formatScore(value) {
  if (value === null || value === undefined) return "—";
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "—";

  let normalized = numeric;
  if (numeric < 10 || numeric > 90) {
    const bounded = clamp(numeric, 0, 100);
    normalized = 10 + 80 / (1 + Math.exp(-(bounded - 50) / 12));
  }

  return `${Math.round(normalized)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeAssistantMessage(message = "") {
  return String(message || "")
    .replace(/\r\n/g, "\n")
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderChatMessage(message, role) {
  const normalized =
    role === "assistant"
      ? sanitizeAssistantMessage(message)
      : String(message || "").trim();

  if (!normalized) {
    return null;
  }

  const lines = normalized.split("\n").map((line) => line.trim());
  const elements = [];
  let index = 0;

  const isHeadingLine = (line) =>
    /^([^\n:]{2,80}):$/.test(line) &&
    !/^\d+\.$/.test(line) &&
    !/^[-•]/.test(line);

  while (index < lines.length) {
    const line = lines[index];

    if (!line) {
      index += 1;
      continue;
    }

    if (isHeadingLine(line)) {
      elements.push(
        <p
          key={`heading-${index}`}
          className="pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
        >
          {line.replace(/:$/, "")}
        </p>,
      );
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }

      elements.push(
        <ol
          key={`ordered-${index}`}
          className="list-decimal space-y-1.5 pl-5 leading-6 text-gray-900"
        >
          {items.map((item, itemIndex) => (
            <li key={`ordered-${index}-${itemIndex}`}>{item}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (/^[-•]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^[-•]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-•]\s+/, ""));
        index += 1;
      }

      elements.push(
        <ul
          key={`bullet-${index}`}
          className="list-disc space-y-1.5 pl-5 leading-6 text-gray-900"
        >
          {items.map((item, itemIndex) => (
            <li key={`bullet-${index}-${itemIndex}`}>{item}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraphLines = [];
    while (
      index < lines.length &&
      lines[index] &&
      !isHeadingLine(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !/^[-•]\s+/.test(lines[index])
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    if (paragraphLines.length) {
      elements.push(
        <p key={`para-${index}`} className="leading-7 text-gray-900">
          {paragraphLines.join(" ")}
        </p>,
      );
    }
  }

  return elements;
}

function IconBadge({ tone = "blue", children }) {
  const toneClass = {
    blue: "border-slate-300 bg-slate-100 text-slate-700",
    emerald: "border-emerald-300 bg-emerald-100 text-emerald-700",
    amber: "border-amber-300 bg-amber-100 text-amber-700",
    violet: "border-violet-300 bg-violet-100 text-violet-700",
    slate: "border-slate-300 bg-slate-100 text-slate-700",
  }[tone];

  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 ${toneClass}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
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
  const reviewInFlight = useAppStore((state) => state.reviewInFlight);

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualRequirement, setManualRequirement] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [editorDraft, setEditorDraft] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isAiResponding, setIsAiResponding] = useState(false);
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
  const chatScrollRef = useRef(null);
  const chatBottomRef = useRef(null);
  const chatInputRef = useRef(null);

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

  const isAutoReviewInFlight = useMemo(() => {
    const sessionId = activeSession?.id;
    const requirementId = selectedRequirement?.id;
    if (!sessionId || !requirementId) {
      return false;
    }

    return Boolean(reviewInFlight?.[`${sessionId}:${requirementId}`]);
  }, [activeSession?.id, selectedRequirement?.id, reviewInFlight]);

  const showAiTyping = isAiResponding || isAutoReviewInFlight;

  useEffect(() => {
    setEditorDraft(selectedRequirement?.text || "");
  }, [selectedRequirement?.id, selectedRequirement?.text]);

  useEffect(() => {
    if (!selectedRequirement?.id) {
      return;
    }

    void requestRequirementReview(selectedRequirement.id);
  }, [requestRequirementReview, selectedRequirement?.id]);

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
    setIsAiResponding(true);
    try {
      await sendChatMessage(message);
    } finally {
      setIsAiResponding(false);
      chatInputRef.current?.focus();
    }
  };

  const handleSaveRequirement = async () => {
    if (!selectedRequirement || !editorDraft.trim()) return;
    await updateRequirement(selectedRequirement.id, editorDraft);
  };

  useEffect(() => {
    chatInputRef.current?.focus();
  }, [selectedRequirement?.id, visibleMessages.length, showAiTyping]);

  useEffect(() => {
    if (!chatBottomRef.current) return;
    chatBottomRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [visibleMessages.length, showAiTyping, selectedRequirement?.id]);

  const centerWeight = clamp(
    100 - columnWeights.left - columnWeights.right,
    24,
    64,
  );

  const desktopGridTemplate = `calc((100% - 20px) * ${columnWeights.left / 100}) 10px calc((100% - 20px) * ${centerWeight / 100}) 10px calc((100% - 20px) * ${columnWeights.right / 100})`;

  return (
    <>
      <div
        className="grid h-full gap-4 overflow-hidden bg-white xl:gap-0"
        style={
          isDesktop ? { gridTemplateColumns: desktopGridTemplate } : undefined
        }
      >
        <aside
          className="panel fade-in-up flex min-h-0 flex-col gap-4 overflow-hidden p-4"
          style={isDesktop ? { gridColumn: 1 } : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconBadge tone="violet">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M7 6h10M7 12h10M7 18h6" strokeLinecap="round" />
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z" />
                </svg>
              </IconBadge>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-700">
                  Session sources
                </p>
              </div>
            </div>
            <span className="rounded-full border-2 border-slate-300 px-3 py-1 text-xs text-gray-600">
              {requirements.length}
            </span>
          </div>

          <div className="space-y-2">
            <label className="button-secondary  w-full cursor-pointer gap-2 py-2 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Upload requirement file
              <input
                className="hidden"
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                onChange={handleUpload}
              />
            </label>
            <button
              className="button-secondary  w-full gap-2 py-2"
              type="button"
              onClick={() => setManualModalOpen(true)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z" />
                <path d="M8 12h8M12 8v8" strokeLinecap="round" />
              </svg>
              Add requirement manually
            </button>
          </div>

          <div className="app-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
            {requirements.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-gray-50 p-4 text-sm text-gray-600">
                No requirements in this session yet.
              </div>
            ) : (
              requirements.map((item, index) => (
                <div
                  key={item.id}
                  className={`card-hover rounded-2xl border-2 p-3 transition ${
                    item.id === selectedRequirement?.id
                      ? "border-slate-400 bg-slate-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-700">
                      Requirement {index + 1}
                    </p>
                    <button
                      className=" inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-slate-600 shadow-[0_3px_8px_rgba(15,23,42,0.08)] transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800"
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
                    className="w-full text-left "
                    type="button"
                    onClick={() => selectRequirement(item.id)}
                  >
                    <p className="line-clamp-3 text-base font-medium text-gray-900">
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
            <span className="absolute inset-x-[3px] top-2 bottom-2 rounded-full bg-gray-200 transition group-hover:bg-gray-300" />
          </button>
        ) : null}

        <section
          className="panel fade-in-up flex min-h-0 flex-col gap-3 overflow-hidden p-4 pb-6"
          style={isDesktop ? { gridColumn: 3 } : undefined}
        >
          {requirements.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-gray-50 p-10 text-center">
              <IconBadge tone="amber">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 4v10" strokeLinecap="round" />
                  <path
                    d="M8 10l4 4 4-4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect x="4" y="16" width="16" height="4" rx="1" />
                </svg>
              </IconBadge>
              <p className="text-xs uppercase tracking-[0.35em] text-gray-600">
                Notebook workspace
              </p>
              <h3 className="mt-2 text-3xl font-semibold text-gray-900">
                Start by adding your first requirement
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-700">
                Upload a file or add a requirement manually. Once data is
                available, this area becomes your conversation workspace with AI
                for each requirement.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <label className="button-primary  cursor-pointer gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  Upload file
                  <input
                    className="hidden"
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                    onChange={handleUpload}
                  />
                </label>
                <button
                  className="button-secondary  gap-2"
                  type="button"
                  onClick={() => setManualModalOpen(true)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z" />
                    <path d="M8 12h8M12 8v8" strokeLinecap="round" />
                  </svg>
                  Add manually
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                ref={chatScrollRef}
                className="app-scrollbar flex-1 space-y-3 overflow-y-auto rounded-md border-2 border-slate-300 bg-white p-4"
              >
                {visibleMessages.length === 0 ? (
                  <div className="flex h-full min-h-56 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm text-gray-600">
                    No conversation yet. Ask AI about the selected requirement.
                  </div>
                ) : (
                  visibleMessages.map((item, index) => (
                    <div
                      key={`${item.createdAt || "m"}-${index}`}
                      className={`fade-in-up max-w-[88%] rounded-xl border-2 px-4 py-3 text-base ${item.role === "user" ? "ml-auto border-slate-300 bg-slate-50 text-gray-900" : "border-slate-300 bg-gray-50 text-gray-900"}`}
                    >
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700">
                        {item.role}
                      </p>
                      <div className="space-y-2 text-[15px] font-medium">
                        {renderChatMessage(item.message, item.role)}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {showAiTyping ? (
                <div
                  className="flex items-center gap-2 pl-1 text-xs text-gray-700"
                  aria-live="polite"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-violet-300 bg-violet-100 text-violet-700">
                    ✨
                  </span>
                  <span>AI is typing</span>
                  <span className="typing-dots" aria-hidden="true">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                </div>
              ) : null}

              <form
                className="flex items-center gap-2"
                onSubmit={handleSendChat}
              >
                <input
                  ref={chatInputRef}
                  className="input  h-11"
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Message AI about the selected requirement..."
                  autoComplete="off"
                />
                <button
                  className="button-primary  h-11 w-14 shrink-0 rounded-xl p-0"
                  type="submit"
                  disabled={loading || isAiResponding || !chatDraft.trim()}
                  aria-label="Send message"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-7 w-7"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
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
            <span className="absolute inset-x-[3px] top-2 bottom-2 rounded-full bg-gray-200 transition group-hover:bg-gray-300" />
          </button>
        ) : null}

        <aside
          className="fade-in-up flex min-h-0 flex-col gap-4"
          style={isDesktop ? { gridColumn: 5 } : undefined}
        >
          <section className="panel space-y-3 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-gray-700">
              <IconBadge tone="blue">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 3l2.8 5.6L21 9.5l-4.5 4.4 1.1 6.1L12 17l-5.6 3 1.1-6.1L3 9.5l6.2-.9L12 3Z" />
                </svg>
              </IconBadge>
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
                      className="card-hover rounded-lg border-2 border-slate-300 bg-white px-3 py-2"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-700">
                        {label}
                      </p>
                      <p className="mt-1 text-base font-semibold text-gray-900">
                        {formatScore(value)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center pt-0.5">
                  <div className="w-full max-w-44 rounded-xl border-2 border-slate-300 bg-slate-50 px-3 py-2.5 text-center shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-700">
                      Score
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-gray-900">
                      {formatScore(selectedRequirement.score)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-gray-50 p-4 text-sm text-gray-600">
                Select a requirement to view scores.
              </div>
            )}
          </section>

          <section className="panel flex min-h-0 flex-1 flex-col gap-3 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-gray-700">
              <IconBadge tone="emerald">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z" />
                  <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
                </svg>
              </IconBadge>
              Editor
            </p>
            <textarea
              className="input  app-scrollbar min-h-0 flex-1 resize-none"
              value={editorDraft}
              onChange={(event) => setEditorDraft(event.target.value)}
              placeholder="The selected requirement content appears here..."
            />
            <div className="flex gap-2">
              <button
                className="button-primary  flex-1 gap-1.5 !px-4 !py-2 !text-sm"
                type="button"
                disabled={
                  !selectedRequirement || loading || !editorDraft.trim()
                }
                onClick={handleSaveRequirement}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-3.5 w-3.5"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  aria-hidden="true"
                >
                  <path d="M5 4h11l3 3v13H5V4Z" />
                  <path d="M8 4v6h8" />
                  <path d="M8 16h8" strokeLinecap="round" />
                </svg>
                {loading ? "Saving..." : "Save"}
              </button>
              <button
                className="button-secondary  flex-1 gap-1.5 !px-4 !py-2 !text-sm"
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-3.5 w-3.5"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="7" height="7" rx="1" />
                  <rect x="14" y="4" width="7" height="7" rx="1" />
                  <rect x="3" y="13" width="7" height="7" rx="1" />
                  <rect x="14" y="13" width="7" height="7" rx="1" />
                </svg>
                Go to dashboard
              </button>
            </div>
          </section>
        </aside>
      </div>

      {manualModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
          <div className="panel fade-in-up w-full max-w-2xl space-y-4 p-5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
                <IconBadge tone="amber">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                </IconBadge>
                Add requirement manually
              </h3>
              <button
                className="button-secondary  !px-3 !py-1 !text-sm"
                type="button"
                onClick={() => setManualModalOpen(false)}
              >
                Close
              </button>
            </div>
            <textarea
              className="input  min-h-44 resize-y"
              value={manualRequirement}
              onChange={(event) => setManualRequirement(event.target.value)}
              placeholder="Example: The system shall allow admins to export session reports to PDF within 5 seconds."
            />
            <div className="flex justify-end gap-2">
              <button
                className="button-secondary  gap-2"
                type="button"
                onClick={() => setManualModalOpen(false)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
                </svg>
                Cancel
              </button>
              <button
                className="button-primary  gap-2"
                type="button"
                disabled={loading || !manualRequirement.trim()}
                onClick={handleManualAdd}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                {loading ? "Adding..." : "Add requirement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
          <div className="panel fade-in-up w-full max-w-sm space-y-4 p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <IconBadge tone="amber">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 9v4" strokeLinecap="round" />
                  <path d="M12 16h.01" strokeLinecap="round" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              </IconBadge>
              Delete requirement?
            </h3>
            <p className="text-sm text-gray-700">
              This action cannot be undone. The requirement will be permanently
              deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="button-secondary  gap-2"
                type="button"
                onClick={() => setDeleteConfirmId(null)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
                </svg>
                Cancel
              </button>
              <button
                className=" inline-flex items-center gap-2 rounded-lg border-2 border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 shadow-[0_4px_10px_rgba(15,23,42,0.08)] transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                type="button"
                onClick={() => {
                  deleteRequirement(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M4 7h16" strokeLinecap="round" />
                  <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  <path d="M7 7l1 12a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L17 7" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
