#!/usr/bin/env node
/**
 * runner.js - DealFlow360 Zero-Dependency Benchmark & Sanity Runner
 *
 * Runs concurrent load tests using Node.js native async fetch.
 * Acts as a direct companion to the Grafana k6 suite for environments
 * where k6 is not yet installed.
 *
 * Usage:
 *   node load-tests/runner.js smoke
 *   node load-tests/runner.js baseline
 *   node load-tests/runner.js stress
 */

const BASE_URL = process.env.BASE_URL || 'https://team149-odoohackathon2026-1.onrender.com';
const SMART_LAYER_URL = process.env.SMART_LAYER_URL || 'https://dealflow360-smart-layer.onrender.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'rep@dealflow360.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

const PAYLOADS = {
  aiWinPredict: {
    customerTier: 'Gold',
    totalRevenue: 25000,
    avgDiscountPct: 12.5,
    itemCount: 4,
    riskScore: 0.15,
  },
  riskScoreCalc: {
    quotationId: 'Q-LOADTEST-001',
    customerId: 'cust-1',
    customerTier: 'Silver',
    salesRepId: 'rep-1',
    lines: [
      { lineId: 'line-1', productId: 'prod-1', category: 'Hardware', qty: 5, unitPrice: 1140, discountPct: 10, categoryMaxDiscountPct: 15 },
      { lineId: 'line-2', productId: 'prod-3', category: 'Services', qty: 1, unitPrice: 450, discountPct: 5, categoryMaxDiscountPct: 10 },
    ],
  },
};

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function login() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.token;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function runScenario(scenario) {
  console.log(`\n===============================================================`);
  console.log(` DealFlow360 Performance Benchmark: ${scenario.toUpperCase()}`);
  console.log(` Target Core API:    ${BASE_URL}`);
  console.log(` Target Smart Layer: ${SMART_LAYER_URL}`);
  console.log(`===============================================================\n`);

  console.log(`[1/3] Authenticating staff account...`);
  const token = await login();
  if (token) {
    console.log(`  ✔️ Authenticated successfully (Bearer token acquired)\n`);
  } else {
    console.log(`  ℹ️ Running with unauthenticated fallback\n`);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const config = {
    smoke: { concurrency: 1, totalReqs: 5, thinkTimeMs: 200 },
    baseline: { concurrency: 20, totalReqs: 60, thinkTimeMs: 50 },
    stress: { concurrency: 50, totalReqs: 150, thinkTimeMs: 10 },
  }[scenario] || { concurrency: 5, totalReqs: 15, thinkTimeMs: 100 };

  const endpoints = [
    {
      name: 'GET /health (Core)',
      url: `${BASE_URL}/health`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: null,
    },
    {
      name: 'GET /health (Smart Layer)',
      url: `${SMART_LAYER_URL}/health`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: null,
    },
    {
      name: 'GET /api/products (Catalog)',
      url: `${BASE_URL}/api/products`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: null,
    },
    {
      name: 'POST /api/ai/win-probability (ML)',
      url: `${SMART_LAYER_URL}/api/ai/win-probability`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PAYLOADS.aiWinPredict),
    },
    {
      name: 'GET /api/quotations (Staff JWT)',
      url: `${BASE_URL}/api/quotations`,
      method: 'GET',
      headers: authHeaders,
      body: null,
    },
  ];

  console.log(`[2/3] Executing ${config.totalReqs} requests across ${config.concurrency} concurrent workers...`);
  const latencies = [];
  const endpointMetrics = {};
  endpoints.forEach((e) => {
    endpointMetrics[e.name] = { latencies: [], errors: 0, total: 0 };
  });

  let completed = 0;
  let errors = 0;
  const startTime = Date.now();

  async function worker(workerId) {
    while (completed < config.totalReqs) {
      const ep = endpoints[completed % endpoints.length];
      completed++;

      const t0 = process.hrtime.bigint();
      try {
        const res = await fetch(ep.url, {
          method: ep.method,
          headers: ep.headers,
          body: ep.body,
        });
        const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;

        if (res.ok || res.status < 500) {
          latencies.push(elapsedMs);
          endpointMetrics[ep.name].latencies.push(elapsedMs);
        } else {
          errors++;
          endpointMetrics[ep.name].errors++;
        }
      } catch (err) {
        errors++;
        endpointMetrics[ep.name].errors++;
      }
      endpointMetrics[ep.name].total++;

      if (config.thinkTimeMs > 0) {
        await new Promise((r) => setTimeout(r, config.thinkTimeMs));
      }
    }
  }

  const workers = Array.from({ length: config.concurrency }, (_, i) => worker(i));
  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const rps = (completed / totalTimeSec).toFixed(1);
  const errRate = ((errors / completed) * 100).toFixed(2);

  console.log(`\n[3/3] Benchmark Results Summary:`);
  console.log(`---------------------------------------------------------------`);
  console.log(`  Total Requests:        ${completed}`);
  console.log(`  Concurrent Workers:    ${config.concurrency} VUs`);
  console.log(`  Elapsed Time:          ${totalTimeSec.toFixed(2)} s`);
  console.log(`  Throughput:            ${rps} RPS`);
  console.log(`  Failure Rate:          ${errRate}% (${errors} failures)`);
  console.log(`  Median Latency (p50):  ${percentile(latencies, 50).toFixed(1)} ms`);
  console.log(`  90th Percentile (p90): ${percentile(latencies, 90).toFixed(1)} ms`);
  console.log(`  95th Percentile (p95): ${percentile(latencies, 95).toFixed(1)} ms`);
  console.log(`  99th Percentile (p99): ${percentile(latencies, 99).toFixed(1)} ms`);
  console.log(`---------------------------------------------------------------`);

  console.log(`\nEndpoint-Level Breakdown:`);
  for (const [name, data] of Object.entries(endpointMetrics)) {
    if (data.latencies.length > 0) {
      console.log(
        `  ${name.padEnd(38)} | p50: ${percentile(data.latencies, 50).toFixed(1).padStart(6)} ms | p95: ${percentile(data.latencies, 95).toFixed(1).padStart(6)} ms | Errs: ${data.errors}/${data.total}`
      );
    }
  }

  const estActiveUsers = Math.round(Number(rps) * 8);
  console.log(`\nLittle's Law Active User Capacity:`);
  console.log(`  At ${rps} RPS and 8s human think time: ~${estActiveUsers} simultaneous active sales reps.`);
  console.log(`===============================================================\n`);
}

const scenario = process.argv[2] || 'smoke';
runScenario(scenario).catch(console.error);
