import type { Assessment, PredictionResult } from "./predict";

export interface AssessmentRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  input: Omit<Assessment, "id" | "date" | "result">;
  result: PredictionResult;
  risk_score: number;
  top_condition: string | null;
  notes: string | null;
}

const STORAGE_KEY = "mp_assessments";

function getAssessmentsFromStorage(): AssessmentRow[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
}

function saveAssessmentsToStorage(assessments: AssessmentRow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assessments));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

export async function listAssessments(): Promise<AssessmentRow[]> {
  const assessments = getAssessmentsFromStorage();
  return assessments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getAssessment(id: string): Promise<AssessmentRow | null> {
  const assessments = getAssessmentsFromStorage();
  return assessments.find((a) => a.id === id) || null;
}

export async function createAssessment(
  input: Omit<Assessment, "id" | "date" | "result">,
  result: PredictionResult,
): Promise<AssessmentRow> {
  const newAssessment: AssessmentRow = {
    id: crypto.randomUUID(),
    user_id: "local_user",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    input,
    result,
    risk_score: result.riskScore,
    top_condition: result.diseases[0]?.name ?? null,
    notes: null,
  };

  const assessments = getAssessmentsFromStorage();
  assessments.push(newAssessment);
  saveAssessmentsToStorage(assessments);

  return newAssessment;
}

export async function updateAssessmentNotes(id: string, notes: string) {
  const assessments = getAssessmentsFromStorage();
  const index = assessments.findIndex((a) => a.id === id);
  if (index !== -1) {
    assessments[index].notes = notes;
    assessments[index].updated_at = new Date().toISOString();
    saveAssessmentsToStorage(assessments);
  }
}

export async function deleteAssessment(id: string) {
  let assessments = getAssessmentsFromStorage();
  assessments = assessments.filter((a) => a.id !== id);
  saveAssessmentsToStorage(assessments);
}