"""
predict.py — Loads saved models and runs predictions.

NOTE ON COST ESTIMATION:
The original approach ran the Kaggle insurance.csv regression model
(trained on US ANNUAL INSURANCE PREMIUMS, $1,121–$63,770) and converted
USD→INR directly. This produced unrealistic costs (₹5–11 lakh) because
US insurance premiums and Indian out-of-pocket treatment costs are
fundamentally different things — not just a currency conversion away
from each other.

This version replaces that with a disease-specific base cost table,
calibrated to approximate real-world Indian treatment costs, adjusted
by severity and a smaller continuous factor from age/BMI/smoking (using
the trained regression model's RELATIVE risk score, not its raw INR
output). This gives realistic, explainable numbers for your project.
"""

import joblib
import numpy as np
from pathlib import Path

# ── Load models once at startup ───────────────────────────
BASE = Path(__file__).parent.parent / "models"

clf           = joblib.load(BASE / "disease_classifier.pkl")
le            = joblib.load(BASE / "label_encoder.pkl")
SYMPTOM_COLS  = joblib.load(BASE / "symptom_columns.pkl")

reg           = joblib.load(BASE / "cost_regressor.pkl")
COST_FEATURES = joblib.load(BASE / "cost_feature_columns.pkl")

# Reference values from the training data, used only to turn the
# regressor's raw USD output into a 0–1 RELATIVE risk multiplier
# (e.g. "this patient's profile costs 1.4x the average smoker"),
# rather than using the raw dollar figure directly.
_TRAIN_CHARGES_MEAN = 13270.0   # mean of insurance.csv "charges"


# ── Severity map for the 41 diseases ─────────────────────
SEVERITY = {
    "Heart attack": "High",
    "Paralysis (brain hemorrhage)": "High",
    "AIDS": "High",
    "Tuberculosis": "High",
    "Hepatitis B": "High",
    "Hepatitis C": "High",
    "Hepatitis D": "High",
    "Alcoholic hepatitis": "High",
    "Pneumonia": "High",
    "Dengue": "High",
    "Malaria": "High",
    "Typhoid": "High",
    "Jaundice": "High",
    "Chronic cholestasis": "High",
    "Diabetes ": "High",
    "Hypertension ": "High",
    "Migraine": "Medium",
    "Bronchial Asthma": "Medium",
    "Gastroenteritis": "Medium",
    "GERD": "Medium",
    "Peptic ulcer diseae": "Medium",
    "hepatitis A": "Medium",
    "Hepatitis E": "Medium",
    "Hypothyroidism": "Medium",
    "Hyperthyroidism": "Medium",
    "Hypoglycemia": "Medium",
    "Cervical spondylosis": "Medium",
    "Osteoarthristis": "Medium",
    "Arthritis": "Medium",
    "Varicose veins": "Medium",
    "Urinary tract infection": "Medium",
    "Drug Reaction": "Medium",
    "(vertigo) Paroymsal  Positional Vertigo": "Medium",
    "Dimorphic hemmorhoids(piles)": "Medium",
    "Common Cold": "Low",
    "Allergy": "Low",
    "Fungal infection": "Low",
    "Chicken pox": "Low",
    "Acne": "Low",
    "Psoriasis": "Low",
    "Impetigo": "Low",
}

# ── Realistic base treatment cost ranges in INR, per disease ─────
# Sourced as rough approximations of typical Indian private-hospital
# out-of-pocket costs (consultation + tests + meds +/- hospitalization).
# These are illustrative estimates for a student project, not actuarial
# data — worth stating clearly in your report/demo.
DISEASE_COST_INR = {
    # High severity / hospitalization-heavy
    "Heart attack": (150000, 450000),
    "Paralysis (brain hemorrhage)": (200000, 600000),
    "AIDS": (50000, 200000),
    "Tuberculosis": (15000, 60000),
    "Hepatitis B": (20000, 80000),
    "Hepatitis C": (25000, 90000),
    "Hepatitis D": (25000, 90000),
    "Alcoholic hepatitis": (30000, 100000),
    "Pneumonia": (25000, 90000),
    "Dengue": (20000, 80000),
    "Malaria": (8000, 30000),
    "Typhoid": (8000, 25000),
    "Jaundice": (15000, 50000),
    "Chronic cholestasis": (20000, 70000),
    "Diabetes ": (10000, 40000),
    "Hypertension ": (5000, 20000),
    # Medium severity / outpatient-heavy with some tests
    "Migraine": (3000, 12000),
    "Bronchial Asthma": (8000, 30000),
    "Gastroenteritis": (5000, 18000),
    "GERD": (5000, 20000),
    "Peptic ulcer diseae": (8000, 25000),
    "hepatitis A": (12000, 40000),
    "Hepatitis E": (12000, 40000),
    "Hypothyroidism": (5000, 20000),
    "Hyperthyroidism": (8000, 25000),
    "Hypoglycemia": (3000, 12000),
    "Cervical spondylosis": (8000, 30000),
    "Osteoarthristis": (10000, 40000),
    "Arthritis": (10000, 35000),
    "Varicose veins": (15000, 60000),
    "Urinary tract infection": (3000, 12000),
    "Drug Reaction": (5000, 20000),
    "(vertigo) Paroymsal  Positional Vertigo": (3000, 12000),
    "Dimorphic hemmorhoids(piles)": (15000, 50000),
    # Low severity / minor outpatient
    "Common Cold": (500, 3000),
    "Allergy": (1000, 5000),
    "Fungal infection": (1000, 5000),
    "Chicken pox": (3000, 12000),
    "Acne": (1500, 8000),
    "Psoriasis": (5000, 20000),
    "Impetigo": (1500, 6000),
}

_DEFAULT_RANGE = (5000, 25000)  # fallback for any disease not in the table


def predict_disease(symptoms: list[int]):
    """
    symptoms: list of 132 binary ints aligned to SYMPTOM_COLS
    Returns: (top3_list, risk_score_float)
    """
    proba = clf.predict_proba([symptoms])[0]
    top3_idx = np.argsort(proba)[-3:][::-1]

    results = []
    for idx in top3_idx:
        name = le.inverse_transform([idx])[0]
        results.append({
            "disease":     name.strip(),
            "probability": round(float(proba[idx]) * 100, 1),
            "severity":    SEVERITY.get(name, "Medium")
        })

    risk_score = round(float(max(proba)) * 100, 1)
    return results, risk_score


def _patient_relative_factor(age: int, bmi: float, children: int,
                              smoker: int, sex: int, region: str) -> float:
    """
    Uses the trained regressor only to get a RELATIVE cost factor
    (this patient vs. an average patient), not an absolute INR value.
    Clamped to a reasonable range so outliers don't distort estimates.
    """
    region_nw = int(region == "northwest")
    region_se = int(region == "southeast")
    region_sw = int(region == "southwest")

    feature_map = {
        "age": age,
        "bmi": bmi,
        "children": children,
        "smoker_enc": smoker,
        "sex_enc": sex,
        "region_northwest": region_nw,
        "region_southeast": region_se,
        "region_southwest": region_sw,
    }
    features = [feature_map.get(c, 0) for c in COST_FEATURES]

    predicted_usd = float(reg.predict([features])[0])
    factor = predicted_usd / _TRAIN_CHARGES_MEAN

    # Clamp: smoker/older patients might cost more, but never let it
    # swing more than +/-50% on top of the disease's base cost.
    return max(0.7, min(1.5, factor))


def predict_cost(disease_name: str, age: int, bmi: float, children: int,
                 smoker: int, sex: int, region: str):
    """
    Returns a realistic INR cost estimate for the predicted disease,
    lightly adjusted by the patient's profile (age/BMI/smoking) using
    the regression model's RELATIVE output as a multiplier — not its
    raw USD prediction directly.
    """
    base_min, base_max = DISEASE_COST_INR.get(disease_name.strip(), _DEFAULT_RANGE)

    factor = _patient_relative_factor(age, bmi, children, smoker, sex, region)

    adj_min = int(base_min * factor)
    adj_max = int(base_max * factor)

    # Simple proportional breakdown across typical cost categories
    total = (adj_min + adj_max) / 2
    return {
        "min_inr": adj_min,
        "max_inr": adj_max,
        "breakdown": {
            "consultation":    int(total * 0.10),
            "medication":      int(total * 0.25),
            "hospitalization": int(total * 0.45),
            "tests":           int(total * 0.20),
        }
    }