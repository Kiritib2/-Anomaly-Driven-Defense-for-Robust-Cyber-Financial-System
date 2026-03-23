"""
Dashboard Stats & Batch Jobs API Routes
GET /dashboard/stats   — aggregated real-time metrics
GET /batch/jobs        — list all batch jobs
"""
from fastapi import APIRouter, Query
from db import get_db, get_logs

router = APIRouter(tags=["Dashboard & Batch"])


@router.get("/dashboard/stats")
async def dashboard_stats():
    """Return real-time aggregated stats for the dashboard."""
    db = get_db()

    if db is not None:
        total_incidents = db.incident_logs.count_documents({})
        phishing_count = db.incident_logs.count_documents({"threat_type": "phishing"})
        bot_count = db.incident_logs.count_documents({"threat_type": {"$in": ["bot_activity", "bot", "bulk_bot_activity"]}})
        fraud_count = db.incident_logs.count_documents({"threat_type": {"$in": ["fraud_ring", "state_level_threat"]}})
        batch_jobs_total = db.batch_jobs.count_documents({})
        batch_jobs_completed = db.batch_jobs.count_documents({"status": "completed"})
        batch_jobs_processing = db.batch_jobs.count_documents({"status": "processing"})
        batch_results_total = db.batch_results.count_documents({})
    else:
        total_incidents = 0
        phishing_count = 0
        bot_count = 0
        fraud_count = 0
        batch_jobs_total = 0
        batch_jobs_completed = 0
        batch_jobs_processing = 0
        batch_results_total = 0

    # Recent incidents for the table
    recent = get_logs(limit=10)

    return {
        "total_incidents": total_incidents,
        "phishing_count": phishing_count,
        "bot_count": bot_count,
        "fraud_count": fraud_count,
        "batch_jobs_total": batch_jobs_total,
        "batch_jobs_completed": batch_jobs_completed,
        "batch_jobs_processing": batch_jobs_processing,
        "batch_results_total": batch_results_total,
        "recent_incidents": recent,
    }


@router.get("/batch/jobs")
async def list_batch_jobs(limit: int = Query(50, ge=1, le=200)):
    """List all batch processing jobs, most recent first."""
    db = get_db()

    if db is not None:
        jobs = list(
            db.batch_jobs.find({}, {"_id": 0})
            .sort("created_at", -1)
            .limit(limit)
        )
    else:
        jobs = []

    # For each job, attach a summary of results count
    enriched = []
    for job in jobs:
        jid = job["job_id"]
        if db is not None:
            result_count = db.batch_results.count_documents({"job_id": jid})
        else:
            result_count = 0
        enriched.append({**job, "result_count": result_count})

    return {"total": len(enriched), "jobs": enriched}
