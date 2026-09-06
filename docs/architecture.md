# DealFlow360 — Architecture & System Design

## 1. Architectural Philosophy: Dual-Path Resilience

DealFlow360 separates the **Core Transactional Engine** from the **Smart Layer Intelligence** to adhere to three fundamental design principles:

1. **Non-Blocking Write Path (Asynchronous Events)**:
   When a sales rep saves or updates a quote, the transactional save in PostgreSQL completes in $<15\text{ms}$. A `QuotationUpdated` event is published to Redis Pub/Sub in the background. The Smart Layer consumes this event, calculates risk scores and upsell options, and publishes results back asynchronously.

2. **Zero-Latency Read Path (Synchronous Gateway)**:
   When a user interacts with the Quotation Builder UI in real-time, the frontend or Core API calls the Smart Layer's unified FastAPI gateway. This provides instantaneous AI feedback ($<50\text{ms}$) on Deal Win Probability, Risk Evaluation, and Upsell Ranking.

3. **Graceful Degradation (Fail-Safe Fallbacks)**:
   If the Python Smart Layer or Redis goes offline, the Core API activates deterministic in-memory fallback algorithms. The end user never experiences a broken quotation flow, 500 server crash, or blocking modal.

---

## 2. Cross-Service Interaction Model

```
[ Frontend (React 19) ]
       │
       ▼ (HTTP / JWT)
[ Core API (Express / Prisma) ] ── (Synchronous Proxy) ──▶ [ Smart Layer Gateway ]
       │                                                         │
       ▼ (Event Publishing)                                      ▼ (Inference)
[ Redis Pub/Sub Event Bus ] ◀── (Asynchronous Events) ─── [ Risk / Upsell / ML / Health ]
```

---

## 3. Storage Separation & ICD Compliance

- **PostgreSQL**: Stores the system of record (Tenants, Users, Products, PriceLists, Quotations, QuotationLines, Approvals, Invoices, Payments, AuditLogs).
- **SQLite / Local State**: Stores isolated Smart Layer internal tracking state (Deal Health flags, baseline snapshot histories).
- **Redis**: Acts as the shared ephemeral event broker. No raw SQL connections are shared between the Python Smart Layer and PostgreSQL, strictly honoring the Interface Control Document (ICD).
