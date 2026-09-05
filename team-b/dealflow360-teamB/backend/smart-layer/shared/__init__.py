"""
shared — Reusable utilities across DealFlow360 Smart Layer engines.
"""

from .event_envelope import (
    now_utc_iso,
    BaseEventEnvelope,
    validate_discount_format,
    format_currency,
    is_valid_uuid,
    serialize_event,
    deserialize_event,
)

from .redis_client import (
    get_redis_client,
    get_redis_subscriber,
    publish_event,
    check_redis_connection,
    close_connections,
)

__all__ = [
    "now_utc_iso",
    "BaseEventEnvelope",
    "validate_discount_format",
    "format_currency",
    "is_valid_uuid",
    "serialize_event",
    "deserialize_event",
    "get_redis_client",
    "get_redis_subscriber",
    "publish_event",
    "check_redis_connection",
    "close_connections",
]

