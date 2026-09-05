"""models.py — contract for UpsellSuggestionsRequested / UpsellSuggestionsReady (ICD §3.6)."""

from pydantic import BaseModel
from typing import List, Optional


class UpsellCandidate(BaseModel):
    productId: str
    productName: str
    basePrice: float
    marginPct: float          
    isPromoted: bool = False
    coPurchaseScore: float = 0.0  


class UpsellSuggestionsRequestedEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    cartProductIds: List[str]     
    candidates: List[UpsellCandidate]
    minMarginPct: float = 0.0      
    timestamp: str


class RankedSuggestion(BaseModel):
    productId: str
    productName: str
    marginDelta: float             
    rankScore: float               
    promoTag: Optional[str] = None
    reason: str


class UpsellSuggestionsReadyEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    suggestions: List[RankedSuggestion]
    computedAt: str