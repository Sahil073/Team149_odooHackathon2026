"""
models.py — The data contract between Team A and Team B (Discount Risk Engine).

Every field here is copied directly from the ICD (Interface Control Document),
sections 3.1 and 3.2. This file IS the contract. If a field name, type, or
shape changes here, it must change in the ICD too — and vice versa.

Why Pydantic specifically:
- FastAPI uses these same models to auto-validate incoming/outgoing JSON.
- If Team A sends us a malformed event (missing field, wrong type), Pydantic
  raises a clear validation error immediately — instead of our code crashing
  three lines later with a confusing KeyError at 1am before a demo.
"""

from pydantic import BaseModel, Field
from typing import List, Literal
from datetime import datetime


# ---------------------------------------------------------------------------
# INCOMING EVENT: QuotationUpdated (ICD §3.1)
# Published by: Team A, quotation.service.ts
# Consumed by: us (discount-risk-engine) and upsell-engine
# ---------------------------------------------------------------------------

class QuotationLine(BaseModel):
    lineId: str  # UUID string
    productId: str  # UUID string
    category: Literal["Hardware", "Services", "Subscriptions"]
    qty: int
    unitPrice: float
    discountPct: float  # Whole number, e.g. 12 means 12% (NOT 0.12 — see ICD §7)
    categoryMaxDiscountPct: float
    # ^ Team A resolves the limit and attaches it here. We NEVER look this up
    # ourselves from a discount-config table — that would be a direct DB read,
    # which the ICD's Golden Rule (§2) forbids.


class QuotationUpdatedEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    customerId: str
    customerTier: Literal["Bronze", "Silver", "Gold"]
    salesRepId: str
    lines: List[QuotationLine]
    timestamp: str  # ISO8601 string, UTC (see ICD §7 — no timezone ambiguity)


# ---------------------------------------------------------------------------
# OUTGOING EVENT / REST RESPONSE: RiskScoreComputed (ICD §3.2)
# Published by: us (discount-risk-engine)
# Consumed by: Team A — quotation.service.ts (stores score),
#              approval.service.ts (decides routing)
# ---------------------------------------------------------------------------

class RiskScoreComputedEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    blendedRiskScore: float  # e.g. 0.62
    requiresApproval: bool
    requiresFinance: bool
    flaggedLines: List[str]  # list of lineIds that breached their limit
    reason: str  # human-readable explanation, e.g. "Setup Service line exceeds category limit by 8 points"
    computedAt: str  # ISO8601 string, UTC

    # WHY these are booleans, not raw numbers Team A has to interpret:
    # Team B (us) owns the decision logic. Team A just acts on the verdict.
    # If our threshold rule changes later, only OUR code changes — Team A's
    # approval service never needs to know the rule, only the result.
