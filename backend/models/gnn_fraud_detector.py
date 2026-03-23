"""
Graph Neural Network (GNN) Placeholder for Fraud Ring Detection
Uses PyTorch Geometric structure for future integration.

This module defines the GNN architecture and graph building utilities.
Currently returns mock predictions but is structured for real training.
"""
import numpy as np
from typing import List, Dict

# Try importing PyTorch Geometric; gracefully degrade if not available
try:
    import torch
    import torch.nn.functional as F
    from torch_geometric.nn import GCNConv
    from torch_geometric.data import Data
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    print("⚠️  PyTorch Geometric not installed. GNN will use mock predictions.")


# --- GNN Model Definition ---
if TORCH_AVAILABLE:
    class FraudGNN(torch.nn.Module):
        """
        Graph Convolutional Network for fraud ring detection.
        Uses 2-layer GCN with dropout for node classification.
        """
        def __init__(self, num_node_features: int, hidden_channels: int = 64, num_classes: int = 2):
            super(FraudGNN, self).__init__()
            self.conv1 = GCNConv(num_node_features, hidden_channels)
            self.conv2 = GCNConv(hidden_channels, hidden_channels)
            self.classifier = torch.nn.Linear(hidden_channels, num_classes)
            self.dropout = 0.3

        def forward(self, x, edge_index):
            # First GCN layer
            x = self.conv1(x, edge_index)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
            # Second GCN layer
            x = self.conv2(x, edge_index)
            x = F.relu(x)
            # Classifier
            x = self.classifier(x)
            return F.log_softmax(x, dim=1)


def build_graph(accounts: List[Dict], transactions: List[Dict]) -> dict:
    """
    Build a graph structure from accounts and transactions.

    Args:
        accounts: List of dicts with 'id', 'balance', 'age_days', etc.
        transactions: List of dicts with 'source', 'target', 'amount', etc.

    Returns:
        Dictionary with 'nodes', 'edges', 'node_features', 'edge_features'
    """
    # Build node index mapping
    account_ids = list(set([a['id'] for a in accounts]))
    id_to_idx = {aid: idx for idx, aid in enumerate(account_ids)}

    # Node features: [balance, age_days, transaction_count, avg_amount]
    node_features = []
    for acc in accounts:
        node_features.append([
            acc.get('balance', 0),
            acc.get('age_days', 365),
            acc.get('transaction_count', 0),
            acc.get('avg_amount', 0),
        ])

    # Edge features and edge index
    edge_index = [[], []]  # [source_nodes, target_nodes]
    edge_features = []
    for txn in transactions:
        src = id_to_idx.get(txn['source'])
        tgt = id_to_idx.get(txn['target'])
        if src is not None and tgt is not None:
            edge_index[0].append(src)
            edge_index[1].append(tgt)
            edge_features.append([
                txn.get('amount', 0),
                txn.get('frequency', 1),
                1 if txn.get('is_suspicious', False) else 0,
            ])

    if TORCH_AVAILABLE:
        # Build PyTorch Geometric Data object
        data = Data(
            x=torch.tensor(node_features, dtype=torch.float),
            edge_index=torch.tensor(edge_index, dtype=torch.long),
        )
        return {
            'data': data,
            'node_features': node_features,
            'edge_features': edge_features,
            'num_nodes': len(account_ids),
            'num_edges': len(edge_features),
        }
    else:
        return {
            'node_features': node_features,
            'edge_features': edge_features,
            'num_nodes': len(account_ids),
            'num_edges': len(edge_features),
        }


def predict(accounts: List[Dict], transactions: List[Dict]) -> List[Dict]:
    """
    Predict fraud probability for each account node.
    Currently returns mock predictions.

    In production, this would:
    1. Build graph from accounts/transactions
    2. Run forward pass through trained FraudGNN
    3. Return node-level predictions
    """
    np.random.seed(42)
    results = []
    for acc in accounts:
        # Mock prediction based on heuristics
        risk_score = np.random.beta(2, 5) * 100
        # Higher risk for new accounts with high transaction counts
        if acc.get('age_days', 365) < 30 and acc.get('transaction_count', 0) > 10:
            risk_score = min(risk_score * 2.5, 99)
        results.append({
            'account_id': acc['id'],
            'fraud_probability': round(risk_score, 2),
            'is_suspicious': risk_score > 60,
            'cluster_id': f"FR-{np.random.randint(1000, 9999)}",
        })
    return results
