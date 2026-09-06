"""
train_win_predictor.py — High-Performance Logistic Regression ML Model
Trained on 2,000 synthetic deals reflecting the DealFlow360 business domain.
Uses vectorized gradient descent and L2 regularization to fit exact weights,
feature scalers, and generates the production artifact deal_win_weights.json.
"""

import os
import json
import numpy as np
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ARTIFACT_JSON = BASE_DIR / "deal_win_weights.json"


def generate_synthetic_data(n_samples: int = 2000, seed: int = 42):
    np.random.seed(seed)

    # 1. Customer Tier: 1=Bronze (40%), 2=Silver (40%), 3=Gold (20%)
    customer_tier = np.random.choice([1, 2, 3], size=n_samples, p=[0.40, 0.40, 0.20])

    # 2. Total Deal Revenue ($800 to $65,000)
    total_revenue = np.random.exponential(scale=12000, size=n_samples) + 800
    total_revenue = np.clip(total_revenue, 500, 75000)

    # 3. Average Discount % (0% to 35%)
    avg_discount_pct = np.random.normal(loc=11.0, scale=6.5, size=n_samples)
    avg_discount_pct = np.clip(avg_discount_pct, 0.0, 35.0)

    # 4. Item Count (1 to 15 line items)
    item_count = np.random.poisson(lam=3.5, size=n_samples) + 1
    item_count = np.clip(item_count, 1, 15)

    # 5. Risk Score (0.0 to 1.0)
    base_risk = (avg_discount_pct / 35.0) * 0.6 + (total_revenue / 75000.0) * 0.25
    risk_score = base_risk + np.random.normal(0, 0.08, size=n_samples)
    risk_score = np.clip(risk_score, 0.0, 1.0)

    # Latent log-odds representing real B2B sales dynamics
    tier_effect = (customer_tier - 2) * 0.65
    discount_benefit = np.minimum(avg_discount_pct, 12.0) * 0.09
    discount_penalty = np.maximum(avg_discount_pct - 15.0, 0.0) * -0.07
    revenue_effect = - (total_revenue / 40000.0) * 0.45
    bundle_effect = np.minimum(item_count, 5) * 0.07
    risk_penalty = risk_score * -1.35

    latent_score = (
        -0.15
        + tier_effect
        + discount_benefit
        + discount_penalty
        + revenue_effect
        + bundle_effect
        + risk_penalty
        + np.random.normal(0, 0.30, size=n_samples)
    )

    prob = 1.0 / (1.0 + np.exp(-latent_score))
    y = (prob >= 0.50).astype(int)

    X = np.column_stack([
        customer_tier,
        total_revenue,
        avg_discount_pct,
        item_count,
        risk_score,
    ])

    return X, y


def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -25.0, 25.0)))


def compute_roc_auc(y_true, y_scores):
    # Fast trapezoidal ROC-AUC calculation
    desc_score_indices = np.argsort(y_scores)[::-1]
    y_true_sorted = y_true[desc_score_indices]
    n_pos = np.sum(y_true == 1)
    n_neg = len(y_true) - n_pos
    if n_pos == 0 or n_neg == 0:
        return 0.5
    cum_pos = np.cumsum(y_true_sorted)
    # Rank sum
    rank_sum = np.sum(np.where(y_true_sorted == 1)[0] + 1)
    auc = (n_pos * len(y_true) - rank_sum - n_pos * (n_pos - 1) / 2.0) / (n_pos * n_neg)
    return float(np.clip(auc, 0.0, 1.0))


def train():
    print("[train] Generating 2,000 synthetic deals reflecting DealFlow360 domain...")
    X, y = generate_synthetic_data(n_samples=2000, seed=42)

    # Train-test split (80/20)
    n_train = int(len(X) * 0.8)
    indices = np.random.RandomState(42).permutation(len(X))
    train_idx, test_idx = indices[:n_train], indices[n_train:]

    X_train, y_train = X[train_idx], y[train_idx]
    X_test, y_test = X[test_idx], y[test_idx]

    # Standardize features
    mean = np.mean(X_train, axis=0)
    scale = np.std(X_train, axis=0)
    scale[scale == 0] = 1.0

    X_train_scaled = (X_train - mean) / scale
    X_test_scaled = (X_test - mean) / scale

    # Logistic Regression with vectorized Gradient Descent & L2 regularization
    n_features = X_train_scaled.shape[1]
    weights = np.zeros(n_features)
    intercept = 0.0
    lr = 0.05
    reg = 0.01  # L2 lambda
    epochs = 600

    print("[train] Training Logistic Regression model with Gradient Descent...")
    for epoch in range(epochs):
        z = np.dot(X_train_scaled, weights) + intercept
        preds = sigmoid(z)
        errors = preds - y_train

        # Gradients
        grad_w = (np.dot(X_train_scaled.T, errors) / len(y_train)) + (reg * weights)
        grad_b = np.mean(errors)

        weights -= lr * grad_w
        intercept -= lr * grad_b

    # Evaluate on Test Set
    test_z = np.dot(X_test_scaled, weights) + intercept
    test_probs = sigmoid(test_z)
    test_preds = (test_probs >= 0.5).astype(int)

    acc = np.mean(test_preds == y_test)
    roc_auc = compute_roc_auc(y_test, test_probs)

    feature_names = [
        "customer_tier",
        "total_revenue",
        "avg_discount_pct",
        "item_count",
        "risk_score",
    ]

    print("\n[train] Training Complete!")
    print(f"   Accuracy: {acc * 100:.2f}%")
    print(f"   ROC-AUC:  {roc_auc:.4f}")
    print("\nLearned Weights (Standardized Feature Effects):")
    for name, w in zip(feature_names, weights):
        print(f"   - {name:<18}: {w:+.4f}")
    print(f"   - {'intercept':<18}: {intercept:+.4f}")

    # Export production weights artifact
    weights_dict = {
        "model_type": "LogisticRegression",
        "version": "1.0.0",
        "feature_names": feature_names,
        "coefficients": [float(w) for w in weights],
        "intercept": float(intercept),
        "scaler_mean": [float(m) for m in mean],
        "scaler_scale": [float(s) for s in scale],
        "metrics": {
            "accuracy": round(float(acc), 4),
            "roc_auc": round(float(roc_auc), 4),
            "n_samples": len(X),
        },
    }

    with open(ARTIFACT_JSON, "w", encoding="utf-8") as f:
        json.dump(weights_dict, f, indent=2)
    print(f"\n[train] Production model weights exported to: {ARTIFACT_JSON}")


if __name__ == "__main__":
    train()
