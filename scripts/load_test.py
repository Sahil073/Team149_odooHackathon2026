"""
load_test.py — High-Performance Concurrency & Scalability Benchmark Suite
DealFlow360 (Odoo Hackathon 2026)

Tests throughput (RPS), latency distributions (p50, p90, p95, p99),
and failure rates under varying levels of simulated concurrent users.
"""

import sys
import time
import json
import statistics
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

def run_benchmark(
    name: str,
    url: str,
    method: str = "GET",
    payload: dict = None,
    concurrency: int = 10,
    total_requests: int = 100,
    timeout: float = 10.0,
):
    print(f"\n======================================================================")
    print(f">> [BENCHMARK] {name}")
    print(f"   Target URL:      {url}")
    print(f"   HTTP Method:     {method}")
    print(f"   Concurrent VUs:  {concurrency}")
    print(f"   Total Requests:  {total_requests}")
    print(f"======================================================================")

    data_bytes = json.dumps(payload).encode("utf-8") if payload else None
    headers = {
        "User-Agent": f"DealFlow360-LoadTester/1.0 (Concurrency={concurrency})",
        "Content-Type": "application/json",
    }

    latencies_ms = []
    status_codes = {}
    errors = []

    def single_request():
        t0 = time.perf_counter()
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                code = resp.status
                return (True, elapsed_ms, code, None)
        except urllib.error.HTTPError as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            return (False, elapsed_ms, e.code, str(e))
        except Exception as e:
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            return (False, elapsed_ms, 0, str(e))

    start_wall = time.perf_counter()

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(single_request) for _ in range(total_requests)]
        for f in as_completed(futures):
            success, latency, code, err = f.result()
            latencies_ms.append(latency)
            status_codes[code] = status_codes.get(code, 0) + 1
            if not success:
                errors.append(err)

    total_time = time.perf_counter() - start_wall
    rps = total_requests / total_time if total_time > 0 else 0

    # Metrics
    latencies_sorted = sorted(latencies_ms)
    n = len(latencies_sorted)
    p50 = latencies_sorted[int(n * 0.50)] if n else 0
    p90 = latencies_sorted[int(n * 0.90)] if n else 0
    p95 = latencies_sorted[int(n * 0.95)] if n else 0
    p99 = latencies_sorted[min(int(n * 0.99), n - 1)] if n else 0
    mean = statistics.mean(latencies_ms) if latencies_ms else 0
    min_lat = latencies_sorted[0] if latencies_sorted else 0
    max_lat = latencies_sorted[-1] if latencies_sorted else 0
    error_count = len(errors)
    error_pct = (error_count / total_requests) * 100 if total_requests else 0

    print(f"\n--- [RESULTS] {name} ---")
    print(f"   Execution Time:   {total_time:.2f} s")
    print(f"   Throughput (RPS): {rps:.1f} req/sec")
    print(f"   Status Codes:     {status_codes}")
    print(f"   Success Rate:     {100 - error_pct:.1f}% ({total_requests - error_count}/{total_requests})")
    print(f"   Latency Distribution:")
    print(f"     * Min:          {min_lat:.1f} ms")
    print(f"     * Mean:         {mean:.1f} ms")
    print(f"     * Median (p50): {p50:.1f} ms")
    print(f"     * 90th % (p90): {p90:.1f} ms")
    print(f"     * 95th % (p95): {p95:.1f} ms")
    print(f"     * 99th % (p99): {p99:.1f} ms")
    print(f"     * Max:          {max_lat:.1f} ms")

    return {
        "name": name,
        "concurrency": concurrency,
        "total_requests": total_requests,
        "rps": round(rps, 1),
        "min": round(min_lat, 1),
        "mean": round(mean, 1),
        "p50": round(p50, 1),
        "p90": round(p90, 1),
        "p95": round(p95, 1),
        "p99": round(p99, 1),
        "max": round(max_lat, 1),
        "error_pct": round(error_pct, 2),
    }


if __name__ == "__main__":
    SMART_LAYER_URL = "https://dealflow360-smart-layer.onrender.com"
    CORE_API_URL = "https://team149-odoohackathon2026-1.onrender.com"

    print("======================================================================")
    print("      DEALFLOW360 PLATFORM STRENGTH & SCALABILITY TEST SUITE          ")
    print("======================================================================")

    all_results = []

    # 1. Baseline Latency (Single User)
    all_results.append(run_benchmark(
        name="1. Baseline Gateway Health Check",
        url=f"{SMART_LAYER_URL}/health",
        method="GET",
        concurrency=1,
        total_requests=10,
    ))

    # 2. AI Win Predictor: Light Load (10 Concurrent VUs)
    ai_payload = {
        "customerTier": "Gold",
        "totalRevenue": 25000,
        "avgDiscountPct": 10.0,
        "itemCount": 4,
        "riskScore": 0.12,
    }
    all_results.append(run_benchmark(
        name="2. ML Win Predictor (10 Concurrent VUs)",
        url=f"{SMART_LAYER_URL}/api/ai/win-probability",
        method="POST",
        payload=ai_payload,
        concurrency=10,
        total_requests=50,
    ))

    # 3. AI Win Predictor: Peak Enterprise Load (50 Concurrent VUs)
    all_results.append(run_benchmark(
        name="3. ML Win Predictor (50 Concurrent VUs)",
        url=f"{SMART_LAYER_URL}/api/ai/win-probability",
        method="POST",
        payload=ai_payload,
        concurrency=50,
        total_requests=100,
    ))

    # 4. Risk Engine: High Concurrency Calculation (25 Concurrent VUs)
    risk_payload = {
        "quotationId": "quote-bench-1",
        "customerTier": "Silver",
        "lines": [
            {"lineId": "l1", "category": "Hardware", "qty": 3, "unitPrice": 1200, "discountPct": 12},
            {"lineId": "l2", "category": "Services", "qty": 1, "unitPrice": 4500, "discountPct": 5},
        ]
    }
    all_results.append(run_benchmark(
        name="4. Discount Risk Engine (25 Concurrent VUs)",
        url=f"{SMART_LAYER_URL}/api/risk-score/calculate",
        method="POST",
        payload=risk_payload,
        concurrency=25,
        total_requests=50,
    ))

    # 5. Stress Test: 100 Concurrent VUs (Burst Stress Test)
    all_results.append(run_benchmark(
        name="5. Stress Test: ML Win Predictor (100 Concurrent VUs)",
        url=f"{SMART_LAYER_URL}/api/ai/win-probability",
        method="POST",
        payload=ai_payload,
        concurrency=100,
        total_requests=150,
    ))

    # Summary Table
    print("\n\n======================================================================")
    print("                     SCALABILITY BENCHMARK SUMMARY TABLE              ")
    print("======================================================================")
    header = f"{'Test Name':<42} | {'VUs':<4} | {'RPS':<6} | {'p50(ms)':<8} | {'p95(ms)':<8} | {'p99(ms)':<8} | {'Errors':<6}"
    print(header)
    print("-" * len(header))
    for r in all_results:
        print(f"{r['name']:<42} | {r['concurrency']:<4} | {r['rps']:<6} | {r['p50']:<8} | {r['p95']:<8} | {r['p99']:<8} | {r['error_pct']}%")
    print("======================================================================")
