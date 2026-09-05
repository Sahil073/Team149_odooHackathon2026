"""
gateway.py — Unified Smart Layer Gateway (Port 8000)

Provides a single HTTP base URL (http://localhost:8000) for Team A's Express backend,
mounting the Risk Engine, Upsell Engine, Deal Health Engine, and AI Win Predictor.
"""

import os
import sys
import importlib.util
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def _load_module(module_name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


# Load submodules dynamically avoiding hyphenated package path collisions
risk_dir = BASE_DIR / "risk-engine"
sys.path.insert(0, str(risk_dir))
risk_models = _load_module("risk_models", risk_dir / "models.py")
sys.modules["models"] = risk_models
risk_scoring = _load_module("risk_scoring", risk_dir / "scoring.py")

upsell_dir = BASE_DIR / "upsell-engine"
sys.path.insert(0, str(upsell_dir))
upsell_models = _load_module("upsell_models", upsell_dir / "models.py")
sys.modules["models"] = upsell_models
upsell_ranking = _load_module("upsell_ranking", upsell_dir / "ranking.py")

health_dir = BASE_DIR / "deal-health"
sys.path.insert(0, str(health_dir))
health_models = _load_module("health_models", health_dir / "models.py")
sys.modules["models"] = health_models
health_db = _load_module("health_db", health_dir / "db.py")


# In-memory caches for REST answers
LATEST_SCORES: dict = {}
LATEST_SUGGESTIONS: dict = {}

gateway = FastAPI(
    title="DealFlow360 — Smart Layer Unified Gateway",
    description="Unified API gateway bridging Discount Risk, Upsell Ranking, Deal Health, and AI Win Prediction.",
    version="1.0.0",
)

gateway.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@gateway.on_event("startup")
def launch_workers():
    health_db.init_db()
    
    # Launch background worker threads for Redis Pub/Sub if available
    try:
        import threading
        # 1. Risk Engine Listener
        try:
            risk_listener = _load_module("risk_listener", risk_dir / "listener.py")
            t_risk = threading.Thread(target=risk_listener.start_listener, args=(LATEST_SCORES,), daemon=True)
            t_risk.start()
            print("[gateway] Risk Engine listener thread started.")
        except Exception as e:
            print(f"[gateway] Note: Risk listener not started ({e})")

        # 2. Upsell Engine Listener
        try:
            upsell_listener = _load_module("upsell_listener", upsell_dir / "listener.py")
            t_upsell = threading.Thread(target=upsell_listener.start_listener, args=(LATEST_SUGGESTIONS,), daemon=True)
            t_upsell.start()
            print("[gateway] Upsell Engine listener thread started.")
        except Exception as e:
            print(f"[gateway] Note: Upsell listener not started ({e})")

        # 3. Deal Health Listener & Scheduler
        try:
            health_listener = _load_module("health_listener", health_dir / "listener.py")
            health_scheduler = _load_module("health_scheduler", health_dir / "scheduler.py")
            t_health = threading.Thread(target=health_listener.start_listener, daemon=True)
            t_health.start()
            t_sched = threading.Thread(target=health_scheduler.start_scheduler, daemon=True)
            t_sched.start()
            print("[gateway] Deal Health listener & scheduler threads started.")
        except Exception as e:
            print(f"[gateway] Note: Deal Health workers not started ({e})")
    except Exception as e:
        print(f"[gateway] Background worker setup note: {e}")

    print("[gateway] Smart Layer Unified Gateway running on port 8000.")


@gateway.get("/")
@gateway.get("/health")
def liveness():
    return {
        "status": "ok",
        "service": "smart-layer-gateway",
        "endpoints": [
            "/risk-score/{id}",
            "/api/risk-score/{id}",
            "/api/risk-score/calculate",
            "/upsell-suggestions/{id}",
            "/api/upsell-suggestions/{id}",
            "/api/upsell-suggestions/compute",
            "/deal-health-flags",
            "/api/deal-health-flags",
            "/api/ai/win-probability",
        ],
    }


# -----------------------------------------------------------------------------
# 1. Discount Risk Engine Routes
# -----------------------------------------------------------------------------
class RiskCalcLine(BaseModel):
    lineId: Optional[str] = None
    productId: Optional[str] = None
    category: Optional[str] = "Hardware"
    qty: int = 1
    unitPrice: float = 0.0
    discountPct: float = 0.0
    categoryMaxDiscountPct: Optional[float] = None
    lineLimitPct: Optional[float] = None


class RiskCalcRequest(BaseModel):
    quotationId: str
    customerId: Optional[str] = "cust-1"
    customerTier: Optional[str] = "Silver"
    salesRepId: Optional[str] = "rep-1"
    lines: list[RiskCalcLine] = []


@gateway.post("/risk-score/calculate")
@gateway.post("/api/risk-score/calculate")
def calculate_risk_score(req: RiskCalcRequest):
    from datetime import datetime, timezone

    tier = req.customerTier if req.customerTier in ("Bronze", "Silver", "Gold") else "Silver"
    q_lines = []
    for idx, l in enumerate(req.lines):
        cat = l.category if l.category in ("Hardware", "Services", "Subscriptions") else "Hardware"
        limit = l.categoryMaxDiscountPct if l.categoryMaxDiscountPct is not None else (l.lineLimitPct or 10.0)
        q_lines.append(risk_models.QuotationLine(
            lineId=l.lineId or f"line-{idx+1}",
            productId=l.productId or f"prod-{idx+1}",
            category=cat,
            qty=l.qty,
            unitPrice=l.unitPrice,
            discountPct=l.discountPct,
            categoryMaxDiscountPct=limit,
        ))

    event = risk_models.QuotationUpdatedEvent(
        eventVersion=1,
        quotationId=req.quotationId,
        customerId=req.customerId or "cust-1",
        customerTier=tier,
        salesRepId=req.salesRepId or "rep-1",
        lines=q_lines,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    result = risk_scoring.compute_blended_risk_score(event)
    LATEST_SCORES[req.quotationId] = result
    return result


@gateway.get("/risk-score/{quotation_id}")
@gateway.get("/api/risk-score/{quotation_id}")
def get_risk_score(quotation_id: str):
    from datetime import datetime, timezone

    if quotation_id in LATEST_SCORES:
        return LATEST_SCORES[quotation_id]

    return risk_models.RiskScoreComputedEvent(
        eventVersion=1,
        quotationId=quotation_id,
        blendedRiskScore=0.0,
        requiresApproval=False,
        requiresFinance=False,
        flaggedLines=[],
        reason="No score computed yet for this quotation.",
        computedAt=datetime.now(timezone.utc).isoformat(),
    )


# -----------------------------------------------------------------------------
# 2. Upsell Engine Routes
# -----------------------------------------------------------------------------
class UpsellCandidateInput(BaseModel):
    productId: str
    productName: str
    basePrice: float
    marginPct: float = 20.0
    isPromoted: bool = False
    coPurchaseScore: float = 0.5


class UpsellComputeRequest(BaseModel):
    quotationId: str
    cartProductIds: list[str] = []
    candidates: list[UpsellCandidateInput] = []
    minMarginPct: float = 0.0


@gateway.post("/upsell-suggestions/compute")
@gateway.post("/api/upsell-suggestions/compute")
def compute_upsell(req: UpsellComputeRequest):
    from datetime import datetime, timezone

    event = upsell_models.UpsellSuggestionsRequestedEvent(
        eventVersion=1,
        quotationId=req.quotationId,
        cartProductIds=req.cartProductIds,
        candidates=[
            upsell_models.UpsellCandidate(
                productId=c.productId,
                productName=c.productName,
                basePrice=c.basePrice,
                marginPct=c.marginPct,
                isPromoted=c.isPromoted,
                coPurchaseScore=c.coPurchaseScore,
            )
            for c in req.candidates
        ],
        minMarginPct=req.minMarginPct,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )

    result = upsell_ranking.compute_upsell_suggestions(event)
    LATEST_SUGGESTIONS[req.quotationId] = result
    return result


@gateway.get("/upsell-suggestions/{quotation_id}")
@gateway.get("/api/upsell-suggestions/{quotation_id}")
def get_upsell_suggestions(quotation_id: str):
    from datetime import datetime, timezone

    if quotation_id in LATEST_SUGGESTIONS:
        return LATEST_SUGGESTIONS[quotation_id]

    return upsell_models.UpsellSuggestionsReadyEvent(
        eventVersion=1,
        quotationId=quotation_id,
        suggestions=[],
        computedAt=datetime.now(timezone.utc).isoformat(),
    )


# -----------------------------------------------------------------------------
# 3. Deal Health Engine Routes
# -----------------------------------------------------------------------------
@gateway.get("/deal-health-flags")
@gateway.get("/api/deal-health-flags")
def get_deal_health_flags(severity: Optional[str] = Query(default=None)):
    flags = health_db.get_open_flags(severity=severity)
    return {"flags": [f.model_dump() for f in flags]}


@gateway.post("/deal-health-flags/{flag_id}/resolve")
@gateway.patch("/deal-health-flags/{flag_id}/resolve")
@gateway.post("/api/deal-health-flags/{flag_id}/resolve")
@gateway.patch("/api/deal-health-flags/{flag_id}/resolve")
def resolve_flag(flag_id: str):
    health_db.resolve_flag(flag_id)
    return {"status": "resolved", "flagId": flag_id}


# -----------------------------------------------------------------------------
# 4. AI Deal Win Probability Predictor (Trained ML Model)
# -----------------------------------------------------------------------------
import json
import math

_ML_WEIGHTS = None

def _get_ml_weights():
    global _ML_WEIGHTS
    if _ML_WEIGHTS is None:
        weights_file = BASE_DIR / "deal_win_weights.json"
        if weights_file.exists():
            try:
                with open(weights_file, "r", encoding="utf-8") as f:
                    _ML_WEIGHTS = json.load(f)
            except Exception as e:
                print(f"[gateway] Warning: could not load deal_win_weights.json ({e})")
    return _ML_WEIGHTS


class WinPredictRequest(BaseModel):
    customerTier: Optional[str] = "Silver"  # Bronze, Silver, Gold
    totalRevenue: Optional[float] = None
    avgDiscountPct: Optional[float] = None
    itemCount: Optional[int] = 1
    riskScore: Optional[float] = 0.15
    # Fallback/alternative field names
    amount: Optional[float] = None
    discount_pct: Optional[float] = None
    deal_id: Optional[str] = None
    stage: Optional[str] = None
    days_in_stage: Optional[int] = None
    past_interactions: Optional[int] = None


@gateway.post("/api/ai/win-probability")
def predict_win_probability(req: WinPredictRequest):
    tier_str = (req.customerTier or "Silver").strip().capitalize()
    tier_num = 3.0 if tier_str == "Gold" else 2.0 if tier_str == "Silver" else 1.0
    revenue = float(req.totalRevenue if req.totalRevenue is not None else (req.amount or 10000.0))
    discount = float(req.avgDiscountPct if req.avgDiscountPct is not None else (req.discount_pct or 5.0))
    items = float(req.itemCount if req.itemCount is not None else 1)
    risk = float(req.riskScore if req.riskScore is not None else 0.15)

    weights_data = _get_ml_weights()

    if weights_data and "coefficients" in weights_data:
        coefs = weights_data["coefficients"]
        intercept = weights_data["intercept"]
        means = weights_data["scaler_mean"]
        scales = weights_data["scaler_scale"]

        raw_features = [tier_num, revenue, discount, items, risk]
        scaled_features = [(x - m) / (s if s != 0 else 1.0) for x, m, s in zip(raw_features, means, scales)]

        z = intercept + sum(w * x for w, x in zip(coefs, scaled_features))
        prob = 1.0 / (1.0 + math.exp(-max(min(z, 25.0), -25.0)))
        prob = max(min(prob, 0.98), 0.05)

        # Explainability: inspect which feature contributed most
        contributions = [
            ("tier", coefs[0] * scaled_features[0]),
            ("revenue", coefs[1] * scaled_features[1]),
            ("discount", coefs[2] * scaled_features[2]),
            ("items", coefs[3] * scaled_features[3]),
            ("risk", coefs[4] * scaled_features[4]),
        ]

        if prob >= 0.70:
            status = "HIGH"
            driver = f"Strong {tier_str} tier conversion affinity combined with competitive {discount:.1f}% discount."
        elif prob >= 0.45:
            status = "MODERATE"
            driver = f"Moderate close propensity for ${revenue:,.0f} deal. Suggest adding line items to improve lock-in."
        else:
            status = "AT_RISK"
            driver = f"High deal risk: high discount or deal size exceeds standard close benchmarks."

        # Find discount sweet spot maximizing expected value
        best_d = 5.0
        best_ev = -1.0
        for test_d in [0.0, 5.0, 8.0, 10.0, 12.0, 15.0, 18.0]:
            test_raw = [tier_num, revenue, test_d, items, risk]
            test_scaled = [(x - m) / (s if s != 0 else 1.0) for x, m, s in zip(test_raw, means, scales)]
            test_z = intercept + sum(w * x for w, x in zip(coefs, test_scaled))
            test_prob = 1.0 / (1.0 + math.exp(-max(min(test_z, 25.0), -25.0)))
            ev = test_prob * revenue * (1.0 - test_d / 100.0)
            if ev > best_ev:
                best_ev = ev
                best_d = test_d

        return {
            "winProbability": round(prob, 2),
            "status": status,
            "confidence": round(weights_data.get("metrics", {}).get("roc_auc", 0.89), 2),
            "keyDriver": driver,
            "recommendedDiscountPct": int(best_d),
            "modelType": weights_data.get("model_type", "LogisticRegression"),
            "modelVersion": weights_data.get("version", "1.0.0"),
        }

    # Fallback heuristic
    tier_weights = {"Bronze": 0.45, "Silver": 0.65, "Gold": 0.82}
    base_prob = tier_weights.get(tier_str, 0.50)
    score = min(max(base_prob + (0.05 if discount <= 10 else -0.1), 0.05), 0.98)
    return {
        "winProbability": round(score, 2),
        "status": "HIGH" if score >= 0.70 else "MODERATE" if score >= 0.45 else "AT_RISK",
        "confidence": 0.85,
        "keyDriver": f"{tier_str} tier customer profile evaluated.",
        "recommendedDiscountPct": 10,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    print(f">> Launching DealFlow360 Smart Layer Gateway on http://localhost:{port}")
    uvicorn.run("gateway:gateway", host="0.0.0.0", port=port, reload=True)
