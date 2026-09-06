import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timedelta, timezone
from models import QuoteState
from detection import check_stalled, check_discount_anomaly, check_delivery_slippage, run_all_checks

NOW = datetime(2026, 9, 5, tzinfo=timezone.utc)


def _state(**overrides):
    base = dict(
        quotationId="q-1",
        salesRepId="rep-1",
        customerId="cust-1",
        avgDiscountPct=10.0,
        lastUpdatedAt=(NOW - timedelta(days=1)).isoformat(),
        status="Draft",
        promisedDeliveryDate=None,
        actualShipDate=None,
    )
    base.update(overrides)
    return QuoteState(**base)


def test_stalled_flag_after_threshold():
    state = _state(lastUpdatedAt=(NOW - timedelta(days=9)).isoformat())
    flag = check_stalled(state, NOW)
    assert flag is not None
    assert flag.flagType == "stalled"
    assert flag.severity == "medium"


def test_stalled_flag_high_severity_after_long_inactivity():
    state = _state(lastUpdatedAt=(NOW - timedelta(days=20)).isoformat())
    flag = check_stalled(state, NOW)
    assert flag.severity == "high"


def test_no_stalled_flag_if_recently_active():
    state = _state(lastUpdatedAt=(NOW - timedelta(days=1)).isoformat())
    assert check_stalled(state, NOW) is None


def test_no_stalled_flag_if_confirmed():
    state = _state(lastUpdatedAt=(NOW - timedelta(days=30)).isoformat(), status="Confirmed")
    assert check_stalled(state, NOW) is None


def test_discount_anomaly_flags_when_above_rep_baseline():
    state = _state(avgDiscountPct=20.0)
    flag = check_discount_anomaly(state, rep_baseline_avg_discount=5.0, now=NOW)
    assert flag is not None
    assert flag.flagType == "discount_anomaly"
    assert "rep" in flag.detail.lower()


def test_discount_anomaly_no_flag_when_close_to_baseline():
    state = _state(avgDiscountPct=8.0)
    flag = check_discount_anomaly(state, rep_baseline_avg_discount=5.0, now=NOW)
    assert flag is None


def test_discount_anomaly_no_flag_without_baseline():
    state = _state(avgDiscountPct=30.0)
    assert check_discount_anomaly(state, rep_baseline_avg_discount=None, now=NOW) is None


def test_delivery_slippage_flags_past_grace_period():
    state = _state(promisedDeliveryDate=(NOW - timedelta(days=6)).isoformat(), actualShipDate=None)
    flag = check_delivery_slippage(state, NOW)
    assert flag is not None
    assert flag.flagType == "delivery_slippage"


def test_delivery_slippage_no_flag_within_grace_period():
    state = _state(promisedDeliveryDate=(NOW - timedelta(days=1)).isoformat(), actualShipDate=None)
    assert check_delivery_slippage(state, NOW) is None


def test_delivery_slippage_no_flag_if_already_shipped():
    state = _state(
        promisedDeliveryDate=(NOW - timedelta(days=10)).isoformat(),
        actualShipDate=(NOW - timedelta(days=9)).isoformat(),
    )
    assert check_delivery_slippage(state, NOW) is None


def test_run_all_checks_returns_multiple_compound_flags():
    state = _state(
        avgDiscountPct=25.0,
        lastUpdatedAt=(NOW - timedelta(days=15)).isoformat(),
        promisedDeliveryDate=(NOW - timedelta(days=8)).isoformat(),
        actualShipDate=None,
    )
    flags = run_all_checks(state, rep_baseline_avg_discount=5.0, now=NOW)
    flag_types = {f.flagType for f in flags}
    assert flag_types == {"stalled", "discount_anomaly", "delivery_slippage"}
