"""
End-to-end test for the batch threat analysis pipeline.
Sends 50 indicators, polls for completion, then validates results.
"""
import requests, time, json, sys

BASE = "http://localhost:8000"

# ---- 1. Health check ----
print("1️⃣  Health check...")
r = requests.get(f"{BASE}/health")
assert r.status_code == 200, f"Health check failed: {r.status_code}"
print("   ✅ Backend is healthy\n")

# ---- 2. Single-indicator sanity ----
print("2️⃣  Single indicator test (POST /threat/analyze)...")
r = requests.post(f"{BASE}/threat/analyze", json={"indicator": "apt.ru.evil.com"})
assert r.status_code == 200
data = r.json()
assert data["state_level_threat"]["detected"] is True
print(f"   ✅ Single analysis OK — actor: {data['state_level_threat']['actor']}\n")

# ---- 3. Submit batch job ----
indicators = [f"indicator-{i}.example.com" for i in range(50)]
# Sprinkle in a few state-level hits
indicators[10] = "apt-28.ru.malware.net"
indicators[25] = "lazarus.kp.attack.org"
indicators[40] = "bot-crawler-auto.net"

print(f"3️⃣  Submitting batch of {len(indicators)} indicators (POST /threat/analyze/batch)...")
r = requests.post(f"{BASE}/threat/analyze/batch", json={"indicators": indicators, "chunk_size": 10})
assert r.status_code == 200, f"Batch submit failed: {r.status_code} — {r.text}"
batch = r.json()
job_id = batch["job_id"]
print(f"   ✅ Batch job created: job_id={job_id}, status={batch['status']}, chunks of {batch['chunk_size']}\n")

# ---- 4. Poll until completed ----
print("4️⃣  Polling batch status...")
for attempt in range(30):
    time.sleep(1)
    r = requests.get(f"{BASE}/threat/analyze/batch/{job_id}")
    assert r.status_code == 200
    status = r.json()
    print(f"     attempt {attempt+1}: status={status['status']}, completed={status['completed_items']}/{status['total_items']}")
    if status["status"] == "completed":
        break
else:
    print("   ❌ Timed out waiting for batch to complete!")
    sys.exit(1)

# ---- 5. Validate results ----
results = status.get("results", [])
print(f"\n5️⃣  Validating results...")
print(f"   Total results returned: {len(results)}")
assert len(results) == 50, f"Expected 50 results, got {len(results)}"

# Check that the state-level indicators were flagged
flagged = [r for r in results if r.get("state_level_threat", {}).get("detected")]
print(f"   State-level threats flagged: {len(flagged)}")
assert len(flagged) >= 2, f"Expected at least 2 state-level detections"

print(f"\n🎉 ALL TESTS PASSED — batch pipeline is fully functional!")
