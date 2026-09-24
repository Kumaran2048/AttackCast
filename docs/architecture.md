# Architecture

```text
CIC/CTU/PCAP
   ↓
Canonical flow schema
   ↓
30-second entity windows
   ↓
Behavioural features + state mapping
   ↓
Temporal/scenario split
   ├── Logistic Regression baseline
   ├── Markov transition baseline
   └── GRU + attention world model
             ↓
        K-step rollout
             ↓
 Calibration + uncertainty + SHAP
             ↓
 FastAPI REST/WebSocket
             ↓
 React security console
```

## Phase 0 Risk Decisions & Stack Architecture
- **Frontend Stack:** Proceeding with Vite + React + Tailwind CSS + Recharts instead of Expo/React Native. This accelerates UI development for data-heavy charting, which is often brittle on pure React Native Web.
- **Graph Neural Network (Extra A):** Will attempt to use PyTorch Geometric (PyG). If offline distribution is blocked due to native extensions, we will implement a pure PyTorch message-passing layer as a fallback.
- **Feedback Loop (Extra B):** Handled via WebSocket and stateful REST endpoints updating per-session calibration tables, without modifying the base trained weights.
