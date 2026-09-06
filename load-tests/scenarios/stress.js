/**
 * stress.js - DealFlow360 Stress & Saturation Load Test
 *
 * Ramps up concurrency through high-stress tiers (25 -> 50 -> 100 -> 150 -> 200 VUs)
 * to locate the saturation ceiling, detect response degradation inflection points,
 * and assess system resilience under extreme concurrent enterprise demand.
 *
 * Run:
 *   k6 run load-tests/scenarios/stress.js
 * Or save JSON report:
 *   k6 run --out json=results/stress-results.json load-tests/scenarios/stress.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { CONFIG, PAYLOADS, getAuthToken } from '../config/endpoints.js';
import { STRESS_THRESHOLDS } from '../config/thresholds.js';

// Detailed telemetry metrics
const trendStressHealth = new Trend('stress_health_duration', true);
const trendStressProducts = new Trend('stress_products_duration', true);
const trendStressAiWin = new Trend('stress_ai_win_duration', true);
const trendStressQuotes = new Trend('stress_quotes_duration', true);
const failureRate = new Rate('stress_failure_rate');
const totalRequests = new Counter('stress_total_requests');

export const options = {
  stages: [
    { duration: '25s', target: 25 },   // Ramp to 25 VUs
    { duration: '35s', target: 50 },   // Ramp to 50 VUs
    { duration: '45s', target: 100 },  // Ramp to 100 VUs (Enterprise high load)
    { duration: '45s', target: 150 },  // Ramp to 150 VUs (Heavy stress)
    { duration: '45s', target: 200 },  // Ramp to 200 VUs (Saturation peak)
    { duration: '30s', target: 200 },  // Hold at peak saturation
    { duration: '30s', target: 0 },    // Graceful recovery cool-down
  ],
  thresholds: STRESS_THRESHOLDS,
};

export function setup() {
  console.log(`=======================================================`);
  console.log(`[Stress Test] DEALFLOW360 HIGH-CONCURRENCY STRESS TEST`);
  console.log(`[Stress Test] Maximum Target Concurrency: 200 VUs`);
  console.log(`[Stress Test] Target Core API:    ${CONFIG.baseUrl}`);
  console.log(`[Stress Test] Target Smart Layer: ${CONFIG.smartLayerUrl}`);
  console.log(`=======================================================`);

  const token = getAuthToken();
  return { token };
}

export default function (data) {
  const token = data.token;
  const authHeaders = token
    ? { ...CONFIG.headers, Authorization: `Bearer ${token}` }
    : CONFIG.headers;

  // 1. Read-Heavy Catalog Under High Concurrency
  {
    const res = http.get(`${CONFIG.baseUrl}/api/products`, {
      headers: CONFIG.headers,
      tags: { endpoint: 'products_catalog' },
    });
    trendStressProducts.add(res.timings.duration);
    totalRequests.add(1);

    const ok = check(res, {
      'products: status 200': (r) => r.status === 200,
    });
    failureRate.add(!ok);
  }

  // Realistic human pacing (staggered 0.5s - 1.5s think time)
  sleep(0.5);

  // 2. Compute-Heavy ML Inference Under High Concurrency
  {
    const res = http.post(
      `${CONFIG.smartLayerUrl}/api/ai/win-probability`,
      JSON.stringify(PAYLOADS.aiWinPredict),
      {
        headers: CONFIG.headers,
        tags: { endpoint: 'ai_win_predict' },
      }
    );
    trendStressAiWin.add(res.timings.duration);
    totalRequests.add(1);

    const ok = check(res, {
      'ai_win: status 200': (r) => r.status === 200,
    });
    failureRate.add(!ok);
  }

  sleep(0.5);

  // 3. Authenticated Quotations Join Under High Concurrency
  {
    const res = http.get(`${CONFIG.baseUrl}/api/quotations`, {
      headers: authHeaders,
      tags: { endpoint: 'quotations_list' },
    });
    trendStressQuotes.add(res.timings.duration);
    totalRequests.add(1);

    const ok = check(res, {
      'quotations: no server crash (<500)': (r) => r.status < 500,
    });
    failureRate.add(!ok);
  }

  sleep(0.5);

  // 4. Infrastructure Health Check
  {
    const res = http.get(`${CONFIG.baseUrl}/health`, {
      headers: CONFIG.headers,
      tags: { endpoint: 'core_health' },
    });
    trendStressHealth.add(res.timings.duration);
    totalRequests.add(1);

    const ok = check(res, {
      'health: status 200': (r) => r.status === 200,
    });
    failureRate.add(!ok);
  }

  sleep(1);
}

export function teardown(data) {
  console.log(`=======================================================`);
  console.log(`[Stress Test] Stress test completed.`);
  console.log(`=======================================================`);
}
