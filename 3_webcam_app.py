"""Recognize static ASL letters live from the webcam.

Usage: venv/Scripts/python 3_webcam_app.py
"""

import pickle
from pathlib import Path

import cv2

from asl_core import (
    HandReader,
    VoteSmoother,
    check_model_bundle,
    confident_letter,
    make_video_detector,
    predict_top3,
)

BASE_DIR = Path(__file__).resolve().parent
WINDOW_TITLE = "ASL Static Alpha Recognition"
KEY_QUIT = ord("q")
GREEN = (0, 255, 0)
RED = (0, 0, 255)
WHITE = (255, 255, 255)


def load_bundle():
    # Load only a model file you created or otherwise trust.
    with open(BASE_DIR / "asl_static_model.p", "rb") as file:
        bundle = pickle.load(file)
    check_model_bundle(bundle)
    return bundle


def draw_preview(frame, landmarks, stable_letter, predictions):
    """Show a mirrored preview. The detector and model saw the unflipped frame."""
    preview = cv2.flip(frame, 1)
    height, width = preview.shape[:2]
    for landmark in landmarks or []:
        x = int(round((1 - landmark.x) * (width - 1)))
        y = int(round(landmark.y * (height - 1)))
        cv2.circle(preview, (x, y), 5, GREEN, -1)
    guesses = " | ".join(f"{letter}: {chance:.0%}" for letter, chance in predictions)
    status = guesses if landmarks else "No Hand Detected"
    color = WHITE if landmarks else RED
    cv2.putText(preview, status, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2, cv2.LINE_AA)
    if stable_letter:
        cv2.putText(preview, stable_letter, (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 3, GREEN, 6)
    cv2.imshow(WINDOW_TITLE, preview)


def run_live_loop(reader, bundle):
    smoother = VoteSmoother()
    while True:
        frame, landmarks = reader.read()
        predictions = []
        if landmarks:
            height, width = frame.shape[:2]
            predictions = predict_top3(bundle["model"], bundle["labels"], landmarks, width, height)
        stable_letter = smoother.update(confident_letter(predictions))
        draw_preview(frame, landmarks, stable_letter, predictions)
        if cv2.waitKey(1) & 0xFF == KEY_QUIT:
            return


def main():
    bundle = load_bundle()
    cap = cv2.VideoCapture(0)
    try:
        if not cap.isOpened():
            raise RuntimeError("Could not open webcam 0.")
        with make_video_detector(BASE_DIR / "hand_landmarker.task") as detector:
            print("Webcam active. Press q in the video window to close.")
            run_live_loop(HandReader(cap, detector), bundle)
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
