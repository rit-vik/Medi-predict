"""
train.py — Run this once to train and save both models.
Usage: python train.py
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, r2_score
import joblib, os, json

os.makedirs("models", exist_ok=True)

# ─────────────────────────────────────────────────────────
# 1. DISEASE CLASSIFIER (Training.csv + Testing.csv)
# ─────────────────────────────────────────────────────────
print("Training Disease Classifier...")

train = pd.read_csv("data/raw/Training.csv")
test  = pd.read_csv("data/raw/Testing.csv")

# Clean column names (strip whitespace)
train.columns = train.columns.str.strip()
test.columns  = test.columns.str.strip()

# Drop Lovable junk column if present
train = train.drop(columns=["Unnamed: 133"], errors="ignore")

# All columns except prognosis are symptom features (132 total)
SYMPTOM_COLS = [c for c in train.columns if c != "prognosis"]

X_train = train[SYMPTOM_COLS].fillna(0).astype(int)
X_test  = test[SYMPTOM_COLS].fillna(0).astype(int)

# Encode disease labels
le = LabelEncoder()
y_train = le.fit_transform(train["prognosis"].str.strip())
y_test  = le.transform(test["prognosis"].str.strip())

clf = RandomForestClassifier(
    n_estimators=200,
    random_state=42,
    n_jobs=-1
)
clf.fit(X_train, y_train)

acc = accuracy_score(y_test, clf.predict(X_test))
print(f"  ✅ Accuracy on test set: {acc:.2%}")   # expect ~97%

# Save models
joblib.dump(clf,          "models/disease_classifier.pkl")
joblib.dump(le,           "models/label_encoder.pkl")
joblib.dump(SYMPTOM_COLS, "models/symptom_columns.pkl")

# Save disease list as JSON (used by frontend)
with open("models/diseases.json", "w") as f:
    json.dump(list(le.classes_), f, indent=2)

print(f"  Saved: disease_classifier.pkl, label_encoder.pkl")
print(f"  Diseases covered: {len(le.classes_)}")

# ─────────────────────────────────────────────────────────
# 2. COST REGRESSOR (insurance.csv)
# ─────────────────────────────────────────────────────────
print("\nTraining Cost Regressor...")

ins = pd.read_csv("data/raw/insurance.csv")

# Encode categorical columns
ins["smoker_enc"] = (ins["smoker"] == "yes").astype(int)
ins["sex_enc"]    = (ins["sex"] == "male").astype(int)
region_dummies    = pd.get_dummies(ins["region"], prefix="region")
ins = pd.concat([ins, region_dummies], axis=1)

COST_FEATURES = [
    "age", "bmi", "children", "smoker_enc", "sex_enc",
    "region_northwest", "region_southeast", "region_southwest"
]
COST_FEATURES = [c for c in COST_FEATURES if c in ins.columns]

Xc = ins[COST_FEATURES]
yc = ins["charges"]

reg = GradientBoostingRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=4,
    random_state=42
)
reg.fit(Xc, yc)

r2 = r2_score(yc, reg.predict(Xc))
print(f"  ✅ R² Score: {r2:.3f}")   # expect ~0.937

joblib.dump(reg,           "models/cost_regressor.pkl")
joblib.dump(COST_FEATURES, "models/cost_feature_columns.pkl")
print(f"  Saved: cost_regressor.pkl")

print("\n🎉 All models trained and saved to /models")
