import json
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Optional, Type, TypeVar, Union
from pydantic import BaseModel, Field

try:
    from .redis_client import get_client
except ImportError:
    try:
        from shared.redis_client import get_client
    except ImportError:
        from redis_client import get_client


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_valid_uuid(val: Any) -> bool:
    if isinstance(val, uuid.UUID):
        return True
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def validate_discount_format(val: float) -> float:
    if val < 0.0 or val > 100.0:
        raise ValueError(f"Discount percentage must be between 0.0 and 100.0, got {val}")
    return float(val)


def format_currency(amount: float) -> str:
    return f"${amount:,.2f}"


class BaseEventEnvelope(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str
    timestamp: str = Field(default_factory=now_utc_iso)
    version: int = 1
    payload: dict[str, Any] = Field(default_factory=dict)


T = TypeVar("T", bound=BaseModel)


def serialize_event(event: BaseModel) -> str:
    return event.model_dump_json()


def deserialize_event(data: Union[str, bytes, dict], model_cls: Type[T]) -> T:
    if isinstance(data, (str, bytes)):
        data = json.loads(data)
    return model_cls(**data)


def publish_event(channel: str, event: Union[BaseModel, dict], log_prefix: str = "") -> None:
    client = get_client()
    if isinstance(event, BaseModel):
        payload = event.model_dump_json()
    elif isinstance(event, dict):
        payload = json.dumps(event)
    else:
        payload = str(event)

    client.publish(channel, payload)
    if log_prefix:
        print(f"{log_prefix} Published on '{channel}': {payload}")


def listen(
    channel: str,
    event_model: Type[BaseModel],
    on_event: Callable[[Any], None],
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
