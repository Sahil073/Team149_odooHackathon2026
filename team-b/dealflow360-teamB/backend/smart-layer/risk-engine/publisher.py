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
import sys
from pathlib import Path

# Ensure smart-layer root is in sys.path for shared module imports
SMART_LAYER_DIR = Path(__file__).resolve().parents[1]
if str(SMART_LAYER_DIR) not in sys.path:
    sys.path.insert(0, str(SMART_LAYER_DIR))

from shared.redis_client import publish_event as shared_publish
from models import RiskScoreComputedEvent

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_RISK_SCORE_COMPUTED = "RiskScoreComputed"

def publish_risk_score_computed(result: RiskScoreComputedEvent) -> None:
    """
    Publishes a RiskScoreComputed event to Redis so Team A's
    quotation.service.ts and approval.service.ts can react.
    """
    shared_publish(CHANNEL_RISK_SCORE_COMPUTED, result)
    print(f"[risk-engine] Published RiskScoreComputed for quotationId={result.quotationId} "
          f"(requiresApproval={result.requiresApproval}, requiresFinance={result.requiresFinance})")

