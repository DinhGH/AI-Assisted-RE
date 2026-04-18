import { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Radar, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { jsPDF } from "jspdf";
import { useAppStore } from "../store/useAppStore";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function numeric(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toAmbiguityPercent(value) {
  return clamp(numeric(value) * 10, 0, 100);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);

  // State for resizable layout
  const [leftColWidth, setLeftColWidth] = useState(60); // percentage
  const containerRef = useRef(null);
  const isResizing = useRef(false);

  const activeSession = useMemo(
    () =>
      sessions.find((item) => item.id === activeSessionId) ||
      sessions[0] ||
      null,
    [sessions, activeSessionId],
  );

  const requirements = activeSession?.requirements || [];

  const totals = useMemo(() => {
    const score = average(requirements.map((item) => numeric(item.score)));
    const clarity = average(requirements.map((item) => numeric(item.clarity)));
    const completeness = average(
      requirements.map((item) => numeric(item.completeness)),
    );
    const consistency = average(
      requirements.map((item) => numeric(item.consistency)),
    );
    const ambiguityRaw = average(
      requirements.map((item) => numeric(item.ambiguity)),
    );
    const ambiguityPercent = toAmbiguityPercent(ambiguityRaw);
    const ambiguityReadable = 100 - ambiguityPercent;

    return {
      score,
      clarity,
      completeness,
      consistency,
      ambiguityRaw,
      ambiguityPercent,
      ambiguityReadable,
    };
  }, [requirements]);

  const radarData = useMemo(
    () => ({
      labels: [
        "Score",
        "Clarity",
        "Completeness",
        "Consistency",
        "Ambiguity (100-x)",
      ],
      datasets: [
        {
          label: "Session average",
          data: [
            totals.score,
            totals.clarity,
            totals.completeness,
            totals.consistency,
            totals.ambiguityReadable,
          ],
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderColor: "rgba(255, 255, 255, 0.9)",
          pointBackgroundColor: "rgba(255, 255, 255, 1)",
        },
      ],
    }),
    [totals],
  );

  const radarOptions = {
    responsive: true,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          backdropColor: "transparent",
          color: "#94a3b8",
        },
        angleLines: { color: "rgba(148, 163, 184, 0.2)" },
        grid: { color: "rgba(148, 163, 184, 0.18)" },
        pointLabels: { color: "#e2e8f0", font: { size: 12 } },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "#e2e8f0",
        },
      },
    },
  };

  const barData = useMemo(
    () => ({
      labels: requirements.map(
        (item, index) => item.requirementCode || `REQ-${index + 1}`,
      ),
      datasets: [
        {
          label: "Requirement score",
          data: requirements.map((item) => numeric(item.score)),
          backgroundColor: "rgba(255, 255, 255, 0.65)",
          borderColor: "rgba(255, 255, 255, 1)",
          borderWidth: 1,
        },
      ],
    }),
    [requirements],
  );

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: "#cbd5e1" },
        grid: { color: "rgba(148, 163, 184, 0.12)" },
      },
      y: {
        min: 0,
        max: 100,
        ticks: { color: "#cbd5e1" },
        grid: { color: "rgba(148, 163, 184, 0.12)" },
      },
    },
    plugins: {
      legend: { labels: { color: "#e2e8f0" } },
    },
  };

  // Calculate chart dimensions for horizontal scrolling
  const requirementSlotWidth = 130;
  const chartsNeedScroll = requirements.length > 5;

  const allRequirementsData = useMemo(() => {
    const labels = requirements.map(
      (item, index) => item.requirementCode || `REQ-${index + 1}`,
    );

    return {
      labels,
      datasets: [
        {
          label: "Score",
          data: requirements.map((item) => numeric(item.score)),
          borderColor: "rgba(255,255,255,1)",
          backgroundColor: "rgba(255,255,255,0.75)",
          borderWidth: 1,
        },
        {
          label: "Clarity",
          data: requirements.map((item) => numeric(item.clarity)),
          borderColor: "rgba(56,189,248,1)",
          backgroundColor: "rgba(56,189,248,0.65)",
          borderWidth: 1,
        },
        {
          label: "Completeness",
          data: requirements.map((item) => numeric(item.completeness)),
          borderColor: "rgba(74,222,128,1)",
          backgroundColor: "rgba(74,222,128,0.65)",
          borderWidth: 1,
        },
        {
          label: "Consistency",
          data: requirements.map((item) => numeric(item.consistency)),
          borderColor: "rgba(250,204,21,1)",
          backgroundColor: "rgba(250,204,21,0.65)",
          borderWidth: 1,
        },
        {
          label: "Ambiguity",
          data: requirements.map((item) => numeric(item.ambiguity)),
          borderColor: "rgba(248,113,113,1)",
          backgroundColor: "rgba(248,113,113,0.6)",
          borderWidth: 1,
        },
      ],
    };
  }, [requirements]);

  const allRequirementsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: { color: "#cbd5e1" },
        grid: { color: "rgba(148, 163, 184, 0.12)" },
      },
      y: {
        min: 0,
        max: 100,
        ticks: { color: "#cbd5e1" },
        grid: { color: "rgba(148, 163, 184, 0.12)" },
      },
    },
    plugins: {
      legend: {
        labels: { color: "#e2e8f0" },
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
  };

  // Handle resize
  const handleMouseDown = () => {
    isResizing.current = true;
  };

  const handleMouseUp = () => {
    isResizing.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isResizing.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;

    // Constrain between 40% and 70%
    if (newWidth >= 40 && newWidth <= 70) {
      setLeftColWidth(newWidth);
    }
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Final Requirement Report", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Session: ${activeSession?.name || "N/A"}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    let y = 42;

    requirements.forEach((item, index) => {
      if (y > 270) {
        doc.addPage();
        y = 16;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Requirement ${index + 1}`, 14, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const lines = doc.splitTextToSize(item.text || "", 180);
      doc.text(lines, 14, y);
      y += Math.max(8, lines.length * 5);

      doc.text(
        `Score: ${Math.round(numeric(item.score))} | Clarity: ${Math.round(numeric(item.clarity))} | Completeness: ${Math.round(numeric(item.completeness))} | Consistency: ${Math.round(numeric(item.consistency))}`,
        14,
        y,
      );
      y += 8;

      doc.setDrawColor(80, 80, 80);
      doc.line(14, y, 196, y);
      y += 6;
    });

    doc.save(`session-${activeSession?.id || "report"}.pdf`);
  };

  return (
    <div
      ref={containerRef}
      className="flex h-full gap-0"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ userSelect: isResizing.current ? "none" : "auto" }}
    >
      {/* Left Panel */}
      <section
        className="fade-in-up app-scrollbar flex min-h-0 flex-col gap-4 overflow-y-auto pr-1"
        style={{ width: `${leftColWidth}%` }}
      >
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">
            Session analytics
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Requirement analytics dashboard
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Every change saved on the Home page is reflected here instantly.
          </p>
        </div>

        <div className="panel p-4">
          <Radar data={radarData} options={radarOptions} />
        </div>

        <div className="panel p-4">
          <div className="h-[300px] overflow-x-auto overflow-y-hidden">
            <div
              style={{
                width: chartsNeedScroll
                  ? `${requirements.length * requirementSlotWidth}px`
                  : "100%",
              }}
              className="h-full"
            >
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>

        <div className="panel p-4">
          <div className="mb-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Full requirement statistics
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              All requirements across all dimensions
            </h3>
          </div>

          {requirements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
              No requirement data available yet.
            </div>
          ) : (
            <div className="app-scrollbar overflow-x-auto overflow-y-hidden">
              <div
                style={{
                  width: chartsNeedScroll
                    ? `${requirements.length * requirementSlotWidth}px`
                    : "100%",
                }}
                className="h-[400px]"
              >
                <Bar
                  data={allRequirementsData}
                  options={allRequirementsOptions}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Resizer Divider */}
      <div
        onMouseDown={handleMouseDown}
        className="w-1 cursor-col-resize bg-slate-700 hover:bg-slate-500 transition-colors"
        style={{ userSelect: "none" }}
      />

      {/* Right Panel */}
      <section
        className="fade-in-up app-scrollbar flex min-h-0 flex-col gap-4 overflow-y-auto pr-1"
        style={{ width: `${100 - leftColWidth}%` }}
      >
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            KPI
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              ["Total requirements", requirements.length],
              ["Avg score", Math.round(totals.score)],
              ["Avg clarity", Math.round(totals.clarity)],
              ["Avg completeness", Math.round(totals.completeness)],
              ["Avg consistency", Math.round(totals.consistency)],
              ["Avg ambiguity", Math.round(totals.ambiguityPercent)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="card-hover rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            Export
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">
            Export final requirements
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            The PDF includes all requirements after edits from the Home page.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              className="button-primary ring-focus"
              type="button"
              onClick={exportPdf}
              disabled={requirements.length === 0}
            >
              📄 Export PDF
            </button>
            <button
              className="button-secondary ring-focus"
              type="button"
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
