"""
app.py - REST surface of the Discount Risk Engine. Per ICD 4 Read Contract.
"""

from fastapi import FastAPI
from datetime import datetime, timezone
from models import RiskScoreComputedEvent

app = FastAPI(title="DealFlow360 - Discount Risk Engine (Team B)")

LATEST_SCORES: dict[str, RiskScoreComputedEvent] = {}


@app.get("/")
def health_check():
    return {"status": "ok", "service": "discount-risk-engine"}


@app.get("/api/risk-score/{quotation_id}")
def get_risk_score(quotation_id: str):
    if quotation_id in LATEST_SCORES:
        return LATEST_SCORES[quotation_id]

    return RiskScoreComputedEvent(
        eventVersion=1,
        quotationId=quotation_id,
        blendedRiskScore=0.0,
        requiresApproval=False,
        requiresFinance=False,
        flaggedLines=[],
        reason="No score computed yet (Sprint 1 mock - no real quote data received).",
        computedAt=datetime.now(timezone.utc).isoformat(),
    )
