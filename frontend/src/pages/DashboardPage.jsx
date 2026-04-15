import { useMemo } from "react";
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);

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
    const ambiguity =
      average(requirements.map((item) => numeric(item.ambiguity))) * 10;

    return {
      score,
      clarity,
      completeness,
      consistency,
      ambiguity,
    };
  }, [requirements]);

  const radarData = useMemo(
    () => ({
      labels: ["Score", "Clarity", "Completeness", "Consistency", "Ambiguity"],
      datasets: [
        {
          label: "Session average",
          data: [
            totals.score,
            totals.clarity,
            totals.completeness,
            totals.consistency,
            totals.ambiguity,
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

  const topFive = useMemo(() => {
    const sorted = [...requirements].sort(
      (a, b) => numeric(b.score) - numeric(a.score),
    );
    return sorted.slice(0, 5);
  }, [requirements]);

  const barData = useMemo(
    () => ({
      labels: topFive.map(
        (item, index) => item.requirementCode || `REQ-${index + 1}`,
      ),
      datasets: [
        {
          label: "Requirement score",
          data: topFive.map((item) => numeric(item.score)),
          backgroundColor: "rgba(255, 255, 255, 0.65)",
          borderColor: "rgba(255, 255, 255, 1)",
          borderWidth: 1,
        },
      ],
    }),
    [topFive],
  );

  const barOptions = {
    responsive: true,
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
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="fade-in-up space-y-4">
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
          <Bar data={barData} options={barOptions} />
        </div>
      </section>

      <section className="fade-in-up space-y-4">
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
              ["Avg ambiguity", Math.round(totals.ambiguity)],
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
