from pydantic import BaseModel, Field, validator
from typing import List, Dict

class PatientInput(BaseModel):
    # Personal info
    age: int = Field(..., ge=1, le=120)
    bmi: float = Field(..., ge=10.0, le=60.0)
    children: int = Field(default=0, ge=0, le=10)
    smoker: int = Field(..., ge=0, le=1)      # 0=no, 1=yes
    sex: int = Field(default=0, ge=0, le=1)   # 0=female, 1=male
    region: str = Field(default="southeast")  # northwest/southeast/southwest/northeast

    # 132 symptom binary flags — must match SYMPTOM_COLS order exactly
    symptoms: List[int] = Field(..., min_items=132, max_items=132)

    @validator("symptoms", each_item=True)
    def binary_only(cls, v):
        assert v in (0, 1), "Each symptom must be 0 or 1"
        return v


class DiseaseResult(BaseModel):
    disease: str
    probability: float          # 0–100
    severity: str               # Low / Medium / High


class CostBreakdown(BaseModel):
    consultation: int
    medication: int
    hospitalization: int
    tests: int


class CostEstimate(BaseModel):
    min_inr: int
    max_inr: int
    breakdown: CostBreakdown


class PredictionResponse(BaseModel):
    top_diseases: List[DiseaseResult]
    risk_score: float           # 0–100
    estimated_cost: CostEstimate
    symptom_count: int          # how many symptoms were active
