"""Score static letter models on a recorded session they never trained on.

This compares training mixes and doesn't change the saved model.

Usage (from the asl folder): ../venv/Scripts/python 5_evaluate_on_session.py
"""

from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import confusion_matrix

from asl_core import (
    ALPHABET,
    SEED,
    STATIC_LETTERS,
    load_recorded_session,
    make_letter_network,
    make_training_set,
    most_confused_pairs,
    per_letter_recall,
)

BASE_DIR = Path(__file__).resolve().parent
SESSION_DIR = BASE_DIR / "my_landmarks"
LABELS = [ALPHABET.index(letter) for letter in STATIC_LETTERS]


def load_dataset():
    with np.load(BASE_DIR / "asl_data.npz") as data:
        return data["features"], data["labels"]


def load_and_report_session(name):
    """Return a session's features and labels, reporting how many samples each letter has."""
    features, labels = load_recorded_session(SESSION_DIR / f"session_{name}.npz")
    counts = [int(np.sum(labels == label)) for label in LABELS]
    print(f"Session {name}: {len(labels)} samples, {min(counts)} to {max(counts)} per letter")
    return features, labels


def make_model(kind):
    if kind == "forest":
        return RandomForestClassifier(n_estimators=100, random_state=SEED, n_jobs=-1)
    return make_letter_network()


def score(kind, parts, use_jitter, test):
    """Train one model and return its accuracy and confusion matrix on the unseen session."""
    train_x, train_y = make_training_set(parts, use_jitter)
    model = make_model(kind)
    model.fit(train_x, train_y)
    predictions = model.predict(test[0])
    confusion = confusion_matrix(test[1], predictions, labels=LABELS)
    return float(np.mean(predictions == test[1])), confusion


def print_details(title, confusion):
    recall = per_letter_recall(confusion)
    print(f"\n{title}")
    print("  " + "  ".join(f"{s}:{r:.0%}" for s, r in zip(STATIC_LETTERS, recall, strict=True)))
    for actual, predicted, count in most_confused_pairs(confusion, STATIC_LETTERS, count=8):
        print(f"  {actual} -> {predicted}: {count}")


def main():
    dataset = load_dataset()
    session_1 = load_and_report_session("1")
    session_2 = load_and_report_session("2")
    experiments = [
        ("dataset only -> session 2", [dataset], session_2),
        ("session 1 only -> session 2", [session_1], session_2),
        ("dataset + session 1 -> session 2", [dataset, session_1], session_2),
        ("dataset + session 2 -> session 1", [dataset, session_2], session_1),
    ]
    results = []
    print(f"\n{'training -> test':36}{'model':8}{'jitter':8}accuracy")
    for name, parts, test in experiments:
        for kind in ("forest", "network"):
            for use_jitter in (False, True):
                accuracy, confusion = score(kind, parts, use_jitter, test)
                print(f"{name:36}{kind:8}{str(use_jitter):8}{accuracy:.1%}", flush=True)
                results.append((accuracy, f"{name}, {kind}, jitter={use_jitter}", confusion))
    print_details(f"Dataset-only forest: {results[0][1]}", results[0][2])
    best = max(results, key=lambda result: result[0])
    print_details(f"Best: {best[1]}", best[2])


if __name__ == "__main__":
    main()
