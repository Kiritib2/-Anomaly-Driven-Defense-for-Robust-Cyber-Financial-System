"""
One-time retraining script to build a 6-feature PaySim bot_detector.pkl.
Your current pkl has 5 features. The code sends 6. This fixes the mismatch.
"""
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib
import os

def retrain():
    np.random.seed(42)
    n_samples = 10000

    # PaySim Features (6): type_encoded, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest
    
    # Normal transactions (80%)
    n_normal = int(n_samples * 0.8)
    normal = {
        'type_encoded': np.random.randint(0, 5, n_normal),
        'amount': np.random.lognormal(mean=4.5, sigma=1.2, size=n_normal).clip(10, 500000),
        'oldbalanceOrg': np.random.lognormal(mean=6.0, sigma=1.5, size=n_normal),
        'oldbalanceDest': np.random.lognormal(mean=5.0, sigma=2.0, size=n_normal),
    }
    normal['newbalanceOrig'] = np.maximum(0, normal['oldbalanceOrg'] - normal['amount'])
    normal['newbalanceDest'] = normal['oldbalanceDest'] + normal['amount']

    # Fraud transactions (20%)
    n_bot = n_samples - n_normal
    bot = {
        'type_encoded': np.random.choice([1, 2], n_bot),
        'amount': np.random.lognormal(mean=8.0, sigma=1.0, size=n_bot).clip(1000, 5000000),
        'oldbalanceDest': np.random.lognormal(mean=3.0, sigma=1.0, size=n_bot),
    }
    bot['oldbalanceOrg'] = bot['amount']
    bot['newbalanceOrig'] = np.zeros(n_bot)
    bot['newbalanceDest'] = bot['oldbalanceDest'] + bot['amount']

    X_normal = np.column_stack([normal['type_encoded'], normal['amount'], normal['oldbalanceOrg'], normal['newbalanceOrig'], normal['oldbalanceDest'], normal['newbalanceDest']])
    X_bot = np.column_stack([bot['type_encoded'], bot['amount'], bot['oldbalanceOrg'], bot['newbalanceOrig'], bot['oldbalanceDest'], bot['newbalanceDest']])

    X = np.vstack([X_normal, X_bot])
    y = np.array([0] * n_normal + [1] * n_bot)

    idx = np.random.permutation(len(X))
    X, y = X[idx], y[idx]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        max_depth=12,
        class_weight='balanced'
    )
    model.fit(X_train, y_train)

    accuracy = model.score(X_test, y_test)
    print(f"✅ Model retrained with 6 PaySim features. Accuracy: {accuracy:.4f}")
    print(f"   Features expected: {model.n_features_in_}")

    out_path = os.path.join("backend", "models", "bot_detector.pkl")
    joblib.dump(model, out_path)
    print(f"✅ Saved to {out_path}")

if __name__ == "__main__":
    retrain()
