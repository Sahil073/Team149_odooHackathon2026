# DealFlow360 — API & Event Bus Reference

## 1. REST Endpoints (Core API - Port 4000)

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Authenticate staff member (Rep, Manager, Finance, Admin) |
| `GET` | `/api/quotations` | Authenticated | List all accessible quotations with status filters |
| `POST` | `/api/quotations` | Authenticated | Create new draft quotation |
| `GET` | `/api/quotations/:id` | Authenticated | Fetch quotation details, lines, and approval state |
| `PUT` | `/api/quotations/:id` | Authenticated | Update quotation lines, quantities, and discounts |
| `POST` | `/api/approvals/:id/approve`| Manager/Finance | Approve a quotation pending approval |
| `POST` | `/api/approvals/:id/reject` | Manager/Finance | Reject a quotation with reason |
| `POST` | `/api/ai/win-probability` | Authenticated | Proxy live deal conversion prediction from Smart Layer |
| `POST` | `/api/risk-score/calculate` | Authenticated | Proxy on-demand discount risk analysis |
| `POST` | `/api/upsell-suggestions/compute` | Authenticated | Compute margin-driven upsell recommendations |
| `GET` | `/api/deal-health-flags` | Authenticated | Retrieve active deal health flags & anomalies |

---

## 2. Smart Layer Gateway Endpoints (FastAPI - Port 8000 / Cloud)

| Method | Endpoint | Payload / Params | Response |
| :--- | :--- | :--- | :--- |
| `GET` / `HEAD` | `/health` | None | `{"status": "ok", "service": "smart-layer-gateway"}` |
| `POST` | `/api/ai/win-probability` | `{"customerTier": "Gold", "totalRevenue": 25000, "avgDiscountPct": 8.0, "itemCount": 5, "riskScore": 0.1}` | `{"winProbability": 0.96, "status": "HIGH", "confidence": 0.89, "keyDriver": "...", "recommendedDiscountPct": 0}` |
| `POST` | `/api/risk-score/calculate` | `{"quotationId": "...", "customerTier": "Bronze", "lines": [...]}` | `{"blendedRiskScore": 1.0, "requiresApproval": true, "requiresFinance": true, "reason": "..."}` |
| `POST` | `/api/upsell-suggestions/compute` | `{"quotationId": "...", "items": [...]}` | `{"suggestions": [{"productId": "...", "productName": "...", "marginDelta": 225.0, "rankScore": 1.0}]}` |
| `GET` | `/api/deal-health-flags` | `?quotationId=...` | `{"flags": [...]}` |

---

## 3. Redis Pub/Sub Event Channels

| Channel | Publisher | Consumer | Payload Shape |
| :--- | :--- | :--- | :--- |
| `QuotationUpdated` | Core API | Smart Layer (Risk & Health) | Quotation ID, customer tier, sales rep ID, item lines with discounts |
| `RiskScoreComputed` | Smart Layer (Risk) | Core API | Blended risk score (0.00-1.00), approval flags, reason |
| `UpsellSuggestionsRequested` | Core API | Smart Layer (Upsell) | Quotation ID, existing line items |
| `UpsellSuggestionsReady` | Smart Layer (Upsell) | Core API | Ranked list of accessories, margin deltas, reasons |
| `DealHealthFlagRaised` | Smart Layer (Health) | Core API | Quotation ID, flag type (`DISCOUNT_SPIKE`, `STALLED`), severity |
