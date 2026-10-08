import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import pickle

# Load extracted dataset matrices
data = np.load('asl_data.npz')
X = data['features']
y = data['labels']

# Split data 80% training / 20% validation
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

print(f"Training machine learning model on {X_train.shape[0]} samples...")
classifier = RandomForestClassifier(n_estimators=100, random_state=42)
classifier.fit(X_train, y_train)

# Evaluate accuracy
y_pred = classifier.predict(X_test)
score = accuracy_score(y_test, y_pred)
print(f"Model Training Complete! Validation Accuracy: {score * 100:.2f}%")

# Export classification weight parameters
with open('asl_static_model.p', 'wb') as f:
    pickle.dump(classifier, f)
print("Saved trained model weights to 'asl_static_model.p'")
