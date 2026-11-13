"""Score the letter model on an unseen session, then train and save the final model.

Usage: venv/Scripts/python 2_train_model.py
"""

import pickle
from pathlib import Path

import numpy as np
from sklearn.metrics import confusion_matrix

from asl_core import (
    ALPHABET,
    STATIC_LETTERS,
    load_recorded_session,
    make_letter_network,
    make_model_bundle,
    make_training_set,
    most_confused_pairs,
    per_letter_recall,
)

BASE_DIR = Path(__file__).resolve().parent
SESSION_DIR = BASE_DIR / "my_landmarks"
LABELS = [ALPHABET.index(letter) for letter in STATIC_LETTERS]


def load_dataset():
    """Return the dataset's features and labels, reporting how often a hand was found."""
    with np.load(BASE_DIR / "asl_data.npz") as data:
        if "attempted" not in data.files:
            raise ValueError("asl_data.npz is out of date. Rerun 1_extract_features.py.")
        features, labels, attempted = data["features"], data["labels"], data["attempted"]
    if set(labels.tolist()) != set(LABELS):
        raise ValueError(
            "Expected all 24 static letters. Rerun feature extraction and check your dataset."
        )
    print(f"Dataset: hand found in {len(labels)}/{attempted.sum()} pictures")
    return features, labels


def train(parts):
    """Train a new network on the given (features, labels) parts."""
    features, labels = make_training_set(parts, use_jitter=True)
    model = make_letter_network()
    model.fit(features, labels)
    return model


def print_unseen_session_score(model, test):
    """Print the honest score: how the model does on a session it never trained on."""
    predictions = model.predict(test[0])
    print(f"Accuracy on unseen session: {np.mean(predictions == test[1]):.1%}")
    confusion = confusion_matrix(test[1], predictions, labels=LABELS)
    recall = per_letter_recall(confusion)
    print("  " + "  ".join(f"{s}:{r:.0%}" for s, r in zip(STATIC_LETTERS, recall, strict=True)))
    print("Most-confused letters (actual -> predicted: samples):")
    for actual, predicted, count in most_confused_pairs(confusion, STATIC_LETTERS):
        print(f"  {actual} -> {predicted}: {count}")


def main():
    dataset = load_dataset()
    session_1 = load_recorded_session(SESSION_DIR / "session_1.npz")
    session_2 = load_recorded_session(SESSION_DIR / "session_2.npz")

    print("Training on the dataset + session 1, to test on session 2...")
    print_unseen_session_score(train([dataset, session_1]), session_2)

    # The saved model also learns from session 2, so no unseen data is left to score it on.
    # The score above is the closest estimate we have.
    print("Training the final model on everything...")
    final_model = train([dataset, session_1, session_2])
    with open(BASE_DIR / "asl_static_model.p", "wb") as file:
        pickle.dump(make_model_bundle(final_model), file)
    print("Saved asl_static_model.p")


if __name__ == "__main__":
    main()
