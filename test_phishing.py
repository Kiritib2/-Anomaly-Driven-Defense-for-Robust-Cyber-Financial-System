import json
from backend.models.phishing_model import predict, train

print("Training/Loading the model...")
train()

urls_to_test = [
    "http://192.168.1.1/login/secure-update/verify",
    "http://secure-paypal-login.com.xyz/account/verify?id=12345",
    "https://google.com",
    "https://github.com/Kiritib2/-Anomaly-Driven-Defense-for-Robust-Cyber-Financial-System.git"
]

results_dict = {}
for url in urls_to_test:
    result = predict(url)
    results_dict[url] = result

with open("test_phishing_results.json", "w") as f:
    json.dump(results_dict, f, indent=2)

print("Results written to test_phishing_results.json")
