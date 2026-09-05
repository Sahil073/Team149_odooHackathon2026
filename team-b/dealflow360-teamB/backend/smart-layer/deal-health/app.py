import threading
from typing import Optional
from fastapi import FastAPI, Query
import db
from listener import start_listener
from scheduler import start_scheduler

app = FastAPI(title="DealFlow360 — Deal Health Engine (Team B)")


@app.on_event("startup")
def launch_background_workers():
    db.init_db()

    listener_thread = threading.Thread(target=start_listener, daemon=True)
    listener_thread.start()

    scheduler_thread = threading.Thread(target=start_scheduler, daemon=True)
    scheduler_thread.start()

    print("[deal-health] Background listener and scheduler threads started.")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "deal-health-engine"}


@app.get("/api/deal-health-flags")
def get_deal_health_flags(severity: Optional[str] = Query(default=None)):
    flags = db.get_open_flags(severity=severity)
    return {"flags": [f.model_dump() for f in flags]}


@app.post("/api/deal-health-flags/{flag_id}/resolve")
def resolve_flag(flag_id: str):
    db.resolve_flag(flag_id)
    return {"status": "resolved", "flagId": flag_id}


if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.environ.get("PORT", 8003))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
