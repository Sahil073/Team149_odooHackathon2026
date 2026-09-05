from datetime import datetime, timedelta, timezone
from typing import List, Optional
from models import QuoteState, DealHealthFlagEvent

STALLED_DAYS_THRESHOLD = 7
STALLED_HIGH_SEVERITY_DAYS = 14
ANOMALY_BREACH_POINTS = 8.0
ANOMALY_HIGH_SEVERITY_POINTS = 16.0
SLIPPAGE_GRACE_DAYS = 2
SLIPPAGE_HIGH_SEVERITY_DAYS = 5


def _parse(ts: str) -> datetime:
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def check_stalled(state: QuoteState, now: datetime) -> Optional[DealHealthFlagEvent]:
    if state.status in ("Confirmed", "Rejected"):
        return None

    last_updated = _parse(state.lastUpdatedAt)
    days_inactive = (now - last_updated).days

    if days_inactive < STALLED_DAYS_THRESHOLD:
        return None

    severity = "high" if days_inactive >= STALLED_HIGH_SEVERITY_DAYS else "medium"

    return DealHealthFlagEvent(
        quotationId=state.quotationId,
        flagType="stalled",
        severity=severity,
        detail=f"Inactive for {days_inactive} days, no activity since {state.lastUpdatedAt}",
        detectedAt=now.isoformat(),
    )


def check_discount_anomaly(
    state: QuoteState,
    rep_baseline_avg_discount: Optional[float],
    now: datetime,
) -> Optional[DealHealthFlagEvent]:
    if rep_baseline_avg_discount is None:
        return None

    breach = state.avgDiscountPct - rep_baseline_avg_discount

    if breach < ANOMALY_BREACH_POINTS:
        return None

    severity = "high" if breach >= ANOMALY_HIGH_SEVERITY_POINTS else "medium"

    return DealHealthFlagEvent(
        quotationId=state.quotationId,
        flagType="discount_anomaly",
        severity=severity,
        detail=(
            f"Average discount {state.avgDiscountPct:.1f}% is {breach:.1f}pts "
            f"above this rep's own historical average of {rep_baseline_avg_discount:.1f}%"
        ),
        detectedAt=now.isoformat(),
    )


def check_delivery_slippage(state: QuoteState, now: datetime) -> Optional[DealHealthFlagEvent]:
    if state.promisedDeliveryDate is None or state.actualShipDate is not None:
        return None

    promised = _parse(state.promisedDeliveryDate)
    days_late = (now - promised).days - SLIPPAGE_GRACE_DAYS

    if days_late <= 0:
        return None

    severity = "high" if days_late >= SLIPPAGE_HIGH_SEVERITY_DAYS else "low" if days_late < 3 else "medium"

    return DealHealthFlagEvent(
        quotationId=state.quotationId,
        flagType="delivery_slippage",
        severity=severity,
        detail=f"Promised delivery was {state.promisedDeliveryDate}, now {days_late} day(s) past grace period",
        detectedAt=now.isoformat(),
    )


def run_all_checks(
    state: QuoteState,
    rep_baseline_avg_discount: Optional[float],
    now: Optional[datetime] = None,
) -> List[DealHealthFlagEvent]:
    now = now or datetime.now(timezone.utc)

    checks = [
        check_stalled(state, now),
        check_discount_anomaly(state, rep_baseline_avg_discount, now),
        check_delivery_slippage(state, now),
    ]

    return [flag for flag in checks if flag is not None]
