import os
import redis

_clients: dict[tuple[str, int], redis.Redis] = {}


def get_client(host: str = None, port: int = None) -> redis.Redis:
    host = host or os.environ.get("REDIS_HOST", "localhost")
    port = port or int(os.environ.get("REDIS_PORT", 6379))
    key = (host, port)

    if key not in _clients:
        _clients[key] = redis.Redis(host=host, port=port, decode_responses=True)

    return _clients[key]
