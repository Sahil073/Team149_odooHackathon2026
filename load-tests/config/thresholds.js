/**
 * thresholds.js - DealFlow360 SLA & Performance Guardrails
 *
 * Defines industry-standard SLOs (Service Level Objectives) for:
 *   - Smoke Tests: Strict error rate == 0, tolerant latency
 *   - Baseline Tests: Strict enterprise SLA (99% success, p95 < 1.8s, p99 < 3.0s)
 *   - Stress Tests: Saturation boundary detection (up to 5% failures, p90 < 3.0s)
 */

export const SMOKE_THRESHOLDS = {
  // Zero error tolerance for sanity smoke test
  'http_req_failed': ['rate==0'],
  // Latency SLO with generous margin for cold starts / cross-region internet routing
  'http_req_duration': ['p(95)<3000', 'p(99)<5000'],
  // All validation checks must pass
  'checks': ['rate>0.99'],
};

export const BASELINE_THRESHOLDS = {
  // Standard Production SLA: < 1% error rate under normal business traffic
  'http_req_failed': ['rate<0.01'],
  // Latency profile under steady business hours
  'http_req_duration': ['p(50)<700', 'p(90)<1500', 'p(95)<2000', 'p(99)<3500'],
  // Per-endpoint latency guardrails
  'endpoint_health': ['p(95)<1000'],
  'endpoint_products': ['p(95)<1800'],
  'endpoint_ai_win': ['p(95)<1800'],
  'endpoint_quotations': ['p(95)<2500'],
  // Over 98% of assertions must pass
  'checks': ['rate>0.98'],
};

export const STRESS_THRESHOLDS = {
  // Allow up to 5% failure rate during extreme concurrency saturation
  'http_req_failed': ['rate<0.05'],
  // Stress latency SLO to catch complete server lockup
  'http_req_duration': ['p(90)<3500', 'p(95)<6000'],
};
