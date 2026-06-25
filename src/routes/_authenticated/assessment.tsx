import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { fetchSymptoms, predict } from "@/lib/predict";
import { createAssessment } from "@/lib/assessments";
import { ChevronLeft, ChevronRight, Check, Loader2, Search, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assessment")({
  head: () => ({
    meta: [
      { title: "Health Assessment — MediPredict AI" },
      { name: "description", content: "Complete a 3-step health assessment for AI-powered disease prediction." },
    ],
  }),
  component: AssessmentPage,
});

const STEPS = ["Personal Info", "Symptoms", "Medical History"];

function AssessmentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Personal info
  const [age, setAge] = useState(35);
  const [gender, setGender] = useState("Male");
  const [bmi, setBmi] = useState(24);
  const [smoking, setSmoking] = useState(false);
  const [alcohol, setAlcohol] = useState("None");
  const [region, setRegion] = useState("");
  const [children, setChildren] = useState(0);

  // Symptoms — loaded from API
  const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
  const [symptomsLoading, setSymptomsLoading] = useState(false);
  const [symptomsError, setSymptomsError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState("");

  // Medical history
  const [diabetes, setDiabetes] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [heartDisease, setHeartDisease] = useState(false);
  const [asthma, setAsthma] = useState(false);
  const [kidneyDisease, setKidneyDisease] = useState(false);
  const [medications, setMedications] = useState("");
  const [bloodPressure, setBloodPressure] = useState(120);
  const [cholesterol, setCholesterol] = useState(180);

  // Load symptoms from the ML API on mount
  useEffect(() => {
    setSymptomsLoading(true);
    fetchSymptoms()
      .then((list) => {
        setAllSymptoms(list);
        setSymptomsError(null);
      })
      .catch((err) => {
        setSymptomsError(err instanceof Error ? err.message : "Failed to load symptoms");
      })
      .finally(() => setSymptomsLoading(false));
  }, []);

  // Filter symptoms by search query
  const filteredSymptoms = useMemo(() => {
    if (!symptomSearch.trim()) return allSymptoms;
    const q = symptomSearch.toLowerCase();
    return allSymptoms.filter((s) => s.toLowerCase().includes(q));
  }, [allSymptoms, symptomSearch]);

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = async () => {
    const input = {
      personal: { age, gender, bmi, smoking, alcohol, region, children },
      symptoms,
      history: { diabetes, hypertension, heartDisease, asthma, kidneyDisease, medications, bloodPressure, cholesterol },
    };
    setSubmitting(true);
    setError(null);
    try {
      const result = await predict(input);
      const row = await createAssessment(input, result);
      navigate({ to: "/results/$id", params: { id: row.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Health Assessment</h1>
      <p className="mt-2 text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

      <div className="mt-6 flex gap-2">
        {STEPS.map((_, i) => (
          <div key={i} className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-cyan transition-all duration-500" style={{ width: i <= step ? "100%" : "0%" }} />
          </div>
        ))}
      </div>

      <div className="mt-8 glass rounded-2xl p-6 md:p-8">
        {/* ── Step 1: Personal Info ── */}
        {step === 0 && (
          <div className="space-y-6">
            <Field label={`Age — ${age} years`}>
              <input type="range" min="1" max="100" value={age} onChange={(e) => setAge(+e.target.value)} className="w-full accent-cyan" />
            </Field>
            <Field label="Gender">
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-cyan outline-none">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>
            <Field label={`BMI — ${bmi.toFixed(1)}`}>
              <input type="range" min="10" max="50" step="0.5" value={bmi} onChange={(e) => setBmi(+e.target.value)} className="w-full accent-cyan" />
            </Field>
            <Field label="Smoking"><Toggle value={smoking} onChange={setSmoking} /></Field>
            <Field label="Alcohol Consumption">
              <div className="grid grid-cols-3 gap-2">
                {["None", "Moderate", "Heavy"].map((o) => (
                  <button key={o} onClick={() => setAlcohol(o)} className={`px-4 py-3 rounded-lg border transition-all ${alcohol === o ? "border-cyan bg-cyan/10 text-cyan" : "border-border bg-secondary hover:border-cyan/50"}`}>{o}</button>
                ))}
              </div>
            </Field>
            <Field label="Country Name">
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-cyan outline-none" placeholder="e.g. India" />
            </Field>
            <Field label={`Number of Children — ${children}`}>
              <input type="range" min="0" max="10" value={children} onChange={(e) => setChildren(+e.target.value)} className="w-full accent-cyan" />
            </Field>
          </div>
        )}

        {/* ── Step 2: Symptoms ── */}
        {step === 1 && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">Select all symptoms you've experienced in the last 2 weeks.</p>

            {/* Search bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={symptomSearch}
                onChange={(e) => setSymptomSearch(e.target.value)}
                placeholder="Search symptoms…"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border border-border focus:border-cyan outline-none text-sm"
              />
            </div>

            {/* Selected symptoms count */}
            {symptoms.length > 0 && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan/10 border border-cyan/20">
                <Check className="h-4 w-4 text-cyan" />
                <span className="text-sm text-cyan font-medium">{symptoms.length} symptom{symptoms.length !== 1 ? "s" : ""} selected</span>
                <button onClick={() => setSymptoms([])} className="ml-auto text-xs text-muted-foreground hover:text-cyan transition-colors">Clear all</button>
              </div>
            )}

            {/* Loading / Error states */}
            {symptomsLoading && (
              <div className="py-12 flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 text-cyan animate-spin" />
                <p className="text-sm text-muted-foreground">Loading symptoms from ML model…</p>
              </div>
            )}

            {symptomsError && (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <AlertCircle className="h-8 w-8 text-[var(--risk-high)]" />
                <p className="text-sm text-[var(--risk-high)]">{symptomsError}</p>
                <p className="text-xs text-muted-foreground">Make sure the ML API is running at {import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}</p>
                <button
                  onClick={() => {
                    setSymptomsLoading(true);
                    setSymptomsError(null);
                    fetchSymptoms()
                      .then(setAllSymptoms)
                      .catch((err) => setSymptomsError(err instanceof Error ? err.message : "Failed to load symptoms"))
                      .finally(() => setSymptomsLoading(false));
                  }}
                  className="mt-2 px-4 py-2 rounded-lg bg-cyan text-[oklch(0.15_0.04_255)] text-sm font-semibold hover:glow-cyan transition-shadow"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Symptom grid */}
            {!symptomsLoading && !symptomsError && (
              <>
                {filteredSymptoms.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No symptoms match "{symptomSearch}"</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredSymptoms.map((s) => {
                      const active = symptoms.includes(s);
                      return (
                        <button key={s} onClick={() => toggleSymptom(s)} className={`text-left px-3 py-3 rounded-lg border text-sm transition-all flex items-center gap-2 ${active ? "border-cyan bg-cyan/10 text-cyan" : "border-border bg-secondary hover:border-cyan/50"}`}>
                          <span className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${active ? "bg-cyan border-cyan" : "border-border"}`}>
                            {active && <Check className="h-3 w-3 text-[oklch(0.15_0.04_255)]" />}
                          </span>
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">{allSymptoms.length} symptoms available from the ML model</p>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Medical History ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                ["Diabetes", diabetes, setDiabetes],
                ["Hypertension", hypertension, setHypertension],
                ["Heart Disease", heartDisease, setHeartDisease],
                ["Asthma", asthma, setAsthma],
                ["Kidney Disease", kidneyDisease, setKidneyDisease],
              ].map(([label, val, set]: any) => (
                <button key={label} onClick={() => set(!val)} className={`px-4 py-4 rounded-xl border text-sm font-medium transition-all ${val ? "border-cyan bg-cyan/10 text-cyan glow-cyan" : "border-border bg-secondary hover:border-cyan/50"}`}>
                  {label}
                  <div className="text-xs mt-1 opacity-70">{val ? "Yes" : "No"}</div>
                </button>
              ))}
            </div>
            <Field label="Current Medications">
              <input value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="e.g., Metformin 500mg" className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-cyan outline-none" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Blood Pressure (systolic)">
                <input type="number" value={bloodPressure} onChange={(e) => setBloodPressure(+e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-cyan outline-none" />
              </Field>
              <Field label="Cholesterol (mg/dL)">
                <input type="number" value={cholesterol} onChange={(e) => setCholesterol(+e.target.value)} className="w-full px-4 py-3 rounded-lg bg-secondary border border-border focus:border-cyan outline-none" />
              </Field>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-[var(--risk-high)]">{error}</p>}

        <div className="mt-8 flex justify-between">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting} className="px-5 py-2.5 rounded-lg border border-border hover:border-cyan transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} className="px-6 py-2.5 rounded-lg bg-cyan text-[oklch(0.15_0.04_255)] font-semibold flex items-center gap-1 hover:glow-cyan transition-shadow">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="px-6 py-2.5 rounded-lg bg-cyan text-[oklch(0.15_0.04_255)] font-semibold flex items-center gap-2 hover:glow-cyan transition-shadow disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {submitting ? "Analyzing…" : "Analyze"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[["No", false], ["Yes", true]].map(([label, v]: any) => (
        <button key={label} onClick={() => onChange(v)} className={`px-4 py-3 rounded-lg border transition-all ${value === v ? "border-cyan bg-cyan/10 text-cyan" : "border-border bg-secondary hover:border-cyan/50"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}