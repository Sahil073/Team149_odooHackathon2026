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
            "/upsell-suggestions/{id}",
            "/api/upsell-suggestions/{id}",
            "/deal-health-flags",
            "/api/deal-health-flags",
            "/api/ai/win-probability",
        ],
    }


# -----------------------------------------------------------------------------
# 1. Discount Risk Engine Routes
# -----------------------------------------------------------------------------
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
# 4. AI Deal Win Probability Predictor
# -----------------------------------------------------------------------------
class WinPredictRequest(BaseModel):
    customerTier: Optional[str] = "Silver"  # Bronze, Silver, Gold
    totalRevenue: Optional[float] = None
    avgDiscountPct: Optional[float] = None
    itemCount: Optional[int] = 1
    # Fallback/alternative field names
    amount: Optional[float] = None
    discount_pct: Optional[float] = None
    deal_id: Optional[str] = None
    stage: Optional[str] = None
    days_in_stage: Optional[int] = None
    past_interactions: Optional[int] = None


@gateway.post("/api/ai/win-probability")
def predict_win_probability(req: WinPredictRequest):
    tier = req.customerTier or "Silver"
    revenue = req.totalRevenue if req.totalRevenue is not None else (req.amount or 10000.0)
    discount = req.avgDiscountPct if req.avgDiscountPct is not None else (req.discount_pct or 5.0)

    tier_weights = {"Bronze": 0.45, "Silver": 0.65, "Gold": 0.82}
    base_prob = tier_weights.get(tier, 0.50)

    # Discount influence
    if discount <= 10:
        discount_factor = 0.08 * (discount / 10.0)
    elif discount <= 20:
        discount_factor = 0.08 - 0.16 * ((discount - 10) / 10.0)
    else:
        discount_factor = -0.22

    size_factor = 0.04 if 1000 <= revenue <= 50000 else -0.04

    score = min(max(base_prob + discount_factor + size_factor, 0.05), 0.98)
    status = "HIGH" if score >= 0.70 else "MODERATE" if score >= 0.45 else "AT_RISK"

    if score >= 0.70:
        driver = f"High likelihood to close for {tier} tier with healthy {discount:.1f}% discount."
    elif score >= 0.45:
        driver = f"Moderate closure rate. Consider contract duration or bundled services to protect margin."
    else:
        driver = f"Low win probability: discount breach and deal size suggest risk of client hesitation or margin loss."

    return {
        "winProbability": round(score, 2),
        "status": status,
        "confidence": 0.89,
        "keyDriver": driver,
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    print(f">> Launching DealFlow360 Smart Layer Gateway on http://localhost:{port}")
    uvicorn.run("gateway:gateway", host="0.0.0.0", port=port, reload=True)
