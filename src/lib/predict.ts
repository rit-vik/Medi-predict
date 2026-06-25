/**
 * predict.ts — Bridge between the assessment form and the FastAPI ML backend.
 *
 * Replaces the old mock prediction with real API calls to:
 *   GET  /symptoms  → 132 symptom column names
 *   POST /predict   → disease prediction + cost estimation
 */

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ── Types (kept compatible with results page) ────────────────

export interface Assessment {
  id: string;
  date: string;
  personal: {
    age: number;
    gender: string;
    bmi: number;
    smoking: boolean;
    alcohol: string;
    region: string;
    children: number;
  };
  symptoms: string[];
  history: {
    diabetes: boolean;
    hypertension: boolean;
    heartDisease: boolean;
    asthma: boolean;
    kidneyDisease: boolean;
    medications: string;
    bloodPressure: number;
    cholesterol: number;
  };
  result: PredictionResult;
}

export interface PredictionResult {
  riskScore: number;
  diseases: { name: string; probability: number; severity: "Low" | "Medium" | "High" }[];
  cost: { min: number; max: number; breakdown: { label: string; amount: number }[] };
  actions: string[];
}

// ── Raw API response types ───────────────────────────────────

interface APIDiseaseResult {
  disease: string;
  probability: number;
  severity: "Low" | "Medium" | "High";
}

interface APICostEstimate {
  min_inr: number;
  max_inr: number;
  breakdown: {
    consultation: number;
    medication: number;
    hospitalization: number;
    tests: number;
  };
}

interface APIPredictionResponse {
  top_diseases: APIDiseaseResult[];
  risk_score: number;
  estimated_cost: APICostEstimate;
  symptom_count: number;
}

// ── Symptom list cache ───────────────────────────────────────

let _symptomCache: string[] | null = null;

/**
 * Fetches the 132 symptom column names from the ML API.
 * Results are cached in memory after first call.
 */
export async function fetchSymptoms(): Promise<string[]> {
  if (_symptomCache) return _symptomCache;

  const res = await fetch(`${API_URL}/symptoms`);
  if (!res.ok) throw new Error("Failed to load symptoms from API");
  const data = await res.json();
  _symptomCache = (data.symptoms as string[]).map(formatSymptomName);
  return _symptomCache;
}

/**
 * Clean up symptom column names for display.
 * "itching" → "Itching", "skin_rash" → "Skin Rash"
 */
function formatSymptomName(raw: string): string {
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Get the raw (unformatted) symptom names from the API for building the binary vector.
 */
async function fetchRawSymptoms(): Promise<string[]> {
  const res = await fetch(`${API_URL}/symptoms`);
  if (!res.ok) throw new Error("Failed to load symptoms from API");
  const data = await res.json();
  return data.symptoms as string[];
}

// ── Main prediction call ─────────────────────────────────────

/**
 * Calls the real ML API with the user's form data.
 * Returns a PredictionResult matching the shape the results page expects.
 */
export async function predict(
  input: Omit<Assessment, "id" | "date" | "result">
): Promise<PredictionResult> {
  const { personal, symptoms, history } = input;

  // Fetch raw symptom column names to build binary vector
  const rawSymptoms = await fetchRawSymptoms();

  // Build the 132-element binary vector:
  // For each raw symptom name, check if the user selected the formatted version
  const formattedToRaw = rawSymptoms.map((raw) => ({
    raw,
    formatted: formatSymptomName(raw),
  }));

  const symptomVector = formattedToRaw.map((s) =>
    symptoms.includes(s.formatted) ? 1 : 0
  );

  // Map frontend form fields to API input
  const apiInput = {
    age: personal.age,
    bmi: personal.bmi,
    children: personal.children ?? 0,
    smoker: personal.smoking ? 1 : 0,
    sex: personal.gender === "Male" ? 1 : 0,
    region: (personal.region ?? "southeast").toLowerCase(),
    symptoms: symptomVector,
  };

  // Call the ML API
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apiInput),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Prediction request failed");
  }

  const apiResponse: APIPredictionResponse = await res.json();

  // Transform API response → PredictionResult shape the frontend expects
  const diseases = apiResponse.top_diseases.map((d) => ({
    name: d.disease,
    probability: d.probability,
    severity: d.severity as "Low" | "Medium" | "High",
  }));

  const cost = {
    min: apiResponse.estimated_cost.min_inr,
    max: apiResponse.estimated_cost.max_inr,
    breakdown: [
      { label: "Consultation", amount: apiResponse.estimated_cost.breakdown.consultation },
      { label: "Medication", amount: apiResponse.estimated_cost.breakdown.medication },
      { label: "Hospitalization", amount: apiResponse.estimated_cost.breakdown.hospitalization },
      { label: "Diagnostic Tests", amount: apiResponse.estimated_cost.breakdown.tests },
    ],
  };

  // Generate recommended actions client-side (API doesn't return these)
  const riskScore = apiResponse.risk_score;
  const actions = generateActions(personal, history, riskScore);

  return { riskScore, diseases, cost, actions };
}

// ── Client-side action generation ────────────────────────────

function generateActions(
  personal: Assessment["personal"],
  history: Assessment["history"],
  riskScore: number
): string[] {
  return [
    riskScore > 60
      ? "Schedule an in-person consultation with a specialist within 7 days."
      : "Book a routine check-up with your primary care physician.",
    personal.smoking || personal.alcohol === "Heavy"
      ? "Reduce smoking and alcohol consumption — both significantly elevate risk."
      : "Maintain a balanced diet rich in whole grains, vegetables, and lean protein.",
    personal.bmi > 25
      ? "Aim for 150 minutes of moderate exercise per week to improve BMI."
      : "Continue regular physical activity and monitor key vitals monthly.",
  ];
}

// ── Health check ─────────────────────────────────────────────

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ── Helpers ──────────────────────────────────────────────────

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}