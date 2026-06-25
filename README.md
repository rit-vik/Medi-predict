<h1 align="center">
  <br>
  MediPredict AI
  <br>
</h1>

<p align="center">
  <strong>Predict. Prepare. Prevent.</strong><br>
  AI-powered disease risk analysis and treatment cost estimation — built for proactive health decisions.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TanStack_Router-1.x-FF4154?style=for-the-badge&logo=react-query&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
</p>

---

##  Overview

**MediPredict AI** is a full-stack clinical AI platform that empowers users to make proactive health decisions. It combines a sleek, dark-themed React frontend with a FastAPI-powered Python ML backend to deliver:

-  **Disease Risk Prediction** — Analyzes 132 symptoms using a RandomForest classifier trained on clinical data to predict the top 3 likely diseases with probability scores
-  **Treatment Cost Estimation** — Estimates medical expenses based on patient profile (age, BMI, region, smoking status) using a GradientBoosting regressor
-  **AI Medical Chat Assistant** — Contextual chatbot that discusses your specific results and offers personalized health recommendations
-  **Assessment History** — All past health assessments are saved via Supabase and accessible from your dashboard

---

##  Architecture

```
Medi-predict-AI/
├── src/                        # React frontend (TanStack Start + Vite)
│   ├── routes/
│   │   ├── index.tsx           # Landing page with scroll-driven video background
│   │   └── _authenticated/
│   │       ├── assessment.tsx  # 3-step health assessment form
│   │       ├── results.$id.tsx # Prediction results + cost breakdown
│   │       └── history.tsx     # Past assessments dashboard
│   ├── components/
│   │   ├── Navbar.tsx          # Navigation bar
│   │   ├── ChatWidget.tsx      # AI chatbot widget
│   │   └── EcgLine.tsx         # Animated ECG SVG component
│   └── lib/                    # API clients & Supabase helpers
│
├── ml-model/                   # Python ML backend
│   ├── api/
│   │   ├── main.py             # FastAPI app entry point
│   │   ├── predict.py          # Disease + cost prediction logic
│   │   ├── chat.py             # AI chatbot handler (Google Gemini)
│   │   └── schemas.py          # Pydantic request/response models
│   ├── train.py                # Model training script
│   ├── data/raw/               # Training datasets (CSV)
│   ├── models/                 # Saved .pkl model files (generated)
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Docker container config
│
└── supabase/                   # Database schema & migrations
```

---

##  Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| Bun or npm | latest |
| Python | 3.11+ |
| Git | latest |

---

### 1. Clone the Repository

```bash
git clone https://github.com/rit-vik/Medi-predict.git
cd Medi-predict
```

---

### 2. Frontend Setup

```bash
# Install dependencies
npm install
# or
bun install
```

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
# or
bun dev
```

The frontend will be available at `http://localhost:3000`.

---

### 3. ML Backend Setup

```bash
cd ml-model
```

**Option A: Run with Python directly**

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create your ML .env (see ml-model/.env.example)
cp .env.example .env

# Train the models (only needed once)
python train.py

# Start the API server
uvicorn api.main:app --reload --port 8000
```

**Option B: Run with Docker**

```bash
cd ml-model
docker build -t medipredict-api .
docker run -p 8000:8000 medipredict-api
```

The ML API will be available at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

---

### 4. Train the Models

The `train.py` script trains two models from datasets in `ml-model/data/raw/`:

| Dataset | Purpose |
|---------|---------|
| `Training.csv` + `Testing.csv` | Disease classifier (132 symptoms → 41 diseases) |
| `insurance.csv` | Treatment cost regressor |

```bash
cd ml-model
python train.py
```

Expected output:
```
Training Disease Classifier...
  ✅ Accuracy on test set: ~97%
Training Cost Regressor...
  ✅ R² Score: ~0.937
 All models trained and saved to /models
```

---

##  ML Models

### Disease Classifier
- **Algorithm**: Random Forest Classifier (200 estimators)
- **Input**: 132 binary symptom features
- **Output**: Top 3 predicted diseases with probability scores
- **Accuracy**: ~97% on test set
- **Diseases covered**: 41 conditions

### Treatment Cost Regressor
- **Algorithm**: Gradient Boosting Regressor (300 estimators)
- **Input**: Age, BMI, children, smoker status, sex, region
- **Output**: Estimated treatment cost in USD
- **R² Score**: ~0.937

---

##  API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/health` | API status + feature count |
| `GET` | `/symptoms` | List of all 132 symptoms |
| `GET` | `/diseases` | List of all 41 predictable diseases |
| `POST` | `/predict` | Main prediction endpoint |
| `POST` | `/chat` | AI chatbot endpoint |

### Example `/predict` Request

```json
{
  "symptoms": [0, 1, 0, 1, ...],
  "age": 35,
  "bmi": 24.5,
  "children": 2,
  "smoker": false,
  "sex": "male",
  "region": "southeast"
}
```

---

##  Environment Variables

### Frontend (root `.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |
| `VITE_API_URL` | URL of the ML backend API |

### ML Backend (`ml-model/.env`)

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key (for the chat feature) |

>  **Never commit `.env` files.** Copy `.env.example` and fill in your own credentials.

---

##  Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TanStack Router | File-based routing |
| TanStack Query | Server state management |
| Tailwind CSS v4 | Utility-first styling |
| Radix UI | Accessible component primitives |
| Vite 7 | Build tool & dev server |
| Supabase | Auth + PostgreSQL database |

### ML Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | REST API framework |
| scikit-learn | RandomForest classifier |
| XGBoost | Gradient boosting |
| Pandas / NumPy | Data processing |
| joblib | Model serialization |
| Google Gemini | AI chat assistant |
| Docker | Containerization |

---

##  Screenshots

### Landing Page
> Scroll-driven video background with animated ECG line and glassmorphism cards.

### Health Assessment
> 3-step wizard: Personal Info → Symptom Selection (132 symptoms, searchable) → Medical History.

### Results Page
> Top disease predictions with risk scores, estimated treatment cost breakdown, and AI recommendations.

---

##  Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

##  Disclaimer

MediPredict AI is intended for **educational and informational purposes only**. It is **not** a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider for medical decisions.

---

##  License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Made by <a href="https://github.com/rit-vik">rit-vik</a> and <a href="https://github.com/aarushamishra7-byte">aarushamishra7-byte</a>
</p>
