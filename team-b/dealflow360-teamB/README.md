# DealFlow360 — Team B (Smart Layer)

Team B owns the "intelligence" of DealFlow360: computing things, never
storing core transactional data. Per the ICD, we never read or write
Team A's database tables directly — every interaction happens through
Redis Pub/Sub events (write/trigger path) or small REST endpoints we
expose for the frontend to read from (read path).

## Services

| Service        | Sprint | Owns                                   |
|----------------|--------|------------------------------------------|
| risk-engine    | 1-2    | Blended discount risk scoring             |
| upsell-engine  | 3      | Upsell / cross-sell ranking               |
| deal-health    | 5      | Stalled deal / anomaly / slippage flags (owns DealHealthFlag table) |

## Running a service locally

```
cd backend/smart-layer/<service-name>
pip install -r requirements.txt
uvicorn app:app --reload --port 8001   # REST side
python listener.py                      # event side, separate terminal
```

## Golden rule (from the ICD)

Never query Team A's tables directly. Everything comes in/out via:
1. Redis Pub/Sub events (see each service's `models.py` for exact payload shapes)
2. REST endpoints we expose, proxied by Team A's API gateway
