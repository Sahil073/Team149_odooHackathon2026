"""
publisher.py — Publishes the RiskScoreComputed event back to Redis.

Per ICD §3.2:
  Published by: Team B, discount-risk-engine
  Consumed by: Team A, quotation.service.ts (stores score),
               approval.service.ts (decides routing — creates an
               ApprovalRequired event if requiresApproval is true)

This completes the request/response event pair with listener.py:
  listener.py:  QuotationUpdated  (Team A -> us, "here's a quote, score it")
  publisher.py: RiskScoreComputed (us -> Team A, "here's the verdict")

WHY THIS IS A SEPARATE FILE FROM listener.py:
  Listening and publishing are different responsibilities on different
  Redis channels. Keeping them apart makes each easy to test/mock in
  isolation, and mirrors how the ICD itself describes each event as having
  a distinct publisher and consumer.
"""

import json
import redis
from models import RiskScoreComputedEvent

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_RISK_SCORE_COMPUTED = "RiskScoreComputed"

_redis_client = None


def _get_client():
    """Lazily create a single shared Redis connection (avoid reconnecting per publish)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    return _redis_client


def publish_risk_score_computed(result: RiskScoreComputedEvent) -> None:
    """
    Publishes a RiskScoreComputed event to Redis so Team A's
    quotation.service.ts and approval.service.ts can react.

    Uses .model_dump_json() (Pydantic v2) so the payload on the wire is
    byte-for-byte the JSON shape defined in models.py / ICD §3.2 — no
    manual dict-building that could drift from the contract.
    """
    client = _get_client()
    payload = result.model_dump_json()
    client.publish(CHANNEL_RISK_SCORE_COMPUTED, payload)
    print(f"[risk-engine] Published RiskScoreComputed for quotationId={result.quotationId} "
          f"(requiresApproval={result.requiresApproval}, requiresFinance={result.requiresFinance})")
