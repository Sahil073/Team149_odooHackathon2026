import redis
from models import DealHealthFlagEvent

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_DEAL_HEALTH_FLAG_RAISED = "DealHealthFlagRaised"

_redis_client = None


def _get_client():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    return _redis_client


def publish_deal_health_flag_raised(flag: DealHealthFlagEvent) -> None:
    client = _get_client()
    payload = flag.model_dump_json()
    client.publish(CHANNEL_DEAL_HEALTH_FLAG_RAISED, payload)
    print(
        f"[deal-health] Published DealHealthFlagRaised quotationId={flag.quotationId} "
        f"flagType={flag.flagType} severity={flag.severity}"
    )
