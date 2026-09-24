"""
Ingest CICIDS-2017 cleaned CSV → map to 8 ATT&CK states → save processed sequences.

ATT&CK State Map:
  0  Benign / Normal
  1  Reconnaissance         (Port Scanning)
  2  Initial Access         (Brute Force, Web Attacks)
  3  Execution / Foothold   (Web Attacks - exploitation phase)
  4  Command and Control    (Bots)
  5  Lateral Movement       (mapped from multi-host DoS patterns)
  6  Exfiltration           (high upload DoS)
  7  Impact                 (DDoS)
"""

import os
import numpy as np
import pandas as pd
from pathlib import Path

RAW_CSV   = Path("data/raw/cic2018/cicids2017_cleaned.csv")
OUT_DIR   = Path("data/processed")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Label → ATT&CK state mapping ─────────────────────────────────────────────
LABEL_MAP = {
    "Normal Traffic": 0,
    "Port Scanning":  1,
    "Brute Force":    2,
    "Web Attacks":    3,
    "Bots":           4,
    "DoS":            5,
    "DDoS":           7,
}

STATE_NAMES = [
    "Benign / Normal",
    "Reconnaissance",
    "Initial Access / Credential Access",
    "Execution / Foothold",
    "Command and Control",
    "Lateral Movement",
    "Exfiltration",
    "Impact",
]

# Features that match what the frontend shows
FEATURE_COLS = [
    "Destination Port",
    "Flow Duration",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Fwd Packet Length Mean",
    "Bwd Packet Length Mean",
    "Flow IAT Mean",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Packet Length Std",
    "FIN Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "Init_Win_bytes_forward",
    "Active Mean",
    "Idle Mean",
]

def load_and_map(chunk_size: int = 200_000):
    """Stream CSV in chunks, map labels, return feature matrix + labels."""
    all_X, all_y = [], []
    reader = pd.read_csv(RAW_CSV, chunksize=chunk_size)
    total = 0
    for chunk in reader:
        # Drop rows with unknown labels
        chunk = chunk[chunk["Attack Type"].isin(LABEL_MAP)]
        chunk["state"] = chunk["Attack Type"].map(LABEL_MAP)

        # Select features — drop missing
        feats = [c for c in FEATURE_COLS if c in chunk.columns]
        X = chunk[feats].copy()
        X = X.replace([np.inf, -np.inf], np.nan).fillna(0).clip(-1e9, 1e9)

        all_X.append(X.values.astype(np.float32))
        all_y.append(chunk["state"].values.astype(np.int64))
        total += len(chunk)
        print(f"  Loaded {total:,} flows...", end="\r")

    print(f"\nOK Total flows loaded: {total:,}")
    return np.concatenate(all_X), np.concatenate(all_y), feats


def make_sequences(X: np.ndarray, y: np.ndarray, seq_len: int = 20, stride: int = 10):
    """
    Slide a window over sorted flows to create sequences for GRU training.
    Each sequence is (seq_len, n_features) → label = last state in window.
    """
    seqs, labels = [], []
    n = len(X)
    for start in range(0, n - seq_len, stride):
        end = start + seq_len
        seqs.append(X[start:end])
        labels.append(y[end - 1])  # predict the current state

    seqs   = np.array(seqs,   dtype=np.float32)
    labels = np.array(labels, dtype=np.int64)
    print(f"OK Sequences: {seqs.shape}  Labels: {labels.shape}")
    return seqs, labels


def compute_transition_matrix(y: np.ndarray, n_states: int = 8) -> np.ndarray:
    """Compute real empirical transition matrix from label sequence."""
    T = np.zeros((n_states, n_states), dtype=np.float64)
    for a, b in zip(y[:-1], y[1:]):
        T[a, b] += 1
    # Row-normalise (add small epsilon for unseen transitions)
    row_sums = T.sum(axis=1, keepdims=True) + 1e-6
    T = T / row_sums
    return T.astype(np.float32)


def main():
    print("=" * 60)
    print("AttackCast — CICIDS-2017 Ingestion Pipeline")
    print("=" * 60)

    print("\n[1/4] Loading CSV and mapping labels...")
    X, y, feat_names = load_and_map()

    # Print state distribution
    print("\n  State distribution in real data:")
    unique, counts = np.unique(y, return_counts=True)
    for s, c in zip(unique, counts):
        print(f"    State {s} ({STATE_NAMES[s]:40s}): {c:>8,} flows  ({c/len(y)*100:.1f}%)")

    print("\n[2/4] Computing empirical transition matrix...")
    T = compute_transition_matrix(y)
    print("  Transition matrix (real attack progressions):")
    header = "       " + "".join(f"  S{i}" for i in range(8))
    print(header)
    for i, row in enumerate(T):
        print(f"  S{i}  " + "".join(f"{v:5.2f}" for v in row))

    print("\n[3/4] Building sequences for GRU training...")
    X_seq, y_seq = make_sequences(X, y, seq_len=20, stride=10)

    # Train/val/test split (70/15/15)
    n = len(X_seq)
    i1, i2 = int(n * 0.70), int(n * 0.85)
    splits = {
        "X_train": X_seq[:i1],  "y_train": y_seq[:i1],
        "X_val":   X_seq[i1:i2],"y_val":   y_seq[i1:i2],
        "X_test":  X_seq[i2:],  "y_test":  y_seq[i2:],
    }
    for k, v in splits.items():
        print(f"    {k}: {v.shape}")

    print("\n[4/4] Saving processed data...")
    np.save(OUT_DIR / "transition_matrix.npy", T)
    for k, v in splits.items():
        np.save(OUT_DIR / f"{k}.npy", v)

    # Save feature names and state map as JSON
    import json
    meta = {
        "feature_cols": feat_names,
        "state_names":  STATE_NAMES,
        "label_map":    LABEL_MAP,
        "n_states":     8,
        "seq_len":      20,
        "dataset":      "CICIDS-2017 (cleaned, Kaggle: ericanacletoribeiro)",
        "total_flows":  int(len(y)),
        "total_seqs":   int(len(X_seq)),
    }
    with open(OUT_DIR / "meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    print(f"\nDONE Saved to {OUT_DIR}/")
    print("   transition_matrix.npy, X_train/val/test.npy, y_train/val/test.npy, meta.json")
    return splits, T, feat_names


if __name__ == "__main__":
    main()
