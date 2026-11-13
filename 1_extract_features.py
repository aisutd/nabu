from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from asl_core import ALPHABET, DETECTION_CONFIDENCE, STATIC_LETTERS, normalize_landmarks

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "SignAlphaSet" / "dataset"
OUTPUT_FILE = BASE_DIR / "asl_data.npz"


def extract_letter(detector, letter):
    """Return one letter's feature vectors and how many pictures were tried."""
    folder = DATA_DIR / letter
    if not folder.is_dir():
        raise FileNotFoundError(f"Missing letter folder: {folder}")
    features = []
    attempted = 0
    for path in sorted(folder.iterdir()):
        image = cv2.imread(str(path)) if path.is_file() else None
        if image is None:
            continue
        attempted += 1
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        if not result.hand_landmarks:
            continue
        height, width = image.shape[:2]
        normalized = normalize_landmarks(result.hand_landmarks[0], width, height)
        if normalized is not None:
            features.append(normalized)
    return features, attempted


def main():
    options = vision.HandLandmarkerOptions(
        base_options=python.BaseOptions(
            model_asset_path=str(BASE_DIR / "hand_landmarker.task")
        ),
        running_mode=vision.RunningMode.IMAGE,
        num_hands=1,
        min_hand_detection_confidence=DETECTION_CONFIDENCE,
    )
    features, labels, attempted_counts = [], [], []
    with vision.HandLandmarker.create_from_options(options) as detector:
        for letter in STATIC_LETTERS:
            letter_features, attempted = extract_letter(detector, letter)
            features.extend(letter_features)
            labels.extend([ALPHABET.index(letter)] * len(letter_features))
            attempted_counts.append(attempted)
            rate = len(letter_features) / max(attempted, 1)
            print(f"{letter}: hand found in {len(letter_features)}/{attempted} ({rate:.1%})")
    if not features:
        raise RuntimeError("No usable hands found. Check the dataset and detector.")
    np.savez(
        OUTPUT_FILE,
        features=np.asarray(features),
        labels=np.asarray(labels),
        # In STATIC_LETTERS order. Training needs it to count undetected pictures as wrong.
        attempted=np.asarray(attempted_counts),
    )
    print(f"Saved {len(features)} samples to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
