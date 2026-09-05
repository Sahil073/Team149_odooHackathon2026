"""
shared/redis_client.py — Centralized Redis connection and pub/sub helper.

Sprint: Sprint 3 (Shared Infrastructure)
Purpose: Reusable Redis connection pool and pub/sub utilities across all
         smart-layer engines (risk-engine, deal-health, upsell-engine).
"""

import os
import json
import logging
from typing import Optional, Union
import redis
from pydantic import BaseModel

logger = logging.getLogger("shared.redis_client")

# Configuration via environment variables with safe defaults for local development
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# Shared connection pool and client instances
_connection_pool: Optional[redis.ConnectionPool] = None
_redis_client: Optional[redis.Redis] = None


def get_connection_pool() -> redis.ConnectionPool:
    """
    Returns or initializes the shared Redis connection pool.
    """
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = redis.ConnectionPool(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            password=REDIS_PASSWORD,
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
            retry_on_timeout=True,
        )
    return _connection_pool


def get_redis_client() -> redis.Redis:
    """
    Returns a shared Redis client backed by the connection pool.
    """
    global _redis_client
    if _redis_client is None:
        pool = get_connection_pool()
        _redis_client = redis.Redis(connection_pool=pool)
    return _redis_client


def check_redis_connection() -> bool:
    """
    Performs a health-check ping to verify Redis connectivity.
    Returns True if healthy, False otherwise.
    """
    try:
        client = get_redis_client()
        return bool(client.ping())
    except Exception as exc:
        logger.warning(f"Redis health check failed: {exc}")
        return False


def publish_event(channel: str, message: Union[BaseModel, dict, str]) -> int:
    """
    Publishes an event to the specified Redis channel.
    Automatically serializes Pydantic models and dictionaries to JSON.

    Returns the number of subscribers that received the message.
    """
    client = get_redis_client()

    if isinstance(message, BaseModel):
        if hasattr(message, "model_dump_json"):
            payload = message.model_dump_json()
        else:
            payload = message.json()
    elif isinstance(message, dict):
        payload = json.dumps(message)
    elif isinstance(message, str):
        payload = message
    else:
        raise TypeError(f"Unsupported message type for Redis publish: {type(message)}")

    try:
        receivers = client.publish(channel, payload)
        logger.debug(f"[redis] Published to '{channel}' ({receivers} subscribers)")
        return receivers
    except Exception as exc:
        logger.error(f"[redis] Failed to publish message to '{channel}': {exc}")
        raise


def get_redis_subscriber(*channels: str) -> redis.client.PubSub:
    """
    Creates and returns a Redis PubSub subscriber subscribed to the given channels.
    """
    client = get_redis_client()
    pubsub = client.pubsub()
    if channels:
        pubsub.subscribe(*channels)
        logger.info(f"[redis] Subscribed to channels: {', '.join(channels)}")
    return pubsub


def close_connections() -> None:
    """
    Closes the Redis client and connection pool cleanly on shutdown.
    """
    global _redis_client, _connection_pool
    if _redis_client is not None:
        try:
            _redis_client.close()
        except Exception:
            pass
        _redis_client = None

    if _connection_pool is not None:
        try:
            _connection_pool.disconnect()
        except Exception:
            pass
        _connection_pool = None
