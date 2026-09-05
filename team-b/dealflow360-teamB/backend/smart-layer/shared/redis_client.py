"""
redis_client.py — Centralized Redis connection manager for DealFlow360 Smart Layer.

Supports REDIS_URL (Upstash, Supabase, Cloud Redis) and REDIS_HOST + REDIS_PORT.
Maintains connection pooling and provides subscriber and publisher helpers.
"""

import os
from typing import Optional, Union
import redis
from pydantic import BaseModel

_clients: dict[tuple[str, int], redis.Redis] = {}
_clients: dict[str, redis.Redis] = {}


def get_client(host: str = None, port: int = None) -> redis.Redis:
def get_client(
    url: Optional[str] = None,
    host: Optional[str] = None,
    port: Optional[int] = None,
) -> redis.Redis:
    """
    Returns a cached Redis client supporting REDIS_URL or REDIS_HOST:REDIS_PORT.
    """
    redis_url = url or os.environ.get("REDIS_URL")
    if redis_url:
        key = redis_url
        if key not in _clients:
            _clients[key] = redis.Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=5,
            )
        return _clients[key]

    host = host or os.environ.get("REDIS_HOST", "localhost")
    port = port or int(os.environ.get("REDIS_PORT", 6379))
    key = (host, port)
    key = f"{host}:{port}"

    if key not in _clients:
        _clients[key] = redis.Redis(host=host, port=port, decode_responses=True)
        _clients[key] = redis.Redis(
            host=host,
            port=port,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=5,
        )

    return _clients[key]


def get_redis_client() -> redis.Redis:
    """Convenience alias returning the default Redis client."""
    return get_client()


def get_redis_subscriber(channel: str, client: Optional[redis.Redis] = None) -> redis.client.PubSub:
    """Creates a pubsub object and subscribes to the specified channel."""
    r = client or get_client()
    pubsub = r.pubsub()
    pubsub.subscribe(channel)
    return pubsub


def publish_event(
    channel: str,
    data: Union[str, dict, BaseModel],
    client: Optional[redis.Redis] = None,
    log_prefix: str = "",
) -> None:
    """Publishes string, dict, or Pydantic model payload to the specified channel."""
    r = client or get_client()
    if isinstance(data, BaseModel):
        payload = data.model_dump_json()
    elif isinstance(data, dict):
        import json
        payload = json.dumps(data)
    else:
        payload = str(data)

    r.publish(channel, payload)
    if log_prefix:
        print(f"{log_prefix} Published on '{channel}': {payload}")


def check_redis_connection(client: Optional[redis.Redis] = None) -> bool:
    """Pings Redis to test connectivity; returns True if reachable, False otherwise."""
    try:
        r = client or get_client()
        return bool(r.ping())
    except Exception as exc:
        print(f"[shared.redis] Connection check failed: {exc}")
        return False


def close_connections() -> None:
    """Closes all cached Redis client connections."""
    global _clients
    for key, c in list(_clients.items()):
        try:
            c.close()
        except Exception:
            pass
    _clients.clear()
