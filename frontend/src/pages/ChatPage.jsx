import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";

export default function ChatPage() {
  const chatMessages = useAppStore((state) => state.chatMessages);
  const chatSessionId = useAppStore((state) => state.chatSessionId);
  const sendChatMessage = useAppStore((state) => state.sendChatMessage);
  const loading = useAppStore((state) => state.loading);
  const error = useAppStore((state) => state.error);
  const [message, setMessage] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    setMessage("");
    await sendChatMessage(text);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
      <section className="panel space-y-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 border-violet-300 bg-violet-100 text-violet-700">
              ✨
            </span>
            AI assistant
          </p>
          <h2 className="text-2xl font-semibold text-gray-900">
            Requirement coaching chat
          </h2>
        </div>

        <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 text-sm text-gray-700">
          <p className="text-gray-600">Session ID</p>
          <p className="mt-1 break-all font-mono text-xs text-gray-700">
            {chatSessionId}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-slate-300 bg-white p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">
            What the assistant can help with
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
            <li>Clarify actors, actions, and objects</li>
            <li>Suggest clearer wording for ambiguous statements</li>
            <li>Provide quick requirement-review guidance for stakeholders</li>
          </ul>
        </div>
      </section>

      <section className="panel flex min-h-[70vh] flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700">Conversation</p>
            <h3 className="text-2xl font-semibold text-gray-900">
              Message history
            </h3>
          </div>
          <span className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600">
            {chatMessages.length} messages
          </span>
        </div>

        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white p-4"
        >
          {chatMessages.length === 0 ? (
            <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm text-gray-600">
              Start a chat to ask about requirement quality.
            </div>
          ) : (
            chatMessages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`max-w-[85%] rounded-2xl border-2 px-4 py-3 text-sm ${item.role === "user" ? "ml-auto border-slate-300 bg-slate-50 text-gray-900" : "border-slate-300 bg-gray-100 text-gray-900"}`}
              >
                <p className="mb-1 text-xs uppercase tracking-[0.25em] text-gray-600">
                  {item.role}
                </p>
                <p className="whitespace-pre-wrap leading-6">{item.message}</p>
              </div>
            ))
          )}
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <textarea
            className="input min-h-32 resize-y"
            placeholder="Ask the assistant how to improve a requirement..."
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button
              className="button-primary gap-2"
              type="submit"
              disabled={loading || !message.trim()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
              {loading ? "Sending..." : "Send message"}
            </button>
          </div>
        </form>

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
