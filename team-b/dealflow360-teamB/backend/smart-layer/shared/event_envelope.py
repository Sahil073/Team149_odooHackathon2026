import json
from typing import Callable, Type
from pydantic import BaseModel
from redis_client import get_client


def publish_event(channel: str, event: BaseModel, log_prefix: str = "") -> None:
    client = get_client()
    payload = event.model_dump_json()
    client.publish(channel, payload)
    if log_prefix:
        print(f"{log_prefix} Published on '{channel}': {payload}")


def listen(
    channel: str,
    event_model: Type[BaseModel],
    on_event: Callable[[BaseModel], None],
    log_prefix: str = "",
) -> None:
    client = get_client()
    pubsub = client.pubsub()
    pubsub.subscribe(channel)

    if log_prefix:
        print(f"{log_prefix} Subscribed to '{channel}'. Waiting for events...")

    for message in pubsub.listen():
        if message["type"] != "message":
            continue

        try:
            event = event_model(**json.loads(message["data"]))
        except Exception as e:
            if log_prefix:
                print(f"{log_prefix} ERROR: failed to parse/validate event: {e}")
            continue

        try:
            on_event(event)
        except Exception as e:
            if log_prefix:
                print(f"{log_prefix} ERROR: handler failed: {e}")
