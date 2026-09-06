"""
run_tests.py — Runs the complete test suite across all DealFlow360 smart-layer microservices.
"""

import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SERVICES = ["risk-engine", "deal-health", "upsell-engine"]


def main():
    print("=" * 60)
    print("  >> Running DealFlow360 Smart Layer Test Suites")
    print("=" * 60)

    pytest_exe = BASE_DIR / ".venv" / "Scripts" / "pytest.exe"
    if not pytest_exe.exists():
        pytest_exe = "pytest"

    all_passed = True
    total_suites = len(SERVICES)
    passed_suites = 0

    for s in SERVICES:
        s_dir = BASE_DIR / s
        print(f"\n[TEST] Testing {s} (in {s_dir.name}/tests)...")
        res = subprocess.run([str(pytest_exe), "-v", "tests"], cwd=str(s_dir))
        if res.returncode == 0:
            passed_suites += 1
            print(f"[PASS] {s} tests PASSED.")
        else:
            all_passed = False
            print(f"[FAIL] {s} tests FAILED with code {res.returncode}.")

    print("\n" + "=" * 60)
    if all_passed:
        print(f"[SUCCESS] ALL TEST SUITES PASSED! ({passed_suites}/{total_suites})")
    else:
        print(f"[WARNING] SOME TEST SUITES FAILED ({passed_suites}/{total_suites} passed)")
    print("=" * 60)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
