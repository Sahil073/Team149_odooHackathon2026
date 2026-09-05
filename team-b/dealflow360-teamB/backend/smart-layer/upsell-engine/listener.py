"""listener.py — subscribes to UpsellSuggestionsRequested (ICD §3.6)."""

import json
import redis
import sys
from pathlib import Path

# Ensure smart-layer root is in sys.path for shared module imports
SMART_LAYER_DIR = Path(__file__).resolve().parents[1]
if str(SMART_LAYER_DIR) not in sys.path:
    sys.path.insert(0, str(SMART_LAYER_DIR))

from shared.redis_client import get_redis_subscriber
from models import UpsellSuggestionsRequestedEvent
from ranking import compute_upsell_suggestions
from publisher import publish_upsell_suggestions_ready

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_REQUESTED = "UpsellSuggestionsRequested"


def start_listener(cache: dict):
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe(CHANNEL_REQUESTED)
    pubsub = get_redis_subscriber(CHANNEL_REQUESTED)
    print(f"[upsell-engine] Subscribed to '{CHANNEL_REQUESTED}'. Waiting for events...")

    for message in pubsub.listen():
        if message["type"] != "message":
            continue
        try:
            event = UpsellSuggestionsRequestedEvent(**json.loads(message["data"]))
        except Exception as e:
            print(f"[upsell-engine] ERROR parsing event: {e}")
            continue

        try:
            result = compute_upsell_suggestions(event)
            publish_upsell_suggestions_ready(result)
            cache[event.quotationId] = result
        except Exception as e:
            print(f"[upsell-engine] ERROR computing/publishing: {e}")


if __name__ == "__main__":
    start_listener({})