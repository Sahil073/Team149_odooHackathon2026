"""
app.py — REST surface of the Discount Risk Engine (ICD §4 Read Contract),
PLUS the process that also runs the event listener in the background.

ARCHITECTURAL DECISION WORTH BEING ABLE TO EXPLAIN:
  We run the REST server (app.py) and the event listener (listener.py) in
  ONE process, with the listener started on a background thread at startup.
  This is a deliberate hackathon-scale simplification: it lets both sides
  share the same in-memory LATEST_SCORES cache directly, with zero extra
  infrastructure (no separate cache service, no polling a DB).

  Tradeoff, stated honestly: in a production system you'd likely split
  these into two separate deployables (a stateless REST pod + a listener
  worker) so they scale independently, backed by Redis or a DB for shared
  state instead of in-process memory. For this hackathon, one process is
  simpler, faster to build, and easy to defend: "why one process?" -> "we
  chose simplicity because it removes a whole class of cache-sync bugs
  under time pressure, and it's a one-line change to split them later
  since scoring.py and listener.py don't know or care how they're deployed."

Endpoint: GET /api/risk-score/:quotationId — per ICD §4, owner Team B,
returns "last computed score + reasoning".
"""

import threading
from fastapi import FastAPI
from datetime import datetime, timezone
from models import RiskScoreComputedEvent
from listener import start_listener

app = FastAPI(title="DealFlow360 — Discount Risk Engine (Team B)")

# Shared in-memory cache: quotationId -> last computed RiskScoreComputedEvent.
# Written by the background listener thread, read by the REST endpoint below.
LATEST_SCORES: dict[str, RiskScoreComputedEvent] = {}


@app.on_event("startup")
def launch_listener_in_background():
    """
    Starts the Redis listener on a daemon thread when the FastAPI app boots,
    so a single `uvicorn app:app` command brings up BOTH the REST endpoint
    and the event-driven scoring pipeline. Nothing else needs to be run
    separately for the core flow to work end-to-end.
    """
    thread = threading.Thread(target=start_listener, args=(LATEST_SCORES,), daemon=True)
    thread.start()
    print("[risk-engine] Background event listener thread started.")


@app.get("/")
def health_check():
    """Basic liveness check — useful for Team A during integration testing."""
    return {"status": "ok", "service": "discount-risk-engine"}


@app.get("/api/risk-score/{quotation_id}")
def get_risk_score(quotation_id: str):
    """
    Returns the most recently computed risk score for a given quotation.

    If we've never received a QuotationUpdated event for this quotationId
    (e.g. the rep hasn't touched this quote yet, or our listener was down
    when Team A published it), we return a safe "no data yet" response
    rather than an error — the frontend can render this as "not yet scored"
    instead of crashing on a 404.
    """
    if quotation_id in LATEST_SCORES:
        return LATEST_SCORES[quotation_id]

    return RiskScoreComputedEvent(
        eventVersion=1,
        quotationId=quotation_id,
        blendedRiskScore=0.0,
        requiresApproval=False,
        requiresFinance=False,
        flaggedLines=[],
        reason="No score computed yet for this quotation.",
        computedAt=datetime.now(timezone.utc).isoformat(),
    )


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
