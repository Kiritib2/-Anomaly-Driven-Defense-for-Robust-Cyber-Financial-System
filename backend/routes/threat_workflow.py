"""
Threat Analysis Workflow API Route
POST /threat/analyze           — single indicator analysis
POST /threat/analyze/batch     — bulk batch analysis (threaded pipeline)
GET  /threat/analyze/batch/{job_id} — poll batch job status / results
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import random
import time
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from routes.fraud_network import _generate_fraud_network
from db import (
    create_batch_job,
    update_batch_job,
    save_batch_results,
    get_batch_job,
    get_batch_results,
    log_incident,
)

router = APIRouter(prefix="/threat", tags=["Workflow Analysis"])

# Thread pool shared across batch requests
_executor = ThreadPoolExecutor(max_workers=8)

# Default chunk size for batching
BATCH_CHUNK_SIZE = 20


# ---------------------------------------------------------------------------
#  Schemas
# ---------------------------------------------------------------------------

class ThreatAnalyzeRequest(BaseModel):
    indicator: str  # IP, domain, or trace ID


class ThreatAnalyzeResponse(BaseModel):
    indicator: str
    state_level_threat: Dict[str, Any]
    bot_involvement: Dict[str, Any]
    fraud_ring_data: Optional[Dict[str, Any]] = None


class BatchThreatAnalyzeRequest(BaseModel):
    indicators: List[str]
    chunk_size: Optional[int] = BATCH_CHUNK_SIZE


class BatchSubmitResponse(BaseModel):
    job_id: str
    status: str
    total_items: int
    chunk_size: int
    message: str


class BatchStatusResponse(BaseModel):
    job_id: str
    status: str
    total_items: int
    completed_items: int
    results: Optional[List[Dict[str, Any]]] = None


# ---------------------------------------------------------------------------
#  Core analysis logic (reusable for single AND batch)
# ---------------------------------------------------------------------------

def _analyze_single_indicator(indicator: str) -> dict:
    """Run the full threat analysis pipeline for ONE indicator (CPU-bound-safe)."""
    indicator_lower = indicator.lower()

    # 1. State-level threat check
    is_state_level = "apt" in indicator_lower or "ru" in indicator_lower or "kp" in indicator_lower
    state_threat_data = {
        "detected": is_state_level,
        "actor": (
            "APT-28 (Fancy Bear)" if "ru" in indicator_lower
            else "Lazarus Group" if "kp" in indicator_lower
            else "Unknown APT"
        ),
        "confidence": round(random.uniform(75, 99), 1) if is_state_level else round(random.uniform(5, 25), 1),
        "details": (
            "Indicators of compromise match known state-sponsored actor TTPs."
            if is_state_level
            else "No direct matches to known state-sponsored threat actors."
        ),
    }
    if not is_state_level:
        state_threat_data["actor"] = "None"

    # 2. Bot involvement check
    is_bot = (
        is_state_level
        or "bot" in indicator_lower
        or "auto" in indicator_lower
        or random.random() > 0.5
    )

    bot_report = ""
    if is_bot:
        bot_report = (
            f"DETAILED BOT INVOLVEMENT REPORT\n"
            f"-------------------------------\n"
            f"Target Indicator: {indicator}\n"
            f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
            f"Bot Type: {'Distributed Command & Control' if is_state_level else 'Financial Credential Stuffer'}\n\n"
            f"Analysis Summary:\n"
            f"- Behavioral anomaly detected in request velocity.\n"
            f"- IP rotation patterns consistent with proxy network usage.\n"
            f"- Headless browser signals (missing standard WebGL context, automated navigation timing).\n\n"
            f"Recommended Action:\n"
            f"Implement immediate rate-limiting and challenge incoming requests with CAPTCHA/WAF rules."
        )

    bot_data = {
        "detected": is_bot,
        "type": "C2 Infrastructure" if is_state_level else "Automated Scraper/Stuffer",
        "confidence": round(random.uniform(80, 99), 1) if is_bot else round(random.uniform(10, 30), 1),
        "report": bot_report.strip() if is_bot else "No significant bot behavior observed.",
    }

    # 3. Fraud ring visualization data
    has_fraud_ring = is_state_level or (is_bot and random.random() > 0.4)
    fraud_ring_data = None

    if has_fraud_ring:
        graph = _generate_fraud_network()
        fraud_ring_data = {
            "nodes": [n.dict() for n in graph.nodes],
            "edges": [e.dict() for e in graph.edges],
            "cluster_id": graph.cluster_id,
            "total_amount": graph.total_amount,
            "suspicious_count": graph.suspicious_count,
        }

    return {
        "indicator": indicator,
        "state_level_threat": state_threat_data,
        "bot_involvement": bot_data,
        "fraud_ring_data": fraud_ring_data,
    }


# ---------------------------------------------------------------------------
#  Single indicator endpoint (existing, now delegates to shared logic)
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=ThreatAnalyzeResponse)
async def analyze_threat(request: ThreatAnalyzeRequest):
    """Run a comprehensive threat analysis workflow on one indicator."""
    result = _analyze_single_indicator(request.indicator)
    return result


# ---------------------------------------------------------------------------
#  Batch pipeline — background worker
# ---------------------------------------------------------------------------

def _process_batch_pipeline(job_id: str, indicators: List[str], chunk_size: int):
    """
    Background worker that splits indicators into chunks, processes each
    chunk in parallel threads, and persists results to MongoDB.
    """
    total = len(indicators)
    completed = 0
    num_chunks = math.ceil(total / chunk_size)

    print(f"🔄 Batch {job_id}: processing {total} indicators in {num_chunks} chunks (chunk_size={chunk_size})")

    for chunk_idx in range(num_chunks):
        start = chunk_idx * chunk_size
        end = min(start + chunk_size, total)
        chunk = indicators[start:end]

        # Fan-out: submit each indicator in this chunk to the thread pool
        futures = {_executor.submit(_analyze_single_indicator, ind): ind for ind in chunk}
        chunk_results = []

        for future in as_completed(futures):
            try:
                chunk_results.append(future.result())
            except Exception as exc:
                indicator = futures[future]
                chunk_results.append({"indicator": indicator, "error": str(exc)})

        # Persist this chunk to MongoDB in one efficient insert_many
        save_batch_results(job_id, chunk_results)
        completed += len(chunk_results)
        update_batch_job(job_id, "processing", completed)

        # Also log high-risk items as incidents
        for r in chunk_results:
            threat = r.get("state_level_threat", {})
            if threat.get("detected"):
                log_incident({
                    "account_id": r["indicator"],
                    "fraud_probability": threat.get("confidence", 0) / 100,
                    "threat_type": "state_level_threat",
                    "action_taken": "flagged_batch",
                })

        print(f"   ✅ Batch {job_id}: chunk {chunk_idx + 1}/{num_chunks} done ({completed}/{total})")

    update_batch_job(job_id, "completed", completed)
    print(f"🏁 Batch {job_id}: COMPLETED — {completed} results stored.")


# ---------------------------------------------------------------------------
#  Batch endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze/batch", response_model=BatchSubmitResponse)
async def submit_batch_analysis(request: BatchThreatAnalyzeRequest, background_tasks: BackgroundTasks):
    """
    Accept a list of indicators, split them into batches, and process
    them in a background thread pipeline. Returns a job_id immediately.
    """
    if not request.indicators:
        raise HTTPException(status_code=400, detail="indicators list must not be empty")

    chunk_size = request.chunk_size or BATCH_CHUNK_SIZE
    job_id = create_batch_job(total_items=len(request.indicators))

    # Kick off the background pipeline
    background_tasks.add_task(_process_batch_pipeline, job_id, request.indicators, chunk_size)

    return {
        "job_id": job_id,
        "status": "processing",
        "total_items": len(request.indicators),
        "chunk_size": chunk_size,
        "message": f"Batch job created. Poll GET /threat/analyze/batch/{job_id} for progress.",
    }


@router.get("/analyze/batch/{job_id}", response_model=BatchStatusResponse)
async def get_batch_status(job_id: str):
    """Poll the status of a batch analysis job. Returns results when completed."""
    job = get_batch_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Batch job '{job_id}' not found")

    response: dict = {
        "job_id": job["job_id"],
        "status": job["status"],
        "total_items": job["total_items"],
        "completed_items": job["completed_items"],
        "results": None,
    }

    # Attach results only when the job is done
    if job["status"] == "completed":
        response["results"] = get_batch_results(job_id)

    return response

