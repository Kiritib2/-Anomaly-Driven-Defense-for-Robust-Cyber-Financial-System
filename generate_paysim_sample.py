import pandas as pd
import numpy as np

def generate_sample(n=150):
    np.random.seed(99)
    data = []
    
    # Generate Normal rows
    for i in range(n - 10):
        amount = np.random.lognormal(5, 1)
        data.append({
            'step': 1,
            'type': np.random.choice(['PAYMENT', 'CASH_IN', 'DEBIT']),
            'amount': amount,
            'nameOrig': f"C{np.random.randint(1000, 9999)}",
            'oldbalanceOrg': amount + np.random.uniform(100, 5000),
            'newbalanceOrig': np.random.uniform(100, 5000),
            'nameDest': f"M{np.random.randint(1000, 9999)}",
            'oldbalanceDest': np.random.uniform(0, 10000),
            'newbalanceDest': np.random.uniform(amount, 10000 + amount),
            'isFraud': 0
        })
        
    # Generate Fraud rows (e.g. Draining accounts via TRANSFER/CASH_OUT)
    for i in range(10):
        amount = np.random.lognormal(7, 1)
        data.append({
            'step': 1,
            'type': np.random.choice(['TRANSFER', 'CASH_OUT']),
            'amount': amount,
            'nameOrig': f"HACK{np.random.randint(100, 999)}",
            'oldbalanceOrg': amount, # Exact match, draining
            'newbalanceOrig': 0.0,   # Leaves 0
            'nameDest': f"C{np.random.randint(1000, 9999)}",
            'oldbalanceDest': np.random.uniform(0, 500),
            'newbalanceDest': np.random.uniform(amount, 500 + amount),
            'isFraud': 1
        })
        
    df = pd.DataFrame(data)
    # Shuffle
    df = df.sample(frac=1).reset_index(drop=True)
    df.to_csv("sample_paysim.csv", index=False)
    print("Created sample_paysim.csv with 150 transactions (including 10 injected fraud behaviors).")

if __name__ == "__main__":
    generate_sample()
