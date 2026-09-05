import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import UpsellSuggestionsRequestedEvent, UpsellCandidate
from ranking import compute_upsell_suggestions


def _event(candidates, cart=None, min_margin=0.0):
    return UpsellSuggestionsRequestedEvent(
        quotationId="q-1",
        cartProductIds=cart or ["prod-laptop"],
        candidates=candidates,
        minMarginPct=min_margin,
        timestamp="2026-09-05T00:00:00Z",
    )


def _candidate(**overrides):
    base = dict(
        productId="prod-x",
        productName="Widget",
        basePrice=100.0,
        marginPct=20.0,
        isPromoted=False,
        coPurchaseScore=0.5,
    )
    base.update(overrides)
    return UpsellCandidate(**base)


def test_low_margin_candidate_is_filtered_out():
    event = _event(
        candidates=[_candidate(productId="cable", marginPct=3.0, coPurchaseScore=0.9)],
        min_margin=10.0,
    )
    result = compute_upsell_suggestions(event)
    assert result.suggestions == []


def test_candidate_already_in_cart_is_excluded():
    event = _event(
        candidates=[_candidate(productId="prod-laptop", marginPct=20.0)],
        cart=["prod-laptop"],
    )
    result = compute_upsell_suggestions(event)
    assert result.suggestions == []


def test_promoted_lower_margin_item_can_outrank_high_frequency_low_margin_item():
    """
    Mirrors the brief's worked case: a promoted docking station with modest
    co-purchase but strong margin should outrank a mouse that's bought
    together very often but only has thin margin.
    """
    event = _event(
        candidates=[
            _candidate(
                productId="mouse",
                productName="Wireless Mouse",
                basePrice=30.0,
                marginPct=10.0,
                coPurchaseScore=0.9,
                isPromoted=False,
            ),
            _candidate(
                productId="dock",
                productName="Docking Station",
                basePrice=150.0,
                marginPct=35.0,
                coPurchaseScore=0.4,
                isPromoted=True,
            ),
        ],
        min_margin=5.0,
    )
    result = compute_upsell_suggestions(event)
    ranked_ids = [s.productId for s in result.suggestions]
    assert ranked_ids[0] == "dock"
    assert ranked_ids[1] == "mouse"


def test_suggestions_sorted_descending_by_rank_score():
    event = _event(
        candidates=[
            _candidate(productId="low", marginPct=10.0, coPurchaseScore=0.1),
            _candidate(productId="high", marginPct=45.0, coPurchaseScore=0.8),
            _candidate(productId="mid", marginPct=25.0, coPurchaseScore=0.5),
        ],
    )
    result = compute_upsell_suggestions(event)
    scores = [s.rankScore for s in result.suggestions]
    assert scores == sorted(scores, reverse=True)


def test_margin_delta_computed_correctly():
    event = _event(
        candidates=[_candidate(productId="x", basePrice=200.0, marginPct=25.0)],
    )
    result = compute_upsell_suggestions(event)
    assert result.suggestions[0].marginDelta == 50.0


def test_promoted_item_gets_promo_tag():
    event = _event(candidates=[_candidate(productId="x", isPromoted=True)])
    result = compute_upsell_suggestions(event)
    assert result.suggestions[0].promoTag == "Promoted"


def test_non_promoted_item_has_no_promo_tag():
    event = _event(candidates=[_candidate(productId="x", isPromoted=False)])
    result = compute_upsell_suggestions(event)
    assert result.suggestions[0].promoTag is None


def test_reason_string_reflects_margin_and_frequency():
    frequent = _candidate(productId="x", marginPct=20.0, coPurchaseScore=0.8)
    rare = _candidate(productId="y", marginPct=20.0, coPurchaseScore=0.2)
    result = compute_upsell_suggestions(_event(candidates=[frequent, rare]))

    reasons = {s.productId: s.reason for s in result.suggestions}
    assert "frequently" in reasons["x"]
    assert "sometimes" in reasons["y"]
    assert "20%" in reasons["x"]


def test_empty_candidates_returns_empty_suggestions():
    event = _event(candidates=[])
    result = compute_upsell_suggestions(event)
    assert result.suggestions == []
    assert result.quotationId == "q-1"


def test_rank_score_never_exceeds_one_even_with_promo_boost():
    event = _event(
        candidates=[_candidate(productId="x", marginPct=100.0, coPurchaseScore=1.0, isPromoted=True)],
    )
    result = compute_upsell_suggestions(event)
    assert result.suggestions[0].rankScore <= 1.0
