import json
import redis
from datetime import datetime, timezone
from models import QuotationUpdatedEvent
from detection import check_discount_anomaly, run_all_checks
import db
from publisher import publish_deal_health_flag_raised

REDIS_HOST = "localhost"
REDIS_PORT = 6379
CHANNEL_QUOTATION_UPDATED = "QuotationUpdated"


def _handle_flag(flag) -> None:
    if db.has_open_flag(flag.quotationId, flag.flagType):
        return
    db.insert_flag(flag)
    publish_deal_health_flag_raised(flag)


def start_listener():
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    pubsub = r.pubsub()
    pubsub.subscribe(CHANNEL_QUOTATION_UPDATED)

    print(f"[deal-health] Subscribed to '{CHANNEL_QUOTATION_UPDATED}'. Waiting for events...")

    for message in pubsub.listen():
        if message["type"] != "message":
            continue

        try:
            payload_dict = json.loads(message["data"])
            event = QuotationUpdatedEvent(**payload_dict)
        except Exception as e:
            print(f"[deal-health] ERROR: failed to parse/validate event: {e}")
            continue

        try:
            state = db.upsert_quote_state(event)
            rep_baseline = db.get_rep_baseline_avg_discount(state.salesRepId, state.quotationId)
            now = datetime.now(timezone.utc)

            flag = check_discount_anomaly(state, rep_baseline, now)
            if flag:
                _handle_flag(flag)

            print(f"[deal-health] Tracked quotationId={event.quotationId}, avgDiscount={state.avgDiscountPct:.1f}%")
        except Exception as e:
            print(f"[deal-health] ERROR: processing failed for quotationId={event.quotationId}: {e}")


if __name__ == "__main__":
    db.init_db()
    start_listener()
