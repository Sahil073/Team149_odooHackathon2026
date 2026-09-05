"""app.py — GET /api/upsell-suggestions/:quotationId (ICD §4)."""

import threading
from fastapi import FastAPI
from datetime import datetime, timezone
from models import UpsellSuggestionsReadyEvent
from listener import start_listener

app = FastAPI(title="DealFlow360 — Upsell Engine (Team B)")
LATEST_SUGGESTIONS: dict[str, UpsellSuggestionsReadyEvent] = {}


@app.on_event("startup")
def launch_listener():
    threading.Thread(target=start_listener, args=(LATEST_SUGGESTIONS,), daemon=True).start()


@app.get("/")
def health_check():
    return {"status": "ok", "service": "upsell-engine"}


@app.get("/api/upsell-suggestions/{quotation_id}")
def get_suggestions(quotation_id: str):
    if quotation_id in LATEST_SUGGESTIONS:
        return LATEST_SUGGESTIONS[quotation_id]
    return UpsellSuggestionsReadyEvent(
        eventVersion=1, quotationId=quotation_id, suggestions=[],
        computedAt=datetime.now(timezone.utc).isoformat(),
    )