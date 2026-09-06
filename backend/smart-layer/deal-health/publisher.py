import redis
import sys
from pathlib import Path

# Ensure smart-layer root is in sys.path for shared module imports
SMART_LAYER_DIR = Path(__file__).resolve().parents[1]
if str(SMART_LAYER_DIR) not in sys.path:
    sys.path.insert(0, str(SMART_LAYER_DIR))

from shared.redis_client import publish_event as shared_publish
from models import DealHealthFlagEvent

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_DEAL_HEALTH_FLAG_RAISED = "DealHealthFlagRaised"

def publish_deal_health_flag_raised(flag: DealHealthFlagEvent) -> None:
    shared_publish(CHANNEL_DEAL_HEALTH_FLAG_RAISED, flag)
    print(
        f"[deal-health] Published DealHealthFlagRaised quotationId={flag.quotationId} "
        f"flagType={flag.flagType} severity={flag.severity}"
    )

