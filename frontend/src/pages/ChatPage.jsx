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
          <p className="text-sm font-medium text-cyan-300">AI assistant</p>
          <h2 className="text-2xl font-semibold text-white">
            Requirement coaching chat
          </h2>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p className="text-slate-500">Session ID</p>
          <p className="mt-1 break-all font-mono text-xs text-cyan-200">
            {chatSessionId}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p className="font-medium text-white">
            What the assistant can help with
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-400">
            <li>Clarify actors, actions, and objects</li>
            <li>Suggest clearer wording for ambiguous statements</li>
            <li>Provide quick requirement-review guidance for stakeholders</li>
          </ul>
        </div>
      </section>

      <section className="panel flex min-h-[70vh] flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-cyan-300">Conversation</p>
            <h3 className="text-2xl font-semibold text-white">
              Message history
            </h3>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
            {chatMessages.length} messages
          </span>
        </div>

        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
        >
          {chatMessages.length === 0 ? (
            <div className="flex h-full min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
              Start a chat to ask about requirement quality.
            </div>
          ) : (
            chatMessages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${item.role === "user" ? "ml-auto bg-cyan-500/15 text-cyan-100" : "bg-slate-900 text-slate-100"}`}
              >
                <p className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-400">
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
              className="button-primary"
              type="submit"
              disabled={loading || !message.trim()}
            >
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
