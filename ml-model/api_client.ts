// src/lib/api.ts
// Drop this into your TanStack Start project src/lib/ folder

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────

export interface DiseaseResult {
  disease: string;
  probability: number;    // 0–100
  severity: "Low" | "Medium" | "High";
}

export interface CostBreakdown {
  consultation: number;
  medication: number;
  hospitalization: number;
  tests: number;
}

export interface CostEstimate {
  min_inr: number;
  max_inr: number;
  breakdown: CostBreakdown;
}

export interface PredictionResponse {
  top_diseases: DiseaseResult[];
  risk_score: number;
  estimated_cost: CostEstimate;
  symptom_count: number;
}

// Patient form data — matches the API's PatientInput schema
export interface PatientInput {
  age: number;
  bmi: number;
  children: number;
  smoker: number;           // 0 or 1
  sex: number;              // 0=female, 1=male
  region: string;           // northwest | southeast | southwest | northeast
  symptoms: number[];       // array of 132 binary values
}

// ── Fetch symptom column names from API ──────────────────
export async function getSymptomList(): Promise<string[]> {
  const res = await fetch(`${API_URL}/symptoms`);
  if (!res.ok) throw new Error("Failed to load symptoms");
  const data = await res.json();
  return data.symptoms as string[];
}

// ── Main prediction call ──────────────────────────────────
export async function getPrediction(
  input: PatientInput
): Promise<PredictionResponse> {
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Prediction request failed");
  }

  return res.json() as Promise<PredictionResponse>;
}

// ── Health check ─────────────────────────────────────────
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ── Helper: format INR ────────────────────────────────────
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
