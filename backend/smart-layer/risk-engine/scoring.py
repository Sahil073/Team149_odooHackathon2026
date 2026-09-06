"""
scoring.py — REAL Sprint 2 logic. This is the core value of the entire
Team B build.

WHAT PROBLEM THIS SOLVES (tie back to the brief):
  The brief's Quick Test Flow requires: give a line a discount higher than
  normally allowed -> quote AUTOMATICALLY asks for manager approval, with
  no manual action from the rep. This function is that automatic judgment.

THE DESIGN DECISION THAT MAKES THIS "BLENDED" (not just per-line checking):
  A naive implementation checks "is any line over its limit -> yes/no".
  That's necessary but not sufficient — the brief explicitly explains why:
  many SMALL breaches across different lines can hide a large total giveaway
  that no single line reveals. So we don't just average breach percentages
  either (that would let one huge $50 line and one tiny $50,000 line count
  equally). We weight each line's breach by its DOLLAR EXPOSURE, so the
  blended score reflects actual business risk, not just rule-counting.

TWO SEPARATE DECISIONS, ON PURPOSE:
  1) requiresApproval — ANY single line breaching its limit triggers this,
     always. This matches the brief's own worked example exactly: "Even
     though the customer is Gold and 15% sounds fine on paper, the Service
     line broke its own stricter limit. So the whole quotation gets flagged."
     One bad line is enough — we never let a bad line hide behind a good
     blended average.
  2) requiresFinance — a SEVERITY escalation, driven by the blended score.
     A quote with one line barely over stays with the Sales Manager. A quote
     with severe or widespread breaches escalates to Finance too. This
     mirrors the ICD's requirement that Team A's Approval Service can just
     read requiresFinance as a verdict, never re-derive the rule itself.
"""

from datetime import datetime, timezone
from models import QuotationUpdatedEvent, RiskScoreComputedEvent

# ---------------------------------------------------------------------------
# TUNABLE THRESHOLDS
# Keep these in one place, clearly named, so anyone (including a mentor
# asking "why did THIS quote need Finance approval?") gets a direct answer
# by reading these two numbers — not by reverse-engineering a formula.
# ---------------------------------------------------------------------------

# blended_risk_score is normalized to a 0.0-1.0 scale. This constant defines
# how many "exposure-weighted breach points" count as maximum risk (1.0).
# Example: if the average breach across the order, weighted by how much
# money is behind each line, is 20 percentage-points over the limit, we
# call that maximum severity.
MAX_WEIGHTED_BREACH_FOR_FULL_RISK = 20.0

# Above this blended score, escalate to Finance (in addition to Sales Manager).
FINANCE_ESCALATION_THRESHOLD = 0.5

# Even with a LOW blended score, one severely-over line still forces Finance.
# (Protects against "many lines barely over" averaging down a genuinely bad
# single-line breach that's individually large.)
SINGLE_LINE_FINANCE_BREACH_POINTS = 15.0


def compute_blended_risk_score(event: QuotationUpdatedEvent) -> RiskScoreComputedEvent:
    flagged_line_ids: list[str] = []
    weighted_breach_sum = 0.0
    total_exposure = 0.0
    max_single_breach = 0.0
    breach_details: list[str] = []  # human-readable per-line notes for the `reason` field

    for line in event.lines:
        # "Exposure" = how much money is actually on this line after discount.
        # This is what makes the blend fair: a breach on a $50 line should
        # not carry the same weight as a breach on a $50,000 line.
        line_revenue = line.qty * line.unitPrice
        exposure = line_revenue * (1 - line.discountPct / 100)

        breach_points = max(0.0, line.discountPct - line.categoryMaxDiscountPct)

        if breach_points > 0:
            flagged_line_ids.append(line.lineId)
            weighted_breach_sum += breach_points * exposure
            breach_details.append(
                f"{line.category} line is {breach_points:.0f}pts over its "
                f"{line.categoryMaxDiscountPct:.0f}% limit "
                f"(${exposure:,.0f} exposure)"
            )
            max_single_breach = max(max_single_breach, breach_points)

        total_exposure += exposure

    # Avoid division by zero for a degenerate empty-lines event.
    if total_exposure > 0:
        weighted_avg_breach = weighted_breach_sum / total_exposure
    else:
        weighted_avg_breach = 0.0

    blended_risk_score = min(weighted_avg_breach / MAX_WEIGHTED_BREACH_FOR_FULL_RISK, 1.0)

    # Decision 1: ANY breached line requires approval. No exceptions —
    # this mirrors the brief's own worked example directly.
    requires_approval = len(flagged_line_ids) > 0

    # Decision 2: Finance escalation — either the blended pattern is severe,
    # OR one single line is a big enough breach on its own.
    requires_finance = (
        blended_risk_score >= FINANCE_ESCALATION_THRESHOLD
        or max_single_breach >= SINGLE_LINE_FINANCE_BREACH_POINTS
    )

    reason = _build_reason(requires_approval, blended_risk_score, breach_details)

    return RiskScoreComputedEvent(
        eventVersion=1,
        quotationId=event.quotationId,
        blendedRiskScore=round(blended_risk_score, 3),
        requiresApproval=requires_approval,
        requiresFinance=requires_finance,
        flaggedLines=flagged_line_ids,
        reason=reason,
        computedAt=datetime.now(timezone.utc).isoformat(),
    )


def _build_reason(requires_approval: bool, blended_score: float, breach_details: list[str]) -> str:
    """
    Builds the human-readable explanation shown in the "Why This Quote Was
    Flagged" panel (see the Approval Detail mockup screen). This is a real
    product requirement, not a debug string — a Sales Manager reading this
    should immediately understand the decision without opening the raw data.
    """
    if not requires_approval:
        return "All lines within their category discount limits. No approval required."

    if len(breach_details) == 1:
        return f"{breach_details[0]}. Blended risk score: {blended_score:.2f}."

    joined = "; ".join(breach_details)
    return (
        f"{len(breach_details)} lines exceed their category limits: {joined}. "
        f"Blended risk score: {blended_score:.2f} (weighted by line exposure)."
    )
