"""
ranking.py — Real Sprint 3 logic.

Rank by margin impact x likelihood (coPurchaseScore), not just raw
popularity — a less "popular" pairing with much higher margin can
outrank a frequent-but-thin-margin one. Also drop anything below the
configured minMarginPct so the panel never surfaces bad-margin junk,
per the brief: "Set minimum margin thresholds so only healthy margin
suggestions surface."
"""

from datetime import datetime, timezone
from models import UpsellSuggestionsRequestedEvent, UpsellSuggestionsReadyEvent, RankedSuggestion

PROMO_BOOST = 0.15  # rank bump for actively promoted items


def compute_upsell_suggestions(event: UpsellSuggestionsRequestedEvent) -> UpsellSuggestionsReadyEvent:
    suggestions = []

    for c in event.candidates:
        if c.productId in event.cartProductIds:
            continue  # already in the cart, don't suggest it again
        if c.marginPct < event.minMarginPct:
            continue  # below the configured healthy-margin floor — skip

        margin_delta = c.basePrice * (c.marginPct / 100)

        # rankScore blends "how much money this makes us" with "how likely
        # the customer is to actually want it" — normalized margin * likelihood
        normalized_margin = min(c.marginPct / 50, 1.0)  # 50%+ margin = max score component
        rank_score = (normalized_margin * 0.6) + (c.coPurchaseScore * 0.4)
        if c.isPromoted:
            rank_score = min(rank_score + PROMO_BOOST, 1.0)

        suggestions.append(RankedSuggestion(
            productId=c.productId,
            productName=c.productName,
            marginDelta=round(margin_delta, 2),
            rankScore=round(rank_score, 3),
            promoTag="Promoted" if c.isPromoted else None,
            reason=f"{c.marginPct:.0f}% margin, {'frequently' if c.coPurchaseScore > 0.5 else 'sometimes'} bought together",
        ))

    suggestions.sort(key=lambda s: s.rankScore, reverse=True)

    return UpsellSuggestionsReadyEvent(
        eventVersion=1,
        quotationId=event.quotationId,
        suggestions=suggestions,
        computedAt=datetime.now(timezone.utc).isoformat(),
    )