"""Train the moving-sign model from recorded sessions, and score it on an unseen session.

Each recorded clip is cut with the same MotionSegmenter the live app uses, so the model
trains on exactly the kind of movement it will see live.

Usage: venv/Scripts/python 7_train_signs.py
"""

import pickle
from pathlib import Path

import numpy as np
from sklearn.metrics import confusion_matrix
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from asl_core import (
    DYNAMIC_SIGNS,
    MIN_SIGN_CONFIDENCE,
    NO_SIGN,
    RECIPE_VERSION,
    SEED,
    SEQUENCE_FRAMES,
    MotionSegmenter,
    mirror_sequence_features,
    most_confused_pairs,
    per_letter_recall,
    sequence_features,
)

BASE_DIR = Path(__file__).resolve().parent
SESSION_DIR = BASE_DIR / "my_signs"
OUTPUT_FILE = BASE_DIR / "asl_sign_model.p"
NOISE_COPIES = 2
NOISE_SIZE = 0.03
SIGN_PHASE = 1


def segment_clip(pixels, seconds):
    """Run one clip through the live segmenter and return every movement it finds."""
    segmenter = MotionSegmenter()
    segments, speeds = [], []
    for points, now in zip(pixels, seconds, strict=True):
        hand = None if np.isnan(points).any() else points
        segment = segmenter.update(hand, now)
        speeds.append(segmenter.speed)
        if segment is not None:
            segments.append(segment)
    final = segmenter.update(None, seconds[-1] + 1.0)  # The clip ending counts as the hand leaving.
    if final is not None:
        segments.append(final)
    return segments, np.array(speeds)


def load_session(name):
    """Return a session's sign examples and labels, plus motion statistics for tuning."""
    with np.load(SESSION_DIR / f"session_{name}.npz") as data:
        session = {key: data[key] for key in data.files}
    features, labels, missed = [], [], {}
    rest_speeds, sign_speeds = [], []
    for clip, sign in enumerate(session["clip_signs"]):
        frames = session["clip"] == clip
        segments, speeds = segment_clip(session["pixels"][frames], session["seconds"][frames])
        in_sign_phase = session["phase"][frames] == SIGN_PHASE
        rest_speeds.extend(speeds[~in_sign_phase])
        sign_speeds.extend(speeds[in_sign_phase])
        # A real sign is the longest movement; for no_sign every movement is an example.
        chosen = segments if sign == NO_SIGN else sorted(segments, key=len)[-1:]
        vectors = [vector for vector in map(sequence_features, chosen) if vector is not None]
        if not vectors:
            missed[sign] = missed.get(sign, 0) + 1
        features.extend(vectors)
        labels.extend([sign] * len(vectors))
    report_session(name, labels, missed, rest_speeds, sign_speeds)
    return np.array(features), np.array(labels)


def report_session(name, labels, missed, rest_speeds, sign_speeds):
    recorded = set(labels) | set(missed)
    counts = {sign: labels.count(sign) for sign in DYNAMIC_SIGNS if sign in recorded}
    print(f"\nSession {name}: examples per sign {counts}")
    if missed:
        print(f"  Clips where no movement was found: {missed}")
    rest = np.percentile(rest_speeds, [50, 90, 99])
    sign = np.percentile(sign_speeds, [10, 50, 90])
    print(f"  Speed while resting  (50/90/99%): {np.round(rest, 2)}")
    print(f"  Speed while signing  (10/50/90%): {np.round(sign, 2)}")


def make_training_set(features, labels):
    """Add mirrored copies and noisy copies. Training data only."""
    rng = np.random.default_rng(SEED)
    copies = [features, mirror_sequence_features(features)]
    for _ in range(NOISE_COPIES):
        copies.append(copies[len(copies) % 2] + rng.normal(0, NOISE_SIZE, features.shape))
    return np.concatenate(copies), np.tile(labels, len(copies))


def train(features, labels):
    train_x, train_y = make_training_set(features, labels)
    network = MLPClassifier(
        hidden_layer_sizes=(128,), alpha=1e-3, max_iter=500, random_state=SEED
    )
    model = make_pipeline(StandardScaler(), network)
    model.fit(train_x, train_y)
    return model


def score(model, test_x, test_y, title):
    """Print the honest score on an unseen session, including words added by mistake."""
    probabilities = model.predict_proba(test_x)
    predicted = model.classes_[probabilities.argmax(axis=1)]
    sure = probabilities.max(axis=1) >= MIN_SIGN_CONFIDENCE
    would_add = sure & (predicted != NO_SIGN)
    labels = [sign for sign in DYNAMIC_SIGNS if sign in set(test_y) | set(predicted)]
    confusion = confusion_matrix(test_y, predicted, labels=labels)
    print(f"\n{title}: accuracy {np.mean(predicted == test_y):.1%}")
    recall = per_letter_recall(confusion)
    print("  " + "  ".join(f"{s}:{r:.0%}" for s, r in zip(labels, recall, strict=True)))
    real = test_y != NO_SIGN
    added_correctly = np.mean(would_add[real] & (predicted[real] == test_y[real]))
    print(f"  Real signs added as the right word: {added_correctly:.1%}")
    if (~real).any():
        print(f"  Non-sign movements added as a word by mistake: {np.mean(would_add[~real]):.1%}")
    for actual, guess, count in most_confused_pairs(confusion, labels, count=5):
        print(f"  {actual} -> {guess}: {count}")


def main():
    names = sorted(path.stem.removeprefix("session_") for path in SESSION_DIR.glob("session_*.npz"))
    if not names:
        raise FileNotFoundError("No recordings in my_signs. Run 6_record_signs.py first.")
    sessions = {name: load_session(name) for name in names}
    if len(names) >= 2:  # noqa: PLR2004 - two sessions allow a fair test
        first, second = sessions[names[0]], sessions[names[1]]
        score(train(*first), *second, f"Train session {names[0]}, test session {names[1]}")
        score(train(*second), *first, f"Train session {names[1]}, test session {names[0]}")
    else:
        print("\nOnly one session, so there's no unseen data for an honest score.")
    all_x = np.concatenate([features for features, _ in sessions.values()])
    all_y = np.concatenate([labels for _, labels in sessions.values()])
    bundle = {
        "model": train(all_x, all_y),
        "recipe_version": RECIPE_VERSION,
        "sequence_frames": SEQUENCE_FRAMES,
    }
    bundle["labels"] = list(bundle["model"].classes_)
    with open(OUTPUT_FILE, "wb") as file:
        pickle.dump(bundle, file)
    print(f"\nSaved {OUTPUT_FILE.name} trained on sessions {', '.join(names)}")


if __name__ == "__main__":
    main()
