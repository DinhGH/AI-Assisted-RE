import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";

function isDeleteNotification(message) {
  return /(delete|deleted|remove|removed|xóa)/i.test(String(message || ""));
}

export default function Layout({ children }) {
  const appName = import.meta.env.VITE_APP_NAME || "AI Requirement Studio";
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const setActiveSession = useAppStore((state) => state.setActiveSession);
  const newSession = useAppStore((state) => state.newSession);
  const refreshActiveSessionRequirements = useAppStore(
    (state) => state.refreshActiveSessionRequirements,
  );
  const error = useAppStore((state) => state.error);
  const success = useAppStore((state) => state.success);

  const [displayError, setDisplayError] = useState(null);
  const [displaySuccess, setDisplaySuccess] = useState(null);

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
  );

  useEffect(() => {
    if (!activeSession?.documentIds?.length) {
      return;
    }

    void refreshActiveSessionRequirements();
  }, [
    activeSession?.id,
    activeSession?.documentIds?.length,
    refreshActiveSessionRequirements,
  ]);

  useEffect(() => {
    if (!error) {
      setDisplayError(null);
      return undefined;
    }

    setDisplayError({ id: Date.now(), message: error, phase: "enter" });
    const showTimer = window.setTimeout(() => {
      setDisplayError((current) =>
        current ? { ...current, phase: "show" } : current,
      );
    }, 20);
    const exitTimer = window.setTimeout(() => {
      setDisplayError((current) =>
        current ? { ...current, phase: "exit" } : current,
      );
    }, 4000);
    const clearTimer = window.setTimeout(() => {
      setDisplayError(null);
    }, 4300);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(clearTimer);
    };
  }, [error]);

  useEffect(() => {
    if (!success) {
      setDisplaySuccess(null);
      return undefined;
    }

    setDisplaySuccess({ id: Date.now(), message: success, phase: "enter" });
    const showTimer = window.setTimeout(() => {
      setDisplaySuccess((current) =>
        current ? { ...current, phase: "show" } : current,
      );
    }, 20);
    const exitTimer = window.setTimeout(() => {
      setDisplaySuccess((current) =>
        current ? { ...current, phase: "exit" } : current,
      );
    }, 4000);
    const clearTimer = window.setTimeout(() => {
      setDisplaySuccess(null);
    }, 4300);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(clearTimer);
    };
  }, [success]);

  return (
    <div className="h-screen overflow-hidden bg-radial-grid text-slate-100">
      <header className="z-30 border-b border-zinc-800/80 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="fade-in-up flex min-w-max items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-500/40 bg-white/5 text-zinc-100 shadow-[0_0_18px_rgba(255,255,255,0.12)]">
              <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
                <path
                  d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v11A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5v-11Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 9h8M8 12h8M8 15h5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div className="leading-tight">
              <h1 className="text-xl font-semibold text-white sm:text-2xl">
                {appName}
              </h1>
            </div>
          </div>

          <div className="fade-in-up flex flex-1 items-center justify-center gap-2 min-w-max">
            <select
              className="input ring-focus w-[240px] max-w-[240px] py-2"
              value={activeSession?.id || ""}
              onChange={(event) => setActiveSession(event.target.value)}
            >
              {sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              className="button-secondary ring-focus w-[140px] py-2"
              type="button"
              onClick={() => newSession()}
            >
              New session
            </button>
          </div>

          <div className="fade-in-up flex min-w-max flex-col items-end justify-end gap-2 overflow-hidden">
            {displayError
              ? (() => {
                  return (
                    <div
                      key={displayError.id}
                      className={`animate-pulse rounded-xl border px-4 py-3 text-sm font-medium shadow-[0_0_18px_rgba(220,38,38,0.35)] transition-all duration-300 ease-out border-red-700/70 bg-red-950/80 text-red-200 ${
                        displayError.phase === "enter"
                          ? "translate-x-full opacity-0"
                          : displayError.phase === "exit"
                            ? "translate-x-full opacity-0"
                            : "translate-x-0 opacity-100"
                      } relative w-[320px] overflow-hidden`}
                    >
                      <div className="flex items-start gap-2 pr-2">
                        <span className="mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full border border-red-400/70 bg-red-500/15 text-xs font-bold text-red-200">
                          ⚠
                        </span>
                        <p className="leading-5">{displayError.message}</p>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-red-900/70">
                        <span
                          className="block h-full origin-left bg-red-300/95"
                          style={{
                            animation: "toastCountdown 4s linear forwards",
                          }}
                        />
                      </div>
                    </div>
                  );
                })()
              : null}

            {displaySuccess
              ? (() => {
                  const isDelete = isDeleteNotification(displaySuccess.message);
                  return (
                    <div
                      key={displaySuccess.id}
                      className={`animate-pulse rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300 ease-out ${
                        isDelete
                          ? "border-red-700/70 bg-red-950/80 text-red-200 shadow-[0_0_18px_rgba(220,38,38,0.35)]"
                          : "border-emerald-700/70 bg-emerald-950/80 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                      } ${
                        displaySuccess.phase === "enter"
                          ? "translate-x-full opacity-0"
                          : displaySuccess.phase === "exit"
                            ? "translate-x-full opacity-0"
                            : "translate-x-0 opacity-100"
                      } relative w-[320px] overflow-hidden`}
                    >
                      <div className="flex items-start gap-2 pr-2">
                        <span
                          className={`mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${
                            isDelete
                              ? "border-red-400/70 bg-red-500/15 text-red-200"
                              : "border-emerald-300/70 bg-emerald-400/15 text-emerald-100"
                          }`}
                        >
                          ✓
                        </span>
                        <p className="leading-5">{displaySuccess.message}</p>
                      </div>
                      <div
                        className={`absolute inset-x-0 bottom-0 h-1 ${
                          isDelete ? "bg-red-900/70" : "bg-emerald-900/70"
                        }`}
                      >
                        <span
                          className={`block h-full origin-left ${
                            isDelete ? "bg-red-300/95" : "bg-emerald-300/95"
                          }`}
                          style={{
                            animation: "toastCountdown 4s linear forwards",
                          }}
                        />
                      </div>
                    </div>
                  );
                })()
              : null}
          </div>
        </div>
      </header>

      <style>{`
        @keyframes toastCountdown {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>

      <main className="mx-auto h-[calc(100vh-88px)] max-w-[1700px] overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
