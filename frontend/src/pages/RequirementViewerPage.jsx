import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";

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
            <p className="text-sm font-medium text-cyan-300">
              Requirement list
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Segmented requirements
            </h2>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
            {requirements.length} items
          </span>
        </div>

        {!selectedDocumentId ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-sm text-slate-400">
            Upload a document first so the viewer can load the extracted
            requirements.
          </div>
        ) : null}

        <div className="space-y-3">
          {requirements.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`w-full rounded-2xl border p-4 text-left transition ${item.id === currentRequirement?.id ? "border-cyan-400 bg-cyan-500/10" : "border-slate-800 bg-slate-950/60 hover:border-slate-600"}`}
              onClick={() => selectRequirement(item.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.requirementCode || `Requirement #${item.id}`}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                    {item.text}
                  </p>
                </div>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                  {item.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel space-y-4">
        <div>
          <p className="text-sm font-medium text-cyan-300">
            Requirement detail
          </p>
          <h3 className="text-2xl font-semibold text-white">
            Edit and re-run analysis
          </h3>
        </div>

        {currentRequirement ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Score", currentRequirement.score ?? "—"],
                ["Clarity", currentRequirement.clarity ?? "—"],
                ["Completeness", currentRequirement.completeness ?? "—"],
                ["Consistency", currentRequirement.consistency ?? "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-200">
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
                className="button-primary"
                type="button"
                disabled={loading || !draftText.trim()}
                onClick={handleSave}
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setDraftText(currentRequirement.text)}
              >
                Reset text
              </button>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300 sm:grid-cols-3">
              <div>
                <span className="text-slate-500">Actor</span>
                <p className="mt-1 text-white">
                  {currentRequirement.actor || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Action</span>
                <p className="mt-1 text-white">
                  {currentRequirement.action || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Object</span>
                <p className="mt-1 text-white">
                  {currentRequirement.object || "—"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-sm text-slate-400">
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
