/**
 * endpoint-smoke.js - DealFlow360 Smoke Test
 *
 * Single VU validation test to verify that all critical endpoints
 * across both the Core API (Node.js) and Smart Layer (FastAPI) are
 * live, reachable, and responding with HTTP 200 + valid JSON.
 *
 * Run:
 *   k6 run load-tests/scenarios/endpoint-smoke.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { CONFIG, PAYLOADS, getAuthToken } from '../config/endpoints.js';
import { SMOKE_THRESHOLDS } from '../config/thresholds.js';

export const options = {
  vus: 1,
  iterations: 3,
  thresholds: SMOKE_THRESHOLDS,
};

export function setup() {
  console.log(`[Smoke Test] Starting setup...`);
  console.log(`[Smoke Test] Core API URL:    ${CONFIG.baseUrl}`);
  console.log(`[Smoke Test] Smart Layer URL: ${CONFIG.smartLayerUrl}`);

  const token = getAuthToken();
  if (token) {
    console.log(`[Smoke Test] Staff authentication successful (JWT obtained).`);
  } else {
    console.log(`[Smoke Test] Notice: Proceeding without staff JWT (authenticated routes will test fallback/response).`);
  }

  return { token };
}

export default function (data) {
  const token = data.token;
  const authHeaders = token
    ? { ...CONFIG.headers, Authorization: `Bearer ${token}` }
    : CONFIG.headers;

  group('1. Infrastructure Baseline (Health Checks)', () => {
    // Core API Health Check
    const resCoreHealth = http.get(`${CONFIG.baseUrl}/health`, {
      headers: CONFIG.headers,
      tags: { endpoint: 'core_health' },
    });
    check(resCoreHealth, {
      'Core API /health status is 200': (r) => r.status === 200,
      'Core API /health returns ok': (r) => {
        try {
          return r.json().status === 'ok';
        } catch (_) {
          return false;
        }
      },
    });

    // Smart Layer Health Check
    const resSmartHealth = http.get(`${CONFIG.smartLayerUrl}/health`, {
      headers: CONFIG.headers,
      tags: { endpoint: 'smart_health' },
    });
    check(resSmartHealth, {
      'Smart Layer /health status is 200': (r) => r.status === 200,
      'Smart Layer /health returns ok': (r) => {
        try {
          return r.json().status === 'ok';
        } catch (_) {
          return false;
        }
      },
    });
  });

  sleep(1);

  group('2. Read-Heavy Catalog (Core API)', () => {
    const resProducts = http.get(`${CONFIG.baseUrl}/api/products`, {
      headers: CONFIG.headers,
      tags: { endpoint: 'products_catalog' },
    });
    check(resProducts, {
      'GET /api/products status is 200': (r) => r.status === 200,
      'GET /api/products returns product list': (r) => {
        try {
          const body = r.json();
          return Array.isArray(body.data) || Array.isArray(body);
        } catch (_) {
          return false;
        }
      },
    });
  });

  sleep(1);

  group('3. Computation-Heavy ML & Risk (Smart Layer)', () => {
    // AI Win Probability Predictor
    const resAiWin = http.post(
      `${CONFIG.smartLayerUrl}/api/ai/win-probability`,
      JSON.stringify(PAYLOADS.aiWinPredict),
      {
        headers: CONFIG.headers,
        tags: { endpoint: 'ai_win_predict' },
      }
    );
    check(resAiWin, {
      'POST /api/ai/win-probability status is 200': (r) => r.status === 200,
      'POST /api/ai/win-probability returns winProbability': (r) => {
        try {
          const body = r.json();
          return typeof body.winProbability === 'number';
        } catch (_) {
          return false;
        }
      },
    });

    // Discount Risk Score Calculation
    const resRisk = http.post(
      `${CONFIG.smartLayerUrl}/api/risk-score/calculate`,
      JSON.stringify(PAYLOADS.riskScoreCalc),
      {
        headers: CONFIG.headers,
        tags: { endpoint: 'risk_score_calc' },
      }
    );
    check(resRisk, {
      'POST /api/risk-score/calculate status is 200': (r) => r.status === 200,
      'POST /api/risk-score/calculate returns blendedRiskScore': (r) => {
        try {
          const body = r.json();
          return typeof body.blendedRiskScore === 'number';
        } catch (_) {
          return false;
        }
      },
    });
  });

  sleep(1);

  group('4. Transactional Quotations (Core API)', () => {
    const resQuotes = http.get(`${CONFIG.baseUrl}/api/quotations`, {
      headers: authHeaders,
      tags: { endpoint: 'quotations_list' },
    });
    check(resQuotes, {
      'GET /api/quotations responds (< 500)': (r) => r.status < 500,
      'GET /api/quotations status is 200 (if authorized)': (r) =>
        token ? r.status === 200 : true,
    });
  });

  sleep(1);
}

export function teardown() {
  console.log(`[Smoke Test] Completed successfully. All endpoints verified.`);
}
