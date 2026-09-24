# AttackCast — Complete Full-Stack Implementation

AI-based network attack forecasting demo for SIH26153.

## Stack
Backend: Python 3.11, FastAPI, Uvicorn, Pydantic v2, SQLite/Parquet, Scapy, scikit-learn, PyTorch, SHAP.
Frontend: React 18, TypeScript, Vite.

## Important honesty rule
The project never invents measured metrics. If no real CIC-IDS-2018/CTU-13 data is present, `make data` creates a clearly labelled **synthetic development dataset** so every phase can be exercised locally. Real dataset metrics are only produced after real data is supplied.

## Quick start

### Backend
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python scripts/make_dataset.py --synthetic --rows 4000
python -m backend.ml.models.train --config configs/default.yaml
python -m backend.ml.eval.metrics
python -m uvicorn backend.app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm run dev
```

### Tests
```bash
pytest -q
```

### One command
```bash
python run.py
```
This starts FastAPI. Build the frontend first with `cd frontend && npm install && npm run build`; FastAPI serves `frontend/dist`.

## Real data
Place CIC-IDS-2018 CSVs under `data/raw/cic2018/` and CTU-13 `.binetflow` files under `data/raw/ctu13/`.
Then run:
```bash
python scripts/make_dataset.py --real
```

Do not claim the resulting metrics are real-world performance unless they were generated from the real files.

## Main features
- Canonical flow schema
- CIC/CTU/PCAP ingestion
- Window features
- State/ATT&CK mapping and heuristic states
- Temporal split
- Logistic regression + Markov baseline
- PyTorch GRU world model
- K-step Monte Carlo rollout
- Temperature calibration
- SHAP/feature explanations
- Lead-time and false-alarm metrics
- What-if counterfactual replay
- Advisory countermeasures
- Cross-dataset evaluation hooks
- PCAP upload
- WebSocket replay
- React security-console dashboard
- Host graph
- Model/data/API documentation
- Offline check
