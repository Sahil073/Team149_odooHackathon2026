"""
Quick verification test for AI Win Predictor endpoint in gateway.py
"""
import sys
from pathlib import Path
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from gateway import gateway

client = TestClient(gateway)

def test_ai_win_predictor():
    print("[test] Testing AI Win Predictor on Gold Tier, Healthy Discount...")
    res_gold = client.post("/api/ai/win-probability", json={
        "customerTier": "Gold",
        "totalRevenue": 12000.0,
        "avgDiscountPct": 10.0,
        "itemCount": 4,
        "riskScore": 0.1,
    })
    assert res_gold.status_code == 200, f"Error: {res_gold.text}"
    data_gold = res_gold.json()
    print("Gold Deal Result:", data_gold)
    assert data_gold["winProbability"] >= 0.70, "Gold tier with good discount should be high probability"
    assert data_gold["modelType"] == "LogisticRegression"

    print("\n[test] Testing AI Win Predictor on Bronze Tier, High Discount Breach...")
    res_bronze = client.post("/api/ai/win-probability", json={
        "customerTier": "Bronze",
        "totalRevenue": 45000.0,
        "avgDiscountPct": 28.0,
        "itemCount": 1,
        "riskScore": 0.7,
    })
    assert res_bronze.status_code == 200, f"Error: {res_bronze.text}"
    data_bronze = res_bronze.json()
    print("Bronze High Risk Deal Result:", data_bronze)
    assert data_bronze["winProbability"] < 0.50, "High risk deal should have lower win probability"

    print("\n ALL TESTS PASSED! AI ML Model is serving live in Gateway!")

if __name__ == "__main__":
    test_ai_win_predictor()

