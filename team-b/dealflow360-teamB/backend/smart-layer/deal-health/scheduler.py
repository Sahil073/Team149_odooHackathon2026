import time
from datetime import datetime, timezone
import db
from detection import run_all_checks
from publisher import publish_deal_health_flag_raised

SCAN_INTERVAL_SECONDS = 60


def _handle_flag(flag) -> None:
    if db.has_open_flag(flag.quotationId, flag.flagType):
        return
    db.insert_flag(flag)
    publish_deal_health_flag_raised(flag)


def run_sweep():
    now = datetime.now(timezone.utc)
    states = db.get_all_quote_states()

    for state in states:
        rep_baseline = db.get_rep_baseline_avg_discount(state.salesRepId, state.quotationId)
        flags = run_all_checks(state, rep_baseline, now)
        for flag in flags:
            _handle_flag(flag)

    print(f"[deal-health] Sweep complete: {len(states)} quotes checked at {now.isoformat()}")


def start_scheduler():
    while True:
        try:
            run_sweep()
        except Exception as e:
            print(f"[deal-health] ERROR: scheduled sweep failed: {e}")
        time.sleep(SCAN_INTERVAL_SECONDS)


if __name__ == "__main__":
    db.init_db()
    start_scheduler()
