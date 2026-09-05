"""publisher.py — publishes UpsellSuggestionsReady back to Redis (ICD §3.6)."""

import redis
import sys
from pathlib import Path

# Ensure smart-layer root is in sys.path for shared module imports
SMART_LAYER_DIR = Path(__file__).resolve().parents[1]
if str(SMART_LAYER_DIR) not in sys.path:
    sys.path.insert(0, str(SMART_LAYER_DIR))

from shared.redis_client import publish_event as shared_publish
from models import UpsellSuggestionsReadyEvent

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_READY = "UpsellSuggestionsReady"

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    return _client


def publish_upsell_suggestions_ready(result: UpsellSuggestionsReadyEvent) -> None:
    _get_client().publish(CHANNEL_READY, result.model_dump_json())
    shared_publish(CHANNEL_READY, result)
    print(f"[upsell-engine] Published {len(result.suggestions)} suggestion(s) "
          f"for quotationId={result.quotationId}")