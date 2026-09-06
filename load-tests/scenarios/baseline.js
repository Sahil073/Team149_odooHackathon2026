/**
 * baseline.js - DealFlow360 Baseline / Normal Enterprise Load Test
 *
 * Simulates normal business hours traffic (10 -> 25 -> 50 concurrent VUs)
 * with realistic user think time (1s pacing) across all four core subsystem
 * endpoints:
 *   1. Infrastructure Health Baseline (GET /health)
 *   2. Product Catalog Browsing (GET /api/products)
 *   3. AI Win-Rate ML Inference (POST /api/ai/win-probability)
 *   4. Sales Rep Quotations List (GET /api/quotations)
 *
 * Run:
 *   k6 run load-tests/scenarios/baseline.js
 * Or with custom base URL:
 *   k6 run -e BASE_URL=https://team149-odoohackathon2026-1.onrender.com load-tests/scenarios/baseline.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { CONFIG, PAYLOADS, getAuthToken } from '../config/endpoints.js';
import { BASELINE_THRESHOLDS } from '../config/thresholds.js';

// Custom metric trends for granular per-endpoint SRE analysis
const trendHealth = new Trend('endpoint_health', true);
const trendProducts = new Trend('endpoint_products', true);
const trendAiWin = new Trend('endpoint_ai_win', true);
const trendQuotations = new Trend('endpoint_quotations', true);
const customErrorRate = new Rate('custom_error_rate');
const requestCounter = new Counter('total_business_requests');

export const options = {
  stages: [
    { duration: '20s', target: 10 },  // Warm-up to 10 VUs
    { duration: '30s', target: 10 },  // Steady-state 10 VUs (light enterprise load)
    { duration: '20s', target: 25 },  // Ramp-up to 25 VUs
    { duration: '40s', target: 25 },  // Steady-state 25 VUs (medium team load)
    { duration: '20s', target: 50 },  // Ramp-up to 50 VUs (peak enterprise load)
    { duration: '30s', target: 50 },  // Steady-state 50 VUs
    { duration: '20s', target: 0 },   // Cool-down
  ],
  thresholds: BASELINE_THRESHOLDS,
};

export function setup() {
  console.log(`=======================================================`);
  console.log(`[Baseline Test] Initializing DealFlow360 Load Test`);
  console.log(`[Baseline Test] Target Core API:    ${CONFIG.baseUrl}`);
  console.log(`[Baseline Test] Target Smart Layer: ${CONFIG.smartLayerUrl}`);
  console.log(`=======================================================`);

  const token = getAuthToken();
  return { token };
}

export default function (data) {
  const token = data.token;
  const authHeaders = token
    ? { ...CONFIG.headers, Authorization: `Bearer ${token}` }
    : CONFIG.headers;

  // ---------------------------------------------------------------------------
  // 1. Read-Heavy: Product Catalog Query (30% probability or sequential workflow)
  // ---------------------------------------------------------------------------
  {
    const res = http.get(`${CONFIG.baseUrl}/api/products`, {
      headers: CONFIG.headers,
      tags: { endpoint: 'products_catalog' },
    });
    trendProducts.add(res.timings.duration);
    requestCounter.add(1);

    const ok = check(res, {
      'catalog: status is 200': (r) => r.status === 200,
      'catalog: body is non-empty': (r) => r.body && r.body.length > 0,
    });
    customErrorRate.add(!ok);
  }

  // Realistic user pacing (think time: 1 second between navigation actions)
  sleep(1);

  // ---------------------------------------------------------------------------
  // 2. Compute-Heavy: Vectorized AI Win-Rate Prediction (Smart Layer)
  // ---------------------------------------------------------------------------
  {
    const res = http.post(
      `${CONFIG.smartLayerUrl}/api/ai/win-probability`,
      JSON.stringify(PAYLOADS.aiWinPredict),
      {
        headers: CONFIG.headers,
        tags: { endpoint: 'ai_win_predict' },
      }
    );
    trendAiWin.add(res.timings.duration);
    requestCounter.add(1);

    const ok = check(res, {
      'ai_win: status is 200': (r) => r.status === 200,
      'ai_win: valid score returned': (r) => {
        try {
          return typeof r.json().winProbability === 'number';
        } catch (_) {
          return false;
        }
      },
    });
    customErrorRate.add(!ok);
  }

  sleep(1);

  // ---------------------------------------------------------------------------
  // 3. Transactional Read: Sales Rep Quotations List (Core API with JWT)
  // ---------------------------------------------------------------------------
  {
    const res = http.get(`${CONFIG.baseUrl}/api/quotations`, {
      headers: authHeaders,
      tags: { endpoint: 'quotations_list' },
    });
    trendQuotations.add(res.timings.duration);
    requestCounter.add(1);

    const ok = check(res, {
      'quotations: response code < 500': (r) => r.status < 500,
      'quotations: status 200 when authenticated': (r) =>
        token ? r.status === 200 : true,
    });
    customErrorRate.add(!ok);
  }

  sleep(1);

  // ---------------------------------------------------------------------------
  // 4. Infrastructure Health Baseline (Lightweight event-loop check)
  // ---------------------------------------------------------------------------
  {
    const res = http.get(`${CONFIG.baseUrl}/health`, {
      headers: CONFIG.headers,
      tags: { endpoint: 'core_health' },
    });
    trendHealth.add(res.timings.duration);
    requestCounter.add(1);

    const ok = check(res, {
      'health: status is 200': (r) => r.status === 200,
    });
    customErrorRate.add(!ok);
  }

  sleep(1);
}

export function teardown(data) {
  console.log(`=======================================================`);
  console.log(`[Baseline Test] Completed. Check metrics summary above.`);
  console.log(`=======================================================`);
}
