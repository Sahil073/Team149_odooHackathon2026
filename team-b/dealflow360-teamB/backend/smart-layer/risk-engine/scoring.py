"""
scoring.py - Blended discount risk score logic.
SPRINT 1: stubbed. Real per-line + blended logic lands in Sprint 2.
"""

from datetime import datetime, timezone
from models import QuotationUpdatedEvent, RiskScoreComputedEvent


def compute_blended_risk_score(event: QuotationUpdatedEvent) -> RiskScoreComputedEvent:
    return RiskScoreComputedEvent(
        eventVersion=1,
        quotationId=event.quotationId,
        blendedRiskScore=0.0,
        requiresApproval=False,
        requiresFinance=False,
        flaggedLines=[],
        reason="Stub response - Sprint 1 scaffold, real scoring logic lands in Sprint 2",
        computedAt=datetime.now(timezone.utc).isoformat(),
    )
