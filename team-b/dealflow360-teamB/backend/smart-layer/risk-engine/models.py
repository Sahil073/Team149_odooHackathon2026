"""
models.py - Pydantic contract matching ICD 3.1 (QuotationUpdated) and
3.2 (RiskScoreComputed). This file IS the interface with Team A.
"""

from pydantic import BaseModel
from typing import List, Literal


class QuotationLine(BaseModel):
    lineId: str
    productId: str
    category: Literal["Hardware", "Services", "Subscriptions"]
    qty: int
    unitPrice: float
    discountPct: float
    categoryMaxDiscountPct: float


class QuotationUpdatedEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    customerId: str
    customerTier: Literal["Bronze", "Silver", "Gold"]
    salesRepId: str
    lines: List[QuotationLine]
    timestamp: str


class RiskScoreComputedEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    blendedRiskScore: float
    requiresApproval: bool
    requiresFinance: bool
    flaggedLines: List[str]
    reason: str
    computedAt: str
