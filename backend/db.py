"""
MongoDB connection utility.
Professionalized database driver using python-dotenv and standard logging.
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, List
import uuid
from dotenv import load_dotenv

# Initialize logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "cyber_fraud_platform")

# Singleton DB instance
_db = None
_mongo_available = False


def get_db():
    """
    Get MongoDB database instance.
    Returns the database object if connected, or None if unavailable.
    This will NOT crash the application — routes should check for None.
    """
    global _db, _mongo_available
    if _db is not None:
        return _db

    try:
        from pymongo import MongoClient
        from pymongo.errors import ConnectionFailure

        logger.info(f"Attempting to connect to MongoDB at {MONGODB_URI}")
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)

        # Ping to verify strict connection
        client.admin.command('ping')

        _db = client[DATABASE_NAME]
        _mongo_available = True
        logger.info("✅ Successfully connected to MongoDB Database.")
        return _db
    except Exception as e:
        logger.warning(f"⚠️  MongoDB not available ({e}). Database features will be limited.")
        _mongo_available = False
        return None


def require_db():
    """
    Get db or raise a clear HTTP-friendly error.
    Use this inside route handlers that strictly need the database.
    """
    db = get_db()
    if db is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Please ensure MongoDB is running."
        )
    return db


# ---------------------------------------------------------------------------
#  Incident log helpers
# ---------------------------------------------------------------------------

def log_incident(data: dict):
    """Log a flagged incident to MongoDB. Silently skips if DB is unavailable."""
    try:
        record = {
            "account_id": data.get("account_id", "unknown"),
            "transaction_id": data.get("transaction_id", "unknown"),
            "fraud_probability": data.get("fraud_probability", 0.0),
            "timestamp": data.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "model_version": data.get("model_version", "v1.0-rf"),
            "action_taken": data.get("action_taken", "flagged"),
            "threat_type": data.get("threat_type", "unknown"),
        }
        db = get_db()
        if db is not None:
            db.incident_logs.insert_one(record)
            logger.info(f"🚨 Logged incident for ID: {record['transaction_id']} ({record['action_taken']})")
        else:
            logger.warning(f"⚠️  Skipped logging incident (DB offline): {record['transaction_id']}")
        return record
    except Exception as e:
        logger.error(f"Failed to log incident: {e}")


def get_logs(limit: int = 50):
    """Retrieve top incident logs from MongoDB."""
    db = get_db()
    if db is not None:
        cursor = db.incident_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit)
        return list(cursor)
    return []


# ---------------------------------------------------------------------------
#  Batch-job helpers
# ---------------------------------------------------------------------------

def create_batch_job(total_items: int) -> str:
    """Create a batch job record in DB and return its job_id."""
    job_id = uuid.uuid4().hex[:16]
    doc = {
        "job_id": job_id,
        "status": "processing",
        "total_items": total_items,
        "completed_items": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    db = get_db()
    if db is not None:
        db.batch_jobs.insert_one(doc.copy())
    return job_id


def update_batch_job(job_id: str, status: str, completed_items: int):
    """Update the progress of a batch job."""
    try:
        db = get_db()
        if db is not None:
            now = datetime.now(timezone.utc).isoformat()
            db.batch_jobs.update_one(
                {"job_id": job_id},
                {"$set": {"status": status, "completed_items": completed_items, "updated_at": now}},
            )
    except Exception as e:
        logger.error(f"Failed to update batch job {job_id}: {e}")


def get_batch_job(job_id: str) -> Optional[dict]:
    """Fetch a batch job document by its job_id."""
    db = get_db()
    if db is not None:
        return db.batch_jobs.find_one({"job_id": job_id}, {"_id": 0})
    return None


def save_batch_results(job_id: str, results: List[dict]):
    """Persist batched results via insert_many."""
    if not results:
        return
    try:
        tagged = [{**r, "job_id": job_id} for r in results]
        db = get_db()
        if db is not None:
            db.batch_results.insert_many(tagged)
            logger.info(f"Batched {len(tagged)} records for job {job_id}")
    except Exception as e:
        logger.error(f"Bulk insert failure for batch {job_id}: {e}")


def get_batch_results(job_id: str) -> List[dict]:
    """Retrieve all stored results for a given batch job."""
    db = get_db()
    if db is not None:
        return list(db.batch_results.find({"job_id": job_id}, {"_id": 0}))
    return []


# ---------------------------------------------------------------------------
#  Transaction lookup helpers (for real-time bot detection)
# ---------------------------------------------------------------------------

def get_transaction_by_id(transaction_id: str) -> Optional[dict]:
    """Fetch a single PaySim transaction from MongoDB by its transaction_id."""
    db = get_db()
    if db is not None:
        return db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
    return None


def get_transaction_count() -> int:
    """Return total number of transactions in the DB."""
    db = get_db()
    if db is not None:
        return db.transactions.count_documents({})
    return 0


def get_transactions_by_batch(batch_id: str) -> List[dict]:
    """Fetch all transactions belonging to a specific batch_id."""
    db = get_db()
    if db is not None:
        return list(db.transactions.find({"batch_id": batch_id}, {"_id": 0}))
    return []


def get_available_batches() -> List[dict]:
    """Return a list of distinct batch IDs with their transaction counts."""
    db = get_db()
    if db is not None:
        pipeline = [
            {"$group": {"_id": "$batch_id", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        results = list(db.transactions.aggregate(pipeline))
        return [{"batch_id": r["_id"], "count": r["count"]} for r in results if r["_id"] is not None]
    return []
