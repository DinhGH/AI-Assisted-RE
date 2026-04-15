import { NavLink } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useAppStore } from "../store/useAppStore";

const navClassName = ({ isActive }) =>
  `nav-link ${isActive ? "nav-link-active" : ""}`;

export default function Layout({ children }) {
  const appName = import.meta.env.VITE_APP_NAME || "AI Requirement Studio";
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const setActiveSession = useAppStore((state) => state.setActiveSession);
  const newSession = useAppStore((state) => state.newSession);
  const refreshActiveSessionRequirements = useAppStore(
    (state) => state.refreshActiveSessionRequirements,
  );

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

  return (
    <div className="min-h-screen bg-radial-grid text-slate-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="fade-in-up flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl border border-zinc-500/40 bg-white/5 p-2 text-zinc-100 shadow-[0_0_24px_rgba(255,255,255,0.12)]">
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
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-400">
                Requirement review workspace
              </p>
              <h1 className="text-lg font-semibold text-white sm:text-2xl">
                {appName}
              </h1>
            </div>
          </div>

          <div className="fade-in-up flex flex-wrap items-center gap-2">
            <select
              className="input ring-focus min-w-64 py-2"
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
              className="button-secondary ring-focus py-2"
              type="button"
              onClick={() => newSession()}
            >
              New session
            </button>
          </div>

          <nav className="fade-in-up rounded-2xl border border-zinc-800/80 bg-black/60 p-1.5">
            <div className="flex gap-1">
              <NavLink className={navClassName} to="/">
                Home
              </NavLink>
              <NavLink className={navClassName} to="/dashboard">
                Dashboard
              </NavLink>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
