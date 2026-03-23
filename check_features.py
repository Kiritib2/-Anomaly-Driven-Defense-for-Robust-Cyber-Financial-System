import joblib
model = joblib.load("backend/models/bot_detector.pkl")
print(model.n_features_in_)
