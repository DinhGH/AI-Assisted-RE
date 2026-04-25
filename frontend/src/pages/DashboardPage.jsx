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
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return 10;
  }

  if (n >= 10 && n <= 90) {
    return n;
  }

  const bounded = clamp(n, 0, 100);
  return 10 + 80 / (1 + Math.exp(-(bounded - 50) / 12));
}

function toAmbiguityPercent(value) {
  return clamp(numeric(value), 10, 90);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function IconChip({ tone = "blue", children }) {
  const toneClass = {
    blue: "border-slate-300 bg-slate-100 text-slate-700",
    emerald: "border-emerald-300 bg-emerald-100 text-emerald-700",
    violet: "border-violet-300 bg-violet-100 text-violet-700",
    amber: "border-amber-300 bg-amber-100 text-amber-700",
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
        "Ambiguity (90-x)",
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
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderColor: "rgba(59, 130, 246, 0.8)",
          pointBackgroundColor: "rgba(59, 130, 246, 1)",
        },
      ],
    }),
    [totals],
  );

  const radarOptions = {
    responsive: true,
    scales: {
      r: {
        min: 10,
        max: 90,
        ticks: {
          backdropColor: "transparent",
          color: "#4b5563",
        },
        angleLines: { color: "rgba(156, 163, 175, 0.5)" }, // đậm hơn
        grid: { color: "rgba(156, 163, 175, 0.4)" }, // đậm hơn
        pointLabels: { color: "#111827", font: { size: 12 } },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "#374151",
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
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgba(59, 130, 246, 1)",
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
        ticks: { color: "#374151" },
        grid: { color: "rgba(156, 163, 175, 0.4)" }, // đậm hơn
      },
      y: {
        min: 10,
        max: 90,
        ticks: { color: "#374151" },
        grid: { color: "rgba(156, 163, 175, 0.4)" }, // đậm hơn
      },
    },
    plugins: {
      legend: { labels: { color: "#374151" } },
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
          borderColor: "rgba(59,130,246,1)",
          backgroundColor: "rgba(59,130,246,0.7)",
          borderWidth: 1,
        },
        {
          label: "Clarity",
          data: requirements.map((item) => numeric(item.clarity)),
          borderColor: "rgba(59,130,246,1)",
          backgroundColor: "rgba(59,130,246,0.5)",
          borderWidth: 1,
        },
        {
          label: "Completeness",
          data: requirements.map((item) => numeric(item.completeness)),
          borderColor: "rgba(34,197,94,1)",
          backgroundColor: "rgba(34,197,94,0.5)",
          borderWidth: 1,
        },
        {
          label: "Consistency",
          data: requirements.map((item) => numeric(item.consistency)),
          borderColor: "rgba(217,119,6,1)",
          backgroundColor: "rgba(217,119,6,0.5)",
          borderWidth: 1,
        },
        {
          label: "Ambiguity",
          data: requirements.map((item) => numeric(item.ambiguity)),
          borderColor: "rgba(220,38,38,1)",
          backgroundColor: "rgba(220,38,38,0.5)",
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
        ticks: { color: "#374151" },
        grid: { color: "rgba(156, 163, 175, 0.4)" }, // đậm hơn
      },
      y: {
        min: 10,
        max: 90,
        ticks: { color: "#374151" },
        grid: { color: "rgba(156, 163, 175, 0.4)" }, // đậm hơn
      },
    },
    plugins: {
      legend: {
        labels: { color: "#374151" },
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
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gray-600">
            <IconChip tone="violet">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 19h16" strokeLinecap="round" />
                <rect x="5" y="11" width="3" height="6" rx="1" />
                <rect x="10.5" y="7" width="3" height="10" rx="1" />
                <rect x="16" y="4" width="3" height="13" rx="1" />
              </svg>
            </IconChip>
            Session analytics
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-900">
            Requirement analytics dashboard
          </h2>
          <p className="mt-2 text-sm text-gray-700">
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
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gray-600">
              <IconChip tone="blue">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 19h16" strokeLinecap="round" />
                  <path
                    d="M6 14l3-3 3 2 5-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 7h3v3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconChip>
              Full requirement statistics
            </p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">
              All requirements across all dimensions
            </h3>
          </div>

          {requirements.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-gray-50 p-4 text-sm text-gray-600">
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
        className="w-[6px] cursor-col-resize rounded-full bg-gray-300 transition-colors hover:bg-gray-400 mx-1.5"
        style={{ userSelect: "none" }}
      />

      {/* Right Panel */}
      <section
        className="fade-in-up app-scrollbar flex min-h-0 flex-col gap-4 overflow-y-auto pr-1"
        style={{ width: `${100 - leftColWidth}%` }}
      >
        <div className="panel p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gray-600">
            <IconChip tone="emerald">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 12h16" strokeLinecap="round" />
                <path d="M12 4v16" strokeLinecap="round" />
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </IconChip>
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
                className="card-hover rounded-xl border-2 border-slate-300 bg-white p-3"
              >
                <p className="text-[11px] uppercase tracking-[0.3em] text-gray-900">
                  {label}
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel p-4">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gray-600">
            <IconChip tone="amber">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 4v11" strokeLinecap="round" />
                <path
                  d="M8 11l4 4 4-4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="4" y="17" width="16" height="3" rx="1" />
              </svg>
            </IconChip>
            Export
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">
            Export final requirements
          </h3>
          <p className="mt-2 text-sm text-gray-700">
            The PDF includes all requirements after edits from the Home page.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              className="button-primary ring-focus gap-2"
              type="button"
              onClick={exportPdf}
              disabled={requirements.length === 0}
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
                <path d="M8 16h8" strokeLinecap="round" />
              </svg>
              Export PDF
            </button>
            <button
              className="button-secondary ring-focus gap-2"
              type="button"
              onClick={() => navigate("/")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  d="M15 6l-6 6 6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to Home
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
