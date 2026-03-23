"""
Incident Logs API Route
GET /logs
Returns flagged incidents from MongoDB or in-memory store.
"""
from fastapi import APIRouter, Query
from db import get_logs

router = APIRouter(prefix="/logs", tags=["Incident Logs"])


@router.get("")
async def list_logs(limit: int = Query(50, ge=1, le=500)):
    """Retrieve recent flagged incident logs."""
    logs = get_logs(limit=limit)
    return {
        "total": len(logs),
        "incidents": logs,
    }
