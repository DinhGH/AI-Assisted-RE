import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";

function isDeleteNotification(message) {
  return /(delete|deleted|remove|removed|xóa)/i.test(String(message || ""));
}

function InlineIcon({ children, tone = "blue" }) {
  const toneClass = {
    blue: "border-slate-300 bg-slate-100 text-slate-700",
    purple: "border-violet-300 bg-violet-100 text-violet-700",
    green: "border-emerald-300 bg-emerald-100 text-emerald-700",
    red: "border-red-300 bg-red-100 text-red-700",
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
    <div className="h-screen overflow-hidden border-[3px] border-slate-900 bg-white text-gray-900">
      <header className="z-30 border-b-2 border-slate-300 bg-gradient-to-r from-white via-slate-50 to-slate-100 shadow-sm">
        <div className="mx-auto flex max-w-[1700px] items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="fade-in-up flex min-w-max items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-slate-700 shadow-sm">
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
              <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
                {appName}
              </h1>
            </div>
          </div>

          <div className="fade-in-up flex min-w-max flex-1 items-center justify-center gap-2">
            <div className="flex items-center gap-2 ">
              <select
                className="input  border-0 bg-white py-1.5 text-sm shadow-none"
                value={activeSession?.id || ""}
                onChange={(event) => setActiveSession(event.target.value)}
              >
                {sessions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="button-secondary h-[45px]  gap-1.5 !px-3 !py-1.5 !text-sm"
              type="button"
              onClick={() => newSession()}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="mr-1 h-3.5 w-3.5"
                stroke="currentColor"
                strokeWidth="1.9"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              New session
            </button>
          </div>

          <div className="fade-in-up flex min-w-max flex-col items-end justify-end gap-2 overflow-hidden">
            {displayError
              ? (() => {
                  return (
                    <div
                      key={displayError.id}
                      className={`animate-pulse rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-md transition-all duration-300 ease-out border-red-300 bg-red-50 text-red-800 ${
                        displayError.phase === "enter"
                          ? "translate-x-full opacity-0"
                          : displayError.phase === "exit"
                            ? "translate-x-full opacity-0"
                            : "translate-x-0 opacity-100"
                      } relative w-[320px] overflow-hidden`}
                    >
                      <div className="flex items-start gap-2 pr-2">
                        <span className="mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-red-300 bg-red-100 text-xs font-bold text-red-700">
                          ⚠
                        </span>
                        <p className="leading-5">{displayError.message}</p>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-red-200">
                        <span
                          className="block h-full origin-left bg-red-400"
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
                      className={`animate-pulse rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-300 ease-out ${
                        isDelete
                          ? "border-red-300 bg-red-50 text-red-800 shadow-md"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-md"
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
                          className={`mt-[1px] inline-flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs font-bold ${
                            isDelete
                              ? "border-red-300 bg-red-100 text-red-700"
                              : "border-emerald-300 bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          ✓
                        </span>
                        <p className="leading-5">{displaySuccess.message}</p>
                      </div>
                      <div
                        className={`absolute inset-x-0 bottom-0 h-1 ${
                          isDelete ? "bg-red-200" : "bg-emerald-200"
                        }`}
                      >
                        <span
                          className={`block h-full origin-left ${
                            isDelete ? "bg-red-400" : "bg-emerald-400"
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

      <main className="mx-auto h-[calc(100vh-88px)] max-w-[1700px] overflow-hidden bg-white px-4 pb-6 pt-4 text-gray-900 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
