import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAssessments, deleteAssessment } from "@/lib/assessments";
import { formatINR } from "@/lib/predict";
import { FileText, Plus, Trash2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Assessment History — MediPredict AI" },
      { name: "description", content: "Review all your past health assessments." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: listAssessments,
  });
  const del = useMutation({
    mutationFn: deleteAssessment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assessments"] }),
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Assessment History</h1>
          <p className="mt-2 text-muted-foreground">
            {isLoading ? "Loading…" : `${items.length} past assessment${items.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link to="/assessment" className="px-4 py-2.5 rounded-lg bg-cyan text-[oklch(0.15_0.04_255)] font-semibold flex items-center gap-2 text-sm hover:glow-cyan transition-shadow">
          <Plus className="h-4 w-4" /> New Assessment
        </Link>
      </div>

      {isLoading ? (
        <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 text-cyan animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="mt-12 glass rounded-2xl p-12 text-center">
          <FileText className="h-12 w-12 text-cyan mx-auto opacity-50" />
          <p className="mt-4 text-muted-foreground">No assessments yet. Start your first one to monitor your risk.</p>
        </div>
      ) : (
        <div className="mt-8 glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-6 py-4">Date</th>
                  <th className="text-left px-6 py-4">Top Prediction</th>
                  <th className="text-left px-6 py-4">Risk Score</th>
                  <th className="text-left px-6 py-4">Cost Estimate</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const riskColor =
                    a.risk_score > 65 ? "var(--risk-high)" : a.risk_score > 40 ? "var(--risk-med)" : "var(--risk-low)";
                  return (
                    <tr key={a.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-6 py-4">{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 font-medium">{a.top_condition ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-semibold" style={{ color: riskColor }}>{a.risk_score}%</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatINR(a.result.cost.min)} – {formatINR(a.result.cost.max)}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-3 items-center">
                        <Link to="/results/$id" params={{ id: a.id }} className="text-cyan hover:underline font-medium">
                          View →
                        </Link>
                        <button
                          onClick={() => { if (confirm("Delete this assessment?")) del.mutate(a.id); }}
                          className="text-muted-foreground hover:text-[var(--risk-high)] transition-colors"
                          aria-label="Delete assessment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}