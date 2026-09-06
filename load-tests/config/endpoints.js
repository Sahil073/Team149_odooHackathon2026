/**
 * endpoints.js - DealFlow360 k6 Target Configuration & Data Helpers
 *
 * Configures base URLs, staff authentication, realistic request payloads,
 * and HTTP headers for load testing.
 *
 * Environment variables supported:
 *   BASE_URL         - Core API base URL (default: https://team149-odoohackathon2026-1.onrender.com)
 *   SMART_LAYER_URL  - Python Smart Layer URL (default: https://dealflow360-smart-layer.onrender.com)
 *   TEST_EMAIL       - Staff account email for authenticated endpoints (default: rep@dealflow360.com)
 *   TEST_PASSWORD    - Staff account password (default: password123)
 *   AUTH_TOKEN       - Pre-generated JWT Bearer token (optional, bypasses login)
 */

import http from 'k6/http';

export const CONFIG = {
  baseUrl: __ENV.BASE_URL || 'https://team149-odoohackathon2026-1.onrender.com',
  smartLayerUrl: __ENV.SMART_LAYER_URL || 'https://dealflow360-smart-layer.onrender.com',
  auth: {
    email: __ENV.TEST_EMAIL || 'rep@dealflow360.com',
    password: __ENV.TEST_PASSWORD || 'password123',
    staticToken: __ENV.AUTH_TOKEN || null,
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'DealFlow360-k6-LoadTester/1.0',
  },
};

/**
 * Authenticate once in setup() lifecycle hook to retrieve a Bearer JWT.
 * Prevents hammering CPU-intensive bcrypt password hashes inside the VU loop.
 *
 * @returns {string|null} JWT Bearer token or null on failure
 */
export function getAuthToken() {
  if (CONFIG.auth.staticToken) {
    return CONFIG.auth.staticToken;
  }

  const loginUrl = `${CONFIG.baseUrl}/api/auth/login`;
  const payload = JSON.stringify({
    email: CONFIG.auth.email,
    password: CONFIG.auth.password,
  });

  const res = http.post(loginUrl, payload, {
    headers: CONFIG.headers,
    tags: { endpoint: 'auth_login' },
    timeout: '15s',
  });

  if (res.status === 200 || res.status === 201) {
    try {
      const body = res.json();
      if (body && body.token) {
        return body.token;
      }
    } catch (e) {
      console.warn(`[endpoints.js] Warning: Could not parse auth response JSON: ${res.body}`);
    }
  }

  console.warn(`[endpoints.js] Auth login returned status ${res.status}. Tests requiring authentication will run with unauthenticated fallback.`);
  return null;
}

/**
 * Realistic production payloads matching schemas in Express & FastAPI
 */
export const PAYLOADS = {
  // ML Win Probability Predictor payload
  aiWinPredict: {
    customerTier: 'Gold',
    totalRevenue: 25000,
    avgDiscountPct: 12.5,
    itemCount: 4,
    riskScore: 0.15,
  },

  // Discount Risk Evaluation payload
  riskScoreCalc: {
    quotationId: 'Q-LOADTEST-001',
    customerId: 'cust-1',
    customerTier: 'Silver',
    salesRepId: 'rep-1',
    lines: [
      {
        lineId: 'line-1',
        productId: 'prod-1',
        category: 'Hardware',
        qty: 5,
        unitPrice: 1140,
        discountPct: 10,
        categoryMaxDiscountPct: 15,
      },
      {
        lineId: 'line-2',
        productId: 'prod-3',
        category: 'Services',
        qty: 1,
        unitPrice: 450,
        discountPct: 5,
        categoryMaxDiscountPct: 10,
      },
    ],
  },
};
