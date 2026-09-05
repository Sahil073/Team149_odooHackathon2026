"""
shared/event_envelope.py � NOT YET BUILT.

Sprint: Sprint 3 (extract when duplication appears)
Purpose: Common eventVersion/timestamp helpers per ICD 7 data format standards

This file is a placeholder so the full repo shape is visible from Sprint 1.
Fill this in when its sprint starts.
"""

# TODO (Sprint 3 (extract when duplication appears)): implement common eventversion/timestamp helpers per icd 7 data format standards
"""
shared/event_envelope.py — Common event envelope and data format standards.

Conforms strictly to ICD (Interface Control Document) §7 Data Format Standards:
- eventVersion: int = 1 (every payload includes eventVersion)
- timestamps: ISO8601 string in UTC (no timezone ambiguity)
- IDs: UUID string (avoids collision across test/seed data)
- discounts: Plain numbers, e.g. 12 means 12% (NOT 0.12)
- currency: Number with 2 decimal places (single currency)
"""

from datetime import datetime, timezone
from typing import TypeVar, Type, Any, Union
import json
import uuid
import logging
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("shared.event_envelope")

T = TypeVar("T", bound=BaseModel)


def now_utc_iso() -> str:
    """
    Returns the current UTC timestamp formatted as an ISO8601 string.
    Ensures consistent timestamp generation across all smart-layer engines.
    """
    return datetime.now(timezone.utc).isoformat()


def validate_discount_format(value: float, field_name: str = "discount") -> float:
    """
    Validates discount percentage per ICD §7:
    Discounts must be whole numbers (e.g. 12 for 12%, not 0.12).
    Logs a warning if a fraction < 1.0 (and > 0.0) is detected.
    """
    if 0.0 < value < 1.0:
        logger.warning(
            f"Possible fractional discount detected in {field_name}: {value}. "
            "Per ICD §7, discount percentages must be whole numbers (e.g., 12 for 12%, not 0.12)."
        )
    return value


def format_currency(value: float) -> float:
    """
    Rounds currency values to 2 decimal places per ICD §7.
    """
    return round(float(value), 2)


def is_valid_uuid(val: str) -> bool:
    """
    Checks if a string is a valid UUID per ICD §7.
    """
    try:
        uuid.UUID(str(val))
        return True
    except (ValueError, TypeError, AttributeError):
        return False


class BaseEventEnvelope(BaseModel):
    """
    Base envelope for all domain events across the Smart Layer.
    All events published or consumed conform to this envelope.
    """
    eventVersion: int = Field(
        default=1,
        description="Event schema version per ICD §7 (starts at 1)"
    )
    timestamp: str = Field(
        default_factory=now_utc_iso,
        description="ISO8601 string in UTC"
    )

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


def serialize_event(event: BaseModel) -> str:
    """
    Serializes a Pydantic event model to a JSON string matching the ICD wire format.
    """
    if hasattr(event, "model_dump_json"):
        return event.model_dump_json()
    return event.json()  # Pydantic v1 fallback


def deserialize_event(raw_payload: Union[str, bytes, dict], event_cls: Type[T]) -> T:
    """
    Deserializes raw JSON or dictionary payload into a validated Pydantic model.
    Raises ValueError with context if validation or JSON parsing fails.
    """
    try:
        if isinstance(raw_payload, (str, bytes)):
            payload_dict = json.loads(raw_payload)
        elif isinstance(raw_payload, dict):
            payload_dict = raw_payload
        else:
            raise TypeError(f"Unsupported payload type: {type(raw_payload)}")

        if hasattr(event_cls, "model_validate"):
            return event_cls.model_validate(payload_dict)
        return event_cls(**payload_dict)  # Pydantic v1 fallback
    except Exception as exc:
        logger.error(f"Failed to deserialize event to {event_cls.__name__}: {exc}")
        raise ValueError(f"Invalid event payload for {event_cls.__name__}: {exc}") from exc
