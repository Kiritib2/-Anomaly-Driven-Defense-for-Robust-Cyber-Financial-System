import joblib
import os

model_path = os.path.join("backend", "models", "bot_detector.pkl")
model = joblib.load(model_path)

print(f"Model type: {type(model)}")
print(f"Number of features expected: {model.n_features_in_}")
try:
    print(f"Feature names: {model.feature_names_in_}")
except:
    print("No feature names stored (trained with numpy array)")
print(f"Number of estimators: {model.n_estimators}")
print(f"Classes: {model.classes_}")
