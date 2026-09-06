"""
start_all.py — Orchestrator to launch all DealFlow360 Smart Layer engines concurrently.

Ports:
  - 8001: Risk Engine (Discount Scoring + ICD §3.2)
  - 8002: Upsell Engine (Margin/Co-purchase Recommendations + ICD §3.6)
  - 8003: Deal Health Engine (Anomaly Detection + ICD §3.8)

Usage:
  python start_all.py
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

SERVICES = [
    {
        "name": "Risk Engine",
        "dir": BASE_DIR / "risk-engine",
        "port": 8001,
        "cmd": [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
    },
    {
        "name": "Upsell Engine",
        "dir": BASE_DIR / "upsell-engine",
        "port": 8002,
        "cmd": [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8002", "--reload"],
    },
    {
        "name": "Deal Health Engine",
        "dir": BASE_DIR / "deal-health",
        "port": 8003,
        "cmd": [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8003", "--reload"],
    },
]


def main():
    print("=" * 65)
    print("  >> DealFlow360 — Smart Layer Microservices Orchestrator")
    print("=" * 65)
    print(f"  Python executable: {sys.executable}")
    print(f"  Base directory:    {BASE_DIR}")
    print("  Services:")
    for s in SERVICES:
        print(f"    - {s['name']:<20} -> http://localhost:{s['port']}")
    print("=" * 65)

    processes = []

    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = str(BASE_DIR)

        for s in SERVICES:
            print(f"[orchestrator] Starting {s['name']} on port {s['port']}...")
            proc = subprocess.Popen(
                s["cmd"],
                cwd=str(s["dir"]),
                env=env,
            )
            processes.append((s["name"], proc))
            time.sleep(0.8)

        print("\n[orchestrator] All 3 smart-layer engines are running.")
        print("[orchestrator] Press Ctrl+C to terminate all services.\n")

        while True:
            for name, proc in processes:
                poll = proc.poll()
                if poll is not None:
                    print(f"[orchestrator] WARNING: {name} exited with returncode {poll}")
            time.sleep(2)

    except KeyboardInterrupt:
        print("\n[orchestrator] Shutting down all services...")
    finally:
        for name, proc in processes:
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                proc.kill()
        print("[orchestrator] All services stopped cleanly.")


if __name__ == "__main__":
    main()

