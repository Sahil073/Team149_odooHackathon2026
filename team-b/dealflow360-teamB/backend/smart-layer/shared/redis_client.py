import os
from typing import Optional, Union
import redis
from pydantic import BaseModel

_clients: dict[str, redis.Redis] = {}


def get_client(
    url: Optional[str] = None,
    host: Optional[str] = None,
    port: Optional[int] = None,
) -> redis.Redis:
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
    key = f"{host}:{port}"

    if key not in _clients:
        _clients[key] = redis.Redis(
            host=host,
            port=port,
            decode_responses=True,
            socket_connect_timeout=3,
            socket_timeout=5,
        )

    return _clients[key]


def get_redis_client() -> redis.Redis:
    return get_client()


def get_redis_subscriber(channel: str, client: Optional[redis.Redis] = None) -> redis.client.PubSub:
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
    try:
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
    except Exception as exc:
        print(f"[shared.redis] Note: Redis publish skipped on channel '{channel}' ({exc})")



def check_redis_connection(client: Optional[redis.Redis] = None) -> bool:
    try:
        r = client or get_client()
        return bool(r.ping())
    except Exception as exc:
        print(f"[shared.redis] Connection check failed: {exc}")
        return False


def close_connections() -> None:
    global _clients
    for key, c in list(_clients.items()):
        try:
            c.close()
        except Exception:
            pass
    _clients.clear()