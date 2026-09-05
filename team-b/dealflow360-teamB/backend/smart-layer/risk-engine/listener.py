"""
listener.py — Redis Pub/Sub subscriber for QuotationUpdated (ICD §3.1).

SPRINT 2: this is now the REAL, complete write-path pipeline:
  1. Receive + validate a QuotationUpdated event
  2. Run compute_blended_risk_score() (scoring.py)
  3. Publish the result as RiskScoreComputed (publisher.py)
  4. Cache the result in memory so app.py's REST endpoint (§4 Read Contract)
     can answer instantly on the next page load, without recomputing

WHY WE CACHE HERE INSTEAD OF RECOMPUTING ON EVERY REST REQUEST:
  The frontend may load the Quotation Detail screen many times while the
  rep is mid-edit. Recomputing on every GET would be wasteful and could
  drift from what was actually published on the event bus. Caching the
  last computed result means REST reads are always consistent with what
  Team A received via the event.
"""

import json
import redis
import sys
from pathlib import Path

# Ensure smart-layer root is in sys.path for shared module imports
SMART_LAYER_DIR = Path(__file__).resolve().parents[1]
if str(SMART_LAYER_DIR) not in sys.path:
    sys.path.insert(0, str(SMART_LAYER_DIR))

from shared.redis_client import get_redis_subscriber
from models import QuotationUpdatedEvent
from scoring import compute_blended_risk_score
from publisher import publish_risk_score_computed

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_QUOTATION_UPDATED = "QuotationUpdated"


def start_listener(cache: dict):
    """
    `cache` is the shared LATEST_SCORES dict from app.py, passed in so the
    REST endpoint and the event listener see the same data without needing
    a database — this only works because we run both in the same process
    (see app.py's startup hook). In a full microservice split, this would
    instead be a Redis GET/SET or a small DB table.
    """
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe(CHANNEL_QUOTATION_UPDATED)
    pubsub = get_redis_subscriber(CHANNEL_QUOTATION_UPDATED)

    print(f"[risk-engine] Subscribed to '{CHANNEL_QUOTATION_UPDATED}'. Waiting for events...")

    for message in pubsub.listen():
        if message["type"] != "message":
            continue

        raw_payload = message["data"]

        try:
            payload_dict = json.loads(raw_payload)
            event = QuotationUpdatedEvent(**payload_dict)
        except Exception as e:
            # Fail loud in logs, but never crash the listener — one bad
            # event must not take down the whole service (per ICD §5
            # fallback philosophy: the smart layer being flaky must never
            # block or break the core transaction, including itself).
            print(f"[risk-engine] ERROR: failed to parse/validate event: {e}")
            continue

        try:
            result = compute_blended_risk_score(event)
            publish_risk_score_computed(result)
            cache[event.quotationId] = result
            print(f"[risk-engine] Scored quotationId={event.quotationId}: "
                  f"blendedRiskScore={result.blendedRiskScore}, "
                  f"requiresApproval={result.requiresApproval}")
        except Exception as e:
            print(f"[risk-engine] ERROR: scoring/publishing failed for "
                  f"quotationId={event.quotationId}: {e}")


if __name__ == "__main__":
    # Standalone run (e.g. `python listener.py` in its own terminal) uses
    # a local dict as the cache — fine for manual testing, though in that
    # mode app.py's REST endpoint won't see these scores since they're in
    # a different process's memory. Normal operation runs this inside
    # app.py's background thread instead (see app.py).
    start_listener({})
