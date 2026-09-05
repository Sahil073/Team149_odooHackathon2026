"""
listener.py - Redis Pub/Sub subscriber for the QuotationUpdated event (ICD 3.1).
SPRINT 1: stub - logs received events, does not score yet.
SPRINT 2 TODO: call compute_blended_risk_score() and pass result to publisher.py
"""

import json
import redis
from models import QuotationUpdatedEvent

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_QUOTATION_UPDATED = "QuotationUpdated"


def start_listener():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe(CHANNEL_QUOTATION_UPDATED)

    print(f"[risk-engine] Subscribed to '{CHANNEL_QUOTATION_UPDATED}'. Waiting for events...")

    for message in pubsub.listen():
        if message["type"] != "message":
            continue

        raw_payload = message["data"]
        print(f"[risk-engine] Received raw event: {raw_payload}")

        try:
            payload_dict = json.loads(raw_payload)
            event = QuotationUpdatedEvent(**payload_dict)
            print(f"[risk-engine] Validated event for quotationId={event.quotationId}, "
                  f"{len(event.lines)} line(s). (Sprint 1: not scoring yet - stub only.)")
        except Exception as e:
            print(f"[risk-engine] ERROR: failed to parse/validate event: {e}")


if __name__ == "__main__":
    start_listener()
