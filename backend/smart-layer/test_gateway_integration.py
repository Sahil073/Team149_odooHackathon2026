"""
test_gateway_integration.py — Verify all Smart Layer endpoints (Risk, Upsell, Health, ML Win Predictor)
"""
import sys
from pathlib import Path
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from gateway import gateway

client = TestClient(gateway)

def test_all_smart_layer_endpoints():
    print("[integration] 1. Testing Gateway Health...")
    res = client.get("/health")
    assert res.status_code == 200
    print("   [OK] Health OK:", res.json())

    print("\n[integration] 2. Testing ML Win-Rate Predictor...")
    res_ai = client.post("/api/ai/win-probability", json={
        "customerTier": "Gold",
        "totalRevenue": 15000.0,
        "avgDiscountPct": 10.0,
        "itemCount": 3,
        "riskScore": 0.1,
    })
    assert res_ai.status_code == 200
    ai_data = res_ai.json()
    print("   [OK] ML Win Predictor OK:", ai_data)
    assert ai_data["winProbability"] >= 0.70
    assert "recommendedDiscountPct" in ai_data

    print("\n[integration] 3. Testing On-Demand Blended Risk Score Calculation...")
    res_risk = client.post("/api/risk-score/calculate", json={
        "quotationId": "quote-test-1",
        "customerTier": "Gold",
        "lines": [
            {
                "lineId": "line-1",
                "productId": "prod-1",
                "category": "Services",
                "qty": 5,
                "unitPrice": 1000.0,
                "discountPct": 25.0,
                "categoryMaxDiscountPct": 10.0,
            }
        ]
    })
    assert res_risk.status_code == 200
    risk_data = res_risk.json()
    print("   [OK] Blended Risk Score OK:", risk_data)
    assert risk_data["requiresApproval"] is True
    assert risk_data["blendedRiskScore"] > 0

    print("\n[integration] 4. Testing On-Demand Upsell Ranking...")
    res_upsell = client.post("/api/upsell-suggestions/compute", json={
        "quotationId": "quote-test-1",
        "cartProductIds": ["prod-base-1"],
        "candidates": [
            {
                "productId": "prod-sug-1",
                "productName": "Extended Warranty",
                "basePrice": 500.0,
                "marginPct": 45.0,
                "isPromoted": True,
                "coPurchaseScore": 0.8,
            },
            {
                "productId": "prod-sug-2",
                "productName": "Budget Cable",
                "basePrice": 20.0,
                "marginPct": 5.0,
                "isPromoted": False,
                "coPurchaseScore": 0.9,
            }
        ],
        "minMarginPct": 10.0,
    })
    assert res_upsell.status_code == 200
    upsell_data = res_upsell.json()
    print("   [OK] Upsell Engine OK:", upsell_data)
    # Cable has 5% margin, below minMarginPct of 10%, so it should be filtered out
    assert len(upsell_data["suggestions"]) == 1
    assert upsell_data["suggestions"][0]["productId"] == "prod-sug-1"

    print("\n[integration] 5. Testing Deal Health Flags Route...")
    res_health = client.get("/api/deal-health-flags")
    assert res_health.status_code == 200
    print("   [OK] Deal Health OK:", res_health.json())

    print("\n[SUCCESS] ALL 5 SMART LAYER SUBSYSTEMS ARE VERIFIED AND WORKING 100% END-TO-END!")

if __name__ == "__main__":
    test_all_smart_layer_endpoints()
