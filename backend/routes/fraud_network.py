"""
Fraud Ring Network API Route
POST /fraud/network
Returns graph structure for the fraud ring visualizer.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import pandas as pd
import os

router = APIRouter(prefix="/fraud", tags=["Fraud Ring Visualization"])


class NetworkNode(BaseModel):
    id: str
    label: str
    balance: float
    age_days: int
    risk_score: float
    is_suspicious: bool
    group: str  # 'suspicious', 'verified', 'unknown'


class NetworkEdge(BaseModel):
    source: str
    target: str
    amount: float
    is_suspicious: bool


class FraudNetworkResponse(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    cluster_id: str
    total_amount: float
    suspicious_count: int


def _generate_fraud_network() -> dict:
    """Generate a realistic fraud ring network from dataset or synthetically."""
    np.random.seed(42)

    # Try to load from dataset
    dataset_path = os.path.join(os.path.dirname(__file__), "..", "datasets", "bank_transactions.csv")
    if os.path.exists(dataset_path):
        df = pd.read_csv(dataset_path)
        # Pick fraud transactions and their connected accounts
        fraud_df = df[df['is_fraud'] == 1].head(30)
        account_ids = list(fraud_df['account_id'].unique())[:15]
        # Add some normal accounts for contrast
        normal_accounts = list(df[df['is_fraud'] == 0]['account_id'].unique()[:10])
        all_accounts = account_ids + normal_accounts
    else:
        # Generate synthetic accounts
        all_accounts = [f"ACC-{str(i).zfill(6)}" for i in range(25)]
        account_ids = all_accounts[:10]  # First 10 are suspicious

    # Build nodes
    nodes = []
    for acc in all_accounts:
        is_susp = acc in account_ids
        risk = np.random.uniform(60, 98) if is_susp else np.random.uniform(5, 40)
        nodes.append(NetworkNode(
            id=acc,
            label=f"Wallet {acc[-4:]}",
            balance=round(np.random.lognormal(8, 2) if is_susp else np.random.lognormal(6, 1.5), 2),
            age_days=int(np.random.randint(1, 30) if is_susp else np.random.randint(60, 1800)),
            risk_score=round(risk, 2),
            is_suspicious=is_susp,
            group='suspicious' if is_susp else ('verified' if np.random.random() > 0.3 else 'unknown'),
        ))

    # Build edges (transactions between accounts)
    edges = []
    total_amount = 0
    for i in range(len(all_accounts)):
        n_connections = np.random.randint(1, 4)
        for _ in range(n_connections):
            target_idx = np.random.randint(0, len(all_accounts))
            if target_idx != i:
                src = all_accounts[i]
                tgt = all_accounts[target_idx]
                is_susp = src in account_ids and tgt in account_ids
                amount = round(np.random.lognormal(7, 1.5) if is_susp else np.random.lognormal(4, 1), 2)
                total_amount += amount
                edges.append(NetworkEdge(
                    source=src,
                    target=tgt,
                    amount=amount,
                    is_suspicious=is_susp,
                ))

    suspicious_count = sum(1 for n in nodes if n.is_suspicious)

    return FraudNetworkResponse(
        nodes=nodes,
        edges=edges,
        cluster_id=f"FR-{np.random.randint(1000, 9999)}",
        total_amount=round(total_amount, 2),
        suspicious_count=suspicious_count,
    )


@router.post("/network", response_model=FraudNetworkResponse)
async def get_fraud_network():
    """Get the fraud ring network graph structure for visualization."""
    return _generate_fraud_network()
