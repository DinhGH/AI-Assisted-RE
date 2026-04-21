import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";

function formatBoundedScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  let normalized = numeric;
  if (numeric < 10 || numeric > 90) {
    const bounded = Math.max(0, Math.min(100, numeric));
    normalized = 10 + 80 / (1 + Math.exp(-(bounded - 50) / 12));
  }

  return String(Math.round(normalized));
}

export default function RequirementViewerPage() {
  const requirements = useAppStore((state) => state.requirements);
  const selectedRequirementId = useAppStore(
    (state) => state.selectedRequirementId,
  );
  const selectedDocumentId = useAppStore((state) => state.selectedDocumentId);
  const loading = useAppStore((state) => state.loading);
  const error = useAppStore((state) => state.error);
  const success = useAppStore((state) => state.success);
  const fetchRequirements = useAppStore((state) => state.fetchRequirements);
  const selectRequirement = useAppStore((state) => state.selectRequirement);
  const updateRequirement = useAppStore((state) => state.updateRequirement);

  const currentRequirement = useMemo(
    () =>
      requirements.find((item) => item.id === selectedRequirementId) ||
      requirements[0] ||
      null,
    [requirements, selectedRequirementId],
  );

  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    if (!selectedDocumentId) return;
    fetchRequirements(selectedDocumentId);
  }, [selectedDocumentId, fetchRequirements]);

  useEffect(() => {
    setDraftText(currentRequirement?.text || "");
  }, [currentRequirement?.id, currentRequirement?.text]);

  const handleSave = async () => {
    if (!currentRequirement) return;
    await updateRequirement(currentRequirement.id, draftText);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 border-violet-300 bg-violet-100 text-violet-700">
                📋
              </span>
              Requirement list
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">
              Segmented requirements
            </h2>
          </div>
          <span className="rounded-full border-2 border-slate-300 px-3 py-1 text-xs text-gray-600">
            {requirements.length} items
          </span>
        </div>

        {!selectedDocumentId ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-gray-50 p-6 text-sm text-gray-600">
            Upload a document first so the viewer can load the extracted
            requirements.
          </div>
        ) : null}

        <div className="space-y-3">
          {requirements.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`w-full rounded-2xl border-2 p-4 text-left transition ${item.id === currentRequirement?.id ? "border-slate-400 bg-slate-50" : "border-slate-300 bg-white hover:border-slate-400"}`}
              onClick={() => selectRequirement(item.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.requirementCode || `Requirement #${item.id}`}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-700">
                    {item.text}
                  </p>
                </div>
                <span className="rounded-full border-2 border-slate-300 px-3 py-1 text-xs text-gray-600">
                  {item.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel space-y-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 border-emerald-300 bg-emerald-100 text-emerald-700">
              ✍
            </span>
            Requirement detail
          </p>
          <h3 className="text-2xl font-semibold text-gray-900">
            Edit and re-run analysis
          </h3>
        </div>

        {currentRequirement ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Score", formatBoundedScore(currentRequirement.score)],
                ["Clarity", formatBoundedScore(currentRequirement.clarity)],
                [
                  "Completeness",
                  formatBoundedScore(currentRequirement.completeness),
                ],
                [
                  "Consistency",
                  formatBoundedScore(currentRequirement.consistency),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border-2 border-slate-300 bg-white p-4"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-gray-600">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-900">
                Requirement text
              </span>
              <textarea
                className="input min-h-72 resize-y"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                className="button-primary gap-2"
                type="button"
                disabled={loading || !draftText.trim()}
                onClick={handleSave}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M5 4h11l3 3v13H5V4Z" />
                  <path d="M8 4v6h8" />
                </svg>
                {loading ? "Saving..." : "Save changes"}
              </button>
              <button
                className="button-secondary gap-2"
                type="button"
                onClick={() => setDraftText(currentRequirement.text)}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M20 11a8 8 0 1 0-2.35 5.65" strokeLinecap="round" />
                  <path
                    d="M20 4v7h-7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Reset text
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border-2 border-slate-300 bg-white p-4 text-sm text-gray-700 sm:grid-cols-3">
              <div>
                <span className="text-gray-500">Actor</span>
                <p className="mt-1 text-gray-900">
                  {currentRequirement.actor || "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Action</span>
                <p className="mt-1 text-gray-900">
                  {currentRequirement.action || "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Object</span>
                <p className="mt-1 text-gray-900">
                  {currentRequirement.object || "—"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-gray-50 p-6 text-sm text-gray-600">
            No requirement selected yet.
          </div>
        )}

        {error ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </p>
        ) : null}
      </section>
    </div>
  );
}
