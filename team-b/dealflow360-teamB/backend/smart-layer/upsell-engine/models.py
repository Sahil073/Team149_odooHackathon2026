"""models.py — contract for UpsellSuggestionsRequested / UpsellSuggestionsReady (ICD §3.6)."""

from pydantic import BaseModel
from typing import List, Optional


class UpsellCandidate(BaseModel):
    productId: str
    productName: str
    basePrice: float
    marginPct: float          # this candidate's margin, whole number e.g. 32 = 32%
    isPromoted: bool = False
    coPurchaseScore: float = 0.0  # how often bought alongside current cart, 0.0-1.0


class UpsellSuggestionsRequestedEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    cartProductIds: List[str]      # products already in the quote
    candidates: List[UpsellCandidate]
    minMarginPct: float = 0.0      # from UpsellRule config, filters low-margin junk
    timestamp: str


class RankedSuggestion(BaseModel):
    productId: str
    productName: str
    marginDelta: float             # projected margin $ impact if added
    rankScore: float               # 0.0-1.0, our combined ranking score
    promoTag: Optional[str] = None
    reason: str


class UpsellSuggestionsReadyEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    suggestions: List[RankedSuggestion]
    computedAt: str