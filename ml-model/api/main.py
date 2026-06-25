"""
main.py — FastAPI app.
Run: uvicorn api.main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
from pathlib import Path

from .schemas import PatientInput, PredictionResponse
from .predict import predict_disease, predict_cost, SYMPTOM_COLS
from .chat_schemas import ChatRequest, ChatResponse
from .chat import get_chat_response

app = FastAPI(
    title="MediPredict API",
    description="Disease prediction + treatment cost estimation",
    version="1.0.0"
)

# Allow your local dev server + live Cloudflare frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://tanstack-start-app.medipredict.workers.dev",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "MediPredict API is running"}


@app.get("/health")
def health():
    return {"status": "ok", "symptom_features": len(SYMPTOM_COLS)}


@app.get("/symptoms")
def get_symptoms():
    """Returns the ordered list of 132 symptom names for the frontend form."""
    return {"symptoms": SYMPTOM_COLS}


@app.get("/diseases")
def get_diseases():
    """Returns all 41 disease names the model can predict."""
    import json
    diseases_path = Path(__file__).parent.parent / "models" / "diseases.json"
    with open(diseases_path) as f:
        return {"diseases": json.load(f)}


@app.post("/predict", response_model=PredictionResponse)
def predict(data: PatientInput):
    """
    Main prediction endpoint.
    Accepts patient symptoms + personal info.
    Returns top 3 diseases, risk score, and cost estimate.
    """
    try:
        # Disease prediction
        diseases, risk_score = predict_disease(data.symptoms)

        # Cost estimation — based on the TOP predicted disease,
        # adjusted by the patient's profile
        top_disease_name = diseases[0]["disease"]
        cost = predict_cost(
            disease_name=top_disease_name,
            age=data.age,
            bmi=data.bmi,
            children=data.children,
            smoker=data.smoker,
            sex=data.sex,
            region=data.region
        )

        symptom_count = sum(data.symptoms)

        return {
            "top_diseases":     diseases,
            "risk_score":       risk_score,
            "estimated_cost":   cost,
            "symptom_count":    symptom_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=ChatResponse)
def chat(data: ChatRequest):
    """
    Chatbot endpoint. Accepts a user message, optional chat history,
    and optional prediction context (so it can discuss the user's
    actual results). Returns the assistant's reply.
    """
    try:
        reply = get_chat_response(data)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))