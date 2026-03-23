"""
Financial Bot Detection Model
Uses RandomForestClassifier to detect automated bot activity in transactions.
Features: transaction_amount, transaction_frequency, account_age_days,
          device_changes, ip_risk_score
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
import os

_model = None  # Reset on reload to pick up fresh bot_detector.pkl
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "bot_detector.pkl")
_dataset = None


# def _load_dataset():
#     """Load the generated transactions dataset."""
#     global _dataset
#     dataset_path = os.path.join(os.path.dirname(__file__), "..", "datasets", "bank_transactions.csv")
#     if os.path.exists(dataset_path):
#         _dataset = pd.read_csv(dataset_path)
#         return _dataset
#     return None


# def _generate_training_features(n_samples=10000):
#     """Generate synthetic training features based on PaySim structure."""
#     np.random.seed(42)

#     # PaySim Features: type_encoded(0-4), amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest
    
#     # Normal transactions (80%)
#     n_normal = int(n_samples * 0.8)
#     normal = {
#         'type_encoded': np.random.randint(0, 5, n_normal),
#         'amount': np.random.lognormal(mean=4.5, sigma=1.2, size=n_normal).clip(10, 500000),
#         'oldbalanceOrg': np.random.lognormal(mean=6.0, sigma=1.5, size=n_normal),
#         'oldbalanceDest': np.random.lognormal(mean=5.0, sigma=2.0, size=n_normal),
#     }
#     # Normal logic: new = old - amount
#     normal['newbalanceOrig'] = np.maximum(0, normal['oldbalanceOrg'] - normal['amount'])
#     normal['newbalanceDest'] = normal['oldbalanceDest'] + normal['amount']

#     # Bot/Fraud transactions (20%)
#     # Typical Fraud Pattern: Account drained (amount == oldbalanceOrg, newbalanceOrig == 0)
#     # usually via TRANSFER (1) or CASH_OUT (2)
#     n_bot = n_samples - n_normal
#     bot = {
#         'type_encoded': np.random.choice([1, 2], n_bot), # Transfers or Cash outs are high risk
#         'amount': np.random.lognormal(mean=8.0, sigma=1.0, size=n_bot).clip(1000, 5000000),
#         'oldbalanceDest': np.random.lognormal(mean=3.0, sigma=1.0, size=n_bot), # Usually new/empty accounts
#     }
#     bot['oldbalanceOrg'] = bot['amount'] # Draining entire account
#     bot['newbalanceOrig'] = np.zeros(n_bot) 
#     bot['newbalanceDest'] = bot['oldbalanceDest'] + bot['amount']

#     X_normal = np.column_stack([normal['type_encoded'], normal['amount'], normal['oldbalanceOrg'], normal['newbalanceOrig'], normal['oldbalanceDest'], normal['newbalanceDest']])
#     X_bot = np.column_stack([bot['type_encoded'], bot['amount'], bot['oldbalanceOrg'], bot['newbalanceOrig'], bot['oldbalanceDest'], bot['newbalanceDest']])
    
#     X = np.vstack([X_normal, X_bot])
#     y = np.array([0] * n_normal + [1] * n_bot)

#     # Shuffle
#     idx = np.random.permutation(len(X))
#     return X[idx], y[idx]


# def train():
#     """Train the bot detection model."""
#     global _model
#     print("🔄 Training bot detection model...")
#     X, y = _generate_training_features()
#     X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

#     _model = RandomForestClassifier(
#         n_estimators=100,
#         random_state=42,
#         max_depth=12,
#         class_weight='balanced'
#     )
#     _model.fit(X_train, y_train)

#     accuracy = _model.score(X_test, y_test)
#     print(f"✅ Bot detection model trained. Test accuracy: {accuracy:.4f}")

#     joblib.dump(_model, _MODEL_PATH)
#     return accuracy


def get_model():
    """Get the trained model, training if necessary."""
    global _model
    if _model is not None:
        return _model
    if os.path.exists(_MODEL_PATH):
        _model = joblib.load(_MODEL_PATH)
        print("✅ Loaded saved bot detection model.")
        return _model
    # No saved model found — auto-train on first run (fresh environment)
    print("⚠️  No bot_model.pkl found. Training a new model...")
    # train()
    return _model


def predict(transaction_features: dict) -> dict:
    """
    Predict bot probability for a single transaction using PaySim features.
    Keys expected: type_encoded, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest
    """
    model = get_model()
    features = np.array([[
        transaction_features.get('type_encoded', 0),
        transaction_features.get('amount', 500.0),
        transaction_features.get('oldbalanceOrg', 1500.0),
        transaction_features.get('newbalanceOrig', 1000.0),
        transaction_features.get('oldbalanceDest', 0.0),
        transaction_features.get('newbalanceDest', 500.0),
    ]])
    proba = model.predict_proba(features)[0]
    fraud_probability = round(float(proba[1]) * 100, 2)
    is_bot = fraud_probability >= 50

    return {
        "fraud_probability": fraud_probability,
        "is_bot": is_bot,
        "confidence": round(max(proba) * 100, 2),
        "features_used": list(transaction_features.keys()),
    }

def predict_batch(df: pd.DataFrame) -> dict:
    """Predict bot probability for an entire DataFrame (bulk upload)."""
    model = get_model()
    
    # Ensure required columns exist, mapping basic PaySim headers
    required = ['type', 'amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest']
    
    # Handle type encoding if it's string
    if 'type' in df.columns and df['type'].dtype == 'O':
        type_mapping = {'PAYMENT': 0, 'TRANSFER': 1, 'CASH_OUT': 2, 'DEBIT': 3, 'CASH_IN': 4}
        df['_type_encoded'] = df['type'].map(type_mapping).fillna(0)
    else:
        df['_type_encoded'] = df.get('type_encoded', 0)
        
    X = df[['_type_encoded', 'amount', 'oldbalanceOrg', 'newbalanceOrig', 'oldbalanceDest', 'newbalanceDest']].fillna(0).values
    
    probas = model.predict_proba(X)
    fraud_probs = (probas[:, 1] * 100).round(2)
    is_bot = fraud_probs >= 50
    
    # Build list of high-risk transactions
    high_risk_indices = np.where(is_bot)[0]
    flagged = []
    
    # Try to grab an ID column, default to index
    id_col = 'nameOrig' if 'nameOrig' in df.columns else ('step' if 'step' in df.columns else None)
    
    for idx in high_risk_indices[:50]: # top 50 flagged
        tx_id = str(df.iloc[idx][id_col]) if id_col else f"ROW-{idx}"
        flagged.append({
            "transaction_id": tx_id,
            "fraud_probability": float(fraud_probs[idx]),
            "amount": float(df.iloc[idx]['amount'])
        })
        
    return {
        "total_scanned": len(df),
        "total_bots_detected": int(sum(is_bot)),
        "flagged_transactions": flagged,
        "overall_confidence": round(float(np.mean(np.max(probas, axis=1))) * 100, 2)
    }


def predict_by_transaction_id(transaction_id: str) -> dict:
    """
    Look up a real transaction from MongoDB by its ID and predict bot probability.
    Returns None if the transaction is not found in the database.
    """
    from db import get_transaction_by_id
    
    txn = get_transaction_by_id(transaction_id)
    if txn is None:
        return None  # Transaction not found — route will handle 404
    
    # Encode type string to integer
    type_mapping = {'PAYMENT': 0, 'TRANSFER': 1, 'CASH_OUT': 2, 'DEBIT': 3, 'CASH_IN': 4}
    
    features = {
        'type_encoded': type_mapping.get(txn.get('type', 'PAYMENT'), 0),
        'amount': txn.get('amount', 0.0),
        'oldbalanceOrg': txn.get('oldbalanceOrg', 0.0),
        'newbalanceOrig': txn.get('newbalanceOrig', 0.0),
        'oldbalanceDest': txn.get('oldbalanceDest', 0.0),
        'newbalanceDest': txn.get('newbalanceDest', 0.0),
    }

    result = predict(features)
    result['transaction_id'] = transaction_id
    result['transaction_type'] = txn.get('type', 'UNKNOWN')
    result['amount'] = txn.get('amount', 0.0)
    result['source_account'] = txn.get('nameOrig', 'N/A')
    result['dest_account'] = txn.get('nameDest', 'N/A')
    return result


def predict_by_batch_id(batch_id: str) -> dict:
    """
    Fetch all transactions for a batch_id from MongoDB and run batch prediction.
    Returns None if no transactions found for the given batch_id.
    """
    from db import get_transactions_by_batch

    txns = get_transactions_by_batch(batch_id)
    if not txns:
        return None

    df = pd.DataFrame(txns)

    # Use the existing predict_batch which handles type encoding and scoring
    result = predict_batch(df)
    result['batch_id'] = batch_id
    return result
