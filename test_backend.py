import urllib.request
import json

def test(name, method, url, body=None):
    print(f"\n=== {name} ===")
    try:
        if body:
            data = json.dumps(body).encode()
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        else:
            req = urllib.request.Request(url)
        r = urllib.request.urlopen(req)
        result = json.loads(r.read().decode())
        print(f"Status: {r.status} ✅")
        print(json.dumps(result, indent=2)[:500])
        return result
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} ❌")
        print(e.read().decode()[:300])
    except Exception as e:
        print(f"FAILED: {e}")

BASE = "http://localhost:8000"

test("Health Check", "GET", f"{BASE}/health")
test("Single Bot Detect (TXN-00001)", "POST", f"{BASE}/bot/detect", {"transaction_id": "TXN-00001"})
test("List Available Batches", "GET", f"{BASE}/bot/batches")
test("Batch Analysis (BATCH-001)", "POST", f"{BASE}/bot/detect-batch", {"batch_id": "BATCH-001"})
test("Invalid Batch (FAKE-999)", "POST", f"{BASE}/bot/detect-batch", {"batch_id": "FAKE-999"})
