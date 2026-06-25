import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAssessment, updateAssessmentNotes, deleteAssessment } from "@/lib/assessments";
import { formatINR } from "@/lib/predict";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { Download, RefreshCw, Activity, HeartPulse, Pill, AlertTriangle, Trash2, Save, Loader2 } from "lucide-react";
import { useSetChatContext } from "@/components/ChatContext";

export const Route = createFileRoute("/_authenticated/results/$id")({
  head: () => ({
    meta: [
      { title: "Assessment Results — MediPredict AI" },
      { name: "description", content: "Your personalized disease risk and treatment cost analysis." },
    ],
  }),
  component: Results,
});

function Results() {
  const { id } = useParams({ from: "/_authenticated/results/$id" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: a, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: () => getAssessment(id),
  });

  // Push this assessment's data into the global chatbot via context.
  // Must run unconditionally (before any early returns) per Rules of Hooks.
  useSetChatContext(
    a
      ? {
        top_diseases: a.result.diseases.map((d) => ({
          disease: d.name,
          probability: d.probability,
          severity: d.severity,
        })),
        risk_score: a.risk_score,
        estimated_cost: {
          min_inr: a.result.cost.min,
          max_inr: a.result.cost.max,
        },
      }
      : null
  );

  const [notes, setNotes] = useState("");
  useEffect(() => { if (a?.notes != null) setNotes(a.notes); }, [a?.notes]);

  const saveNotes = useMutation({
    mutationFn: () => updateAssessmentNotes(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessment", id] });
      qc.invalidateQueries({ queryKey: ["assessments"] });
    },
  });

  const del = useMutation({
    mutationFn: () => deleteAssessment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      navigate({ to: "/history" });
    },
  });

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 text-cyan animate-spin" /></div>;
  }
  if (!a) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Assessment not found</h1>
        <Link to="/assessment" className="mt-4 inline-block text-cyan underline">Start a new assessment</Link>
      </div>
    );
  }

  const result = a.result;
  const riskColor = a.risk_score > 65 ? "var(--risk-high)" : a.risk_score > 40 ? "var(--risk-med)" : "var(--risk-low)";
  const riskLabel = a.risk_score > 65 ? "High Risk" : a.risk_score > 40 ? "Moderate Risk" : "Low Risk";

  const download = () => {
    const blob = new Blob([JSON.stringify(a, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `medipredict-report-${a.id.slice(0, 8)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your Health Report</h1>
          <p className="mt-2 text-muted-foreground">Generated {new Date(a.created_at).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={download} className="px-4 py-2.5 rounded-lg border border-border hover:border-cyan transition-colors flex items-center gap-2 text-sm">
            <Download className="h-4 w-4" /> Download
          </button>
          <button onClick={() => { if (confirm("Delete this assessment?")) del.mutate(); }} className="px-4 py-2.5 rounded-lg border border-border hover:border-[var(--risk-high)] hover:text-[var(--risk-high)] transition-colors flex items-center gap-2 text-sm">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <Link to="/assessment" className="px-4 py-2.5 rounded-lg bg-cyan text-[oklch(0.15_0.04_255)] font-semibold flex items-center gap-2 text-sm hover:glow-cyan transition-shadow">
            <RefreshCw className="h-4 w-4" /> New Assessment
          </Link>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-1">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Overall Risk Score</h2>
          <div className="relative h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="75%" outerRadius="100%" startAngle={210} endAngle={-30}
                data={[{ name: "risk", value: a.risk_score, fill: riskColor }]}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "oklch(1 0 0 / 8%)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-5xl font-bold" style={{ color: riskColor }}>{a.risk_score}%</span>
              <span className="text-sm font-medium mt-1" style={{ color: riskColor }}>{riskLabel}</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Top Predicted Conditions</h2>
          <div className="space-y-4">
            {result.diseases.map((d, i) => (
              <div key={d.name} className="p-4 rounded-xl bg-secondary/50 border border-border">
                <div className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-cyan font-bold text-lg">#{i + 1}</span>
                    <span className="font-semibold">{d.name}</span>
                  </div>
                  <SeverityBadge severity={d.severity} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${d.probability}%`, background: d.severity === "High" ? "var(--risk-high)" : d.severity === "Medium" ? "var(--risk-med)" : "var(--risk-low)" }} />
                  </div>
                  <span className="text-sm font-mono font-semibold w-12 text-right">{d.probability}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-6 glow-cyan">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Estimated Treatment Cost</h2>
        <div className="mt-2 text-3xl md:text-4xl font-bold text-cyan">
          {formatINR(result.cost.min)} – {formatINR(result.cost.max)}
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {result.cost.breakdown.map((b) => (
            <div key={b.label} className="p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="text-xs text-muted-foreground">{b.label}</div>
              <div className="mt-1 font-bold text-lg">{formatINR(b.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Recommended Actions</h2>
        <div className="space-y-3">
          {result.actions.map((act, i) => {
            const Icon = [HeartPulse, Pill, Activity][i] || Activity;
            return (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
                <Icon className="h-5 w-5 text-cyan flex-shrink-0 mt-0.5" />
                <p className="text-sm">{act}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Personal Notes</h2>
          <button
            onClick={() => saveNotes.mutate()}
            disabled={saveNotes.isPending}
            className="px-3 py-1.5 rounded-md bg-cyan text-[oklch(0.15_0.04_255)] text-xs font-semibold flex items-center gap-1.5 hover:glow-cyan transition-shadow disabled:opacity-60"
          >
            {saveNotes.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Save
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Add notes about how you felt, medications, follow-ups…"
          className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-cyan outline-none text-sm resize-none"
        />
        {saveNotes.isSuccess && <p className="mt-2 text-xs text-cyan">Notes saved.</p>}
      </div>

      <p className="mt-8 text-xs text-muted-foreground flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        This assessment is for informational purposes only and does not replace professional medical advice.
      </p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "Low" | "Medium" | "High" }) {
  const map = {
    Low: { color: "var(--risk-low)", bg: "color-mix(in oklch, var(--risk-low) 15%, transparent)" },
    Medium: { color: "var(--risk-med)", bg: "color-mix(in oklch, var(--risk-med) 15%, transparent)" },
    High: { color: "var(--risk-high)", bg: "color-mix(in oklch, var(--risk-high) 15%, transparent)" },
  };
  const s = map[severity];
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ color: s.color, backgroundColor: s.bg, border: `1px solid ${s.color}` }}>
      {severity}
    </span>
  );
}