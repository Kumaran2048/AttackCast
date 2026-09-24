"""
GRU World Model — trains on CICIDS-2017 real sequences.
Saves: artifacts/models/world_model.pt + scaler.npy + metrics/baseline.json
"""

import json, os, time
import numpy as np
from pathlib import Path

DATA  = Path("data/processed")
ARTS  = Path("artifacts")
(ARTS / "models").mkdir(parents=True, exist_ok=True)
(ARTS / "metrics").mkdir(parents=True, exist_ok=True)

# ── Try PyTorch; fall back to sklearn-only if not available ──────────────────
try:
    import torch
    import torch.nn as nn
    from torch.utils.data import TensorDataset, DataLoader
    TORCH = True
    print("✓ PyTorch available — will train GRU world model")
except ImportError:
    TORCH = False
    print("⚠  PyTorch not found — training logistic regression baseline only")

from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix,
    f1_score, precision_score, recall_score
)
from sklearn.calibration import CalibratedClassifierCV

# ── Config ───────────────────────────────────────────────────────────────────
SEQ_LEN    = 20
HIDDEN     = 64
N_LAYERS   = 2
N_STATES   = 8
EPOCHS     = 15
BATCH      = 512
LR         = 1e-3
DEVICE     = "cuda" if (TORCH and torch.cuda.is_available()) else "cpu"

STATE_NAMES = [
    "Benign / Normal", "Reconnaissance",
    "Initial Access / Credential Access", "Execution / Foothold",
    "Command and Control", "Lateral Movement", "Exfiltration", "Impact",
]

# ── GRU Model ────────────────────────────────────────────────────────────────
class GRUWorldModel(nn.Module):
    def __init__(self, n_features, hidden=64, n_layers=2, n_states=8, dropout=0.3):
        super().__init__()
        self.gru = nn.GRU(n_features, hidden, n_layers,
                          batch_first=True, dropout=dropout if n_layers > 1 else 0)
        self.head = nn.Sequential(
            nn.LayerNorm(hidden),
            nn.Linear(hidden, hidden // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden // 2, n_states),
        )

    def forward(self, x):
        out, _ = self.gru(x)
        return self.head(out[:, -1, :])  # last step


def load_data():
    print("[1/5] Loading processed sequences...")
    X_tr = np.load(DATA / "X_train.npy")
    y_tr = np.load(DATA / "y_train.npy")
    X_va = np.load(DATA / "X_val.npy")
    y_va = np.load(DATA / "y_val.npy")
    X_te = np.load(DATA / "X_test.npy")
    y_te = np.load(DATA / "y_test.npy")
    print(f"   Train {X_tr.shape}  Val {X_va.shape}  Test {X_te.shape}")
    return X_tr, y_tr, X_va, y_va, X_te, y_te


def scale(X_tr, X_va, X_te):
    """Normalise per-feature across time steps using training statistics."""
    print("[2/5] Normalising features...")
    n, t, f = X_tr.shape
    scaler = StandardScaler()
    X_tr_2d = scaler.fit_transform(X_tr.reshape(-1, f))
    X_va_2d = scaler.transform(X_va.reshape(-1, f))
    X_te_2d = scaler.transform(X_te.reshape(-1, f))
    np.save(ARTS / "models" / "scaler_mean.npy", scaler.mean_)
    np.save(ARTS / "models" / "scaler_scale.npy", scaler.scale_)
    return (
        X_tr_2d.reshape(n, t, f).astype(np.float32),
        X_va_2d.reshape(len(X_va), t, f).astype(np.float32),
        X_te_2d.reshape(len(X_te), t, f).astype(np.float32),
        scaler,
    )


def train_gru(X_tr, y_tr, X_va, y_va, n_features):
    print(f"[3/5] Training GRU on {DEVICE}  ({EPOCHS} epochs) ...")
    model = GRUWorldModel(n_features, HIDDEN, N_LAYERS, N_STATES).to(DEVICE)
    opt   = torch.optim.Adam(model.parameters(), lr=LR)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS)
    crit  = nn.CrossEntropyLoss()

    ds_tr = TensorDataset(torch.from_numpy(X_tr), torch.from_numpy(y_tr))
    dl_tr = DataLoader(ds_tr, batch_size=BATCH, shuffle=True, num_workers=0)

    best_val_f1, best_state = 0.0, None
    history = []

    for ep in range(1, EPOCHS + 1):
        model.train(); total_loss = 0
        for xb, yb in dl_tr:
            xb, yb = xb.to(DEVICE), yb.to(DEVICE)
            opt.zero_grad()
            loss = crit(model(xb), yb)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            total_loss += loss.item() * len(xb)
        sched.step()

        # Validation
        model.eval()
        with torch.no_grad():
            xv = torch.from_numpy(X_va).to(DEVICE)
            logits = model(xv)
            preds  = logits.argmax(1).cpu().numpy()
        val_f1 = f1_score(y_va, preds, average="macro", zero_division=0)
        train_loss = total_loss / len(ds_tr)
        history.append({"epoch": ep, "train_loss": round(train_loss, 4), "val_macro_f1": round(val_f1, 4)})
        print(f"   Ep {ep:02d}/{EPOCHS}  loss={train_loss:.4f}  val_f1={val_f1:.4f}")

        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_state = {k: v.cpu() for k, v in model.state_dict().items()}

    model.load_state_dict(best_state)
    torch.save({"model_state": best_state,
                "n_features": n_features,
                "hidden": HIDDEN, "n_layers": N_LAYERS, "n_states": N_STATES},
               ARTS / "models" / "world_model.pt")
    print(f"   ✓ Best val macro-F1 = {best_val_f1:.4f} → saved world_model.pt")
    return model, history


def evaluate(model_or_none, X_te, y_te, X_tr_flat, y_tr, X_te_flat, scaler):
    print("[4/5] Evaluating on held-out test set...")
    results = {}

    # ── Logistic Regression baseline (always runs) ─────────────────────────
    print("   Training logistic regression baseline...")
    lr_clf = LogisticRegression(max_iter=1000, C=1.0, solver="lbfgs",
                                multi_class="multinomial", n_jobs=-1)
    lr_clf.fit(X_tr_flat, y_tr)
    lr_preds = lr_clf.predict(X_te_flat)
    results["lr"] = {
        "macro_f1":   round(f1_score(y_te, lr_preds, average="macro", zero_division=0), 4),
        "macro_prec": round(precision_score(y_te, lr_preds, average="macro", zero_division=0), 4),
        "macro_rec":  round(recall_score(y_te, lr_preds, average="macro", zero_division=0), 4),
        "confusion":  confusion_matrix(y_te, lr_preds, labels=list(range(N_STATES))).tolist(),
    }
    print(f"   LR  macro-F1 = {results['lr']['macro_f1']}")

    # ── GRU evaluation ──────────────────────────────────────────────────────
    if model_or_none is not None:
        import torch
        model_or_none.eval()
        with torch.no_grad():
            xv  = torch.from_numpy(X_te).to(DEVICE)
            # chunk to avoid OOM
            all_preds = []
            for i in range(0, len(xv), 2048):
                all_preds.append(model_or_none(xv[i:i+2048]).argmax(1).cpu().numpy())
        gru_preds = np.concatenate(all_preds)
        results["gru"] = {
            "macro_f1":   round(f1_score(y_te, gru_preds, average="macro", zero_division=0), 4),
            "macro_prec": round(precision_score(y_te, gru_preds, average="macro", zero_division=0), 4),
            "macro_rec":  round(recall_score(y_te, gru_preds, average="macro", zero_division=0), 4),
            "confusion":  confusion_matrix(y_te, gru_preds, labels=list(range(N_STATES))).tolist(),
        }
        print(f"   GRU macro-F1 = {results['gru']['macro_f1']}")
    else:
        results["gru"] = {"macro_f1": None, "note": "PyTorch not installed"}

    # Per-state F1
    per_class = {}
    for i, name in enumerate(STATE_NAMES):
        mask = y_te == i
        if mask.sum() > 0:
            per_class[name] = round(float(f1_score(y_te, lr_preds, labels=[i], average="micro", zero_division=0)), 4)
        else:
            per_class[name] = None
    results["per_state_f1_lr"] = per_class

    return results


def compute_real_transition_matrix():
    """Load the empirically computed transition matrix from ingestion."""
    T_path = DATA / "transition_matrix.npy"
    if T_path.exists():
        return np.load(T_path).tolist()
    return None


def main():
    print("=" * 60)
    print("AttackCast — GRU World Model Training")
    print("=" * 60)

    X_tr, y_tr, X_va, y_va, X_te, y_te = load_data()
    X_tr_s, X_va_s, X_te_s, scaler = scale(X_tr, X_va, X_te)
    n_features = X_tr_s.shape[2]

    # Flat versions for LR baseline (use last time step features)
    X_tr_flat = X_tr_s[:, -1, :]
    X_te_flat = X_te_s[:, -1, :]

    # Train GRU
    if TORCH:
        model, history = train_gru(X_tr_s, y_tr, X_va_s, y_va, n_features)
    else:
        model, history = None, []

    # Evaluate
    metrics = evaluate(model, X_te_s, y_te, X_tr_flat, y_tr, X_te_flat, scaler)

    # Add transition matrix
    T = compute_real_transition_matrix()

    # Build full baseline.json for the API
    print("[5/5] Saving metrics...")
    baseline = {
        "dataset": "CICIDS-2017 (real, Kaggle: ericanacletoribeiro/cicids2017-cleaned-and-preprocessed)",
        "n_test_samples": int(len(y_te)),
        "state_names": STATE_NAMES,
        "models": {
            "logistic_regression": metrics["lr"],
            "gru_world_model":     metrics.get("gru", {}),
        },
        "per_state_f1": metrics["per_state_f1_lr"],
        "real_transition_matrix": T,
        "training_history": history,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(ARTS / "metrics" / "baseline.json", "w") as f:
        json.dump(baseline, f, indent=2)

    print(f"\n✅ Done! Results saved to artifacts/metrics/baseline.json")
    print(f"   LR  macro-F1 : {metrics['lr']['macro_f1']}")
    if metrics.get("gru", {}).get("macro_f1"):
        print(f"   GRU macro-F1 : {metrics['gru']['macro_f1']}")
    print("\nRun the backend: python -m uvicorn backend.app.main:app --reload")


if __name__ == "__main__":
    main()
