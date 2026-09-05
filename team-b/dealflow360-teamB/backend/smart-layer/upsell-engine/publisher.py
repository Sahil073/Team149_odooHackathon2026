"""publisher.py — publishes UpsellSuggestionsReady back to Redis (ICD §3.6)."""

import redis
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
    print(f"[upsell-engine] Published {len(result.suggestions)} suggestion(s) "
          f"for quotationId={result.quotationId}")