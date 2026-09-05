from pydantic import BaseModel
from typing import List, Literal, Optional


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
    status: Optional[str] = None
    promisedDeliveryDate: Optional[str] = None
    actualShipDate: Optional[str] = None


class DealHealthFlagEvent(BaseModel):
    eventVersion: int = 1
    quotationId: str
    flagType: Literal["stalled", "discount_anomaly", "delivery_slippage"]
    severity: Literal["low", "medium", "high"]
    detail: str
    detectedAt: str


class DealHealthFlagRecord(BaseModel):
    id: int
    quotationId: str
    flagType: Literal["stalled", "discount_anomaly", "delivery_slippage"]
    severity: Literal["low", "medium", "high"]
    detail: str
    detectedAt: str
    resolved: bool


class QuoteState(BaseModel):
    quotationId: str
    salesRepId: str
    customerId: str
    avgDiscountPct: float
    lastUpdatedAt: str
    status: Optional[str] = None
    promisedDeliveryDate: Optional[str] = None
    actualShipDate: Optional[str] = None
