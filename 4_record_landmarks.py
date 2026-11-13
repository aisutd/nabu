"""Record your own hand landmarks, one letter at a time.

Saves landmark numbers only, never video frames. Rerunning a session skips finished letters.

Usage: venv/Scripts/python 4_record_landmarks.py 1
"""

import argparse
import time
from pathlib import Path

import cv2
import numpy as np

from asl_core import STATIC_LETTERS, HandReader, landmarks_to_pixels, make_video_detector

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "my_landmarks"
WINDOW_TITLE = "Record landmarks"
SAMPLES_PER_LETTER = 100
# Spacing samples out gives the hand time to change, so they aren't near-duplicates.
SECONDS_BETWEEN_SAMPLES = 0.1
KEY_START = ord(" ")
KEY_REDO = ord("r")
KEY_QUIT = ord("q")
GREEN = (0, 255, 0)
RED = (0, 0, 255)


def show_frame(frame, landmarks, lines):
    """Draw a mirrored preview and return the key pressed. The detector saw the unflipped frame."""
    preview = cv2.flip(frame, 1)
    height, width = preview.shape[:2]
    for landmark in landmarks or []:
        x = int(round((1 - landmark.x) * (width - 1)))
        y = int(round(landmark.y * (height - 1)))
        cv2.circle(preview, (x, y), 4, GREEN, -1)
    color = GREEN if landmarks else RED
    for row, line in enumerate(lines):
        position = (20, 40 + row * 35)
        cv2.putText(preview, line, position, cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)
    cv2.imshow(WINDOW_TITLE, preview)
    return cv2.waitKey(1) & 0xFF


def wait_for_start(reader, letter, position):
    """Show the next letter until the owner presses start. Returns False if they quit."""
    while True:
        frame, landmarks = reader.read()
        lines = [f"Next: {letter} ({position}/{len(STATIC_LETTERS)})", "SPACE start, q quit"]
        key = show_frame(frame, landmarks, lines)
        if key == KEY_START:
            return True
        if key == KEY_QUIT:
            return False


def record_letter(reader, letter):
    """Collect one letter's samples as a (samples, 21, 3) array, or None if the owner quits."""
    samples = []
    last_sample_time = 0.0
    while len(samples) < SAMPLES_PER_LETTER:
        frame, landmarks = reader.read()
        now = time.monotonic()
        if landmarks and now - last_sample_time >= SECONDS_BETWEEN_SAMPLES:
            height, width = frame.shape[:2]
            points = landmarks_to_pixels(landmarks, width, height)
            if points is not None:
                samples.append(points)
                last_sample_time = now
        status = "move, tilt, closer, farther" if landmarks else "No hand found"
        lines = [f"{letter}: {len(samples)}/{SAMPLES_PER_LETTER}", status, "r redo, q quit"]
        key = show_frame(frame, landmarks, lines)
        if key == KEY_REDO:
            samples = []
        elif key == KEY_QUIT:
            return None
    return np.stack(samples)


def load_session(path):
    """Return a saved session's pixels and letters, or empty arrays for a new session."""
    if not path.exists():
        return np.empty((0, 21, 3), dtype=np.float32), np.empty(0, dtype="<U1")
    with np.load(path) as data:
        return data["pixels"], data["letters"]


def save_session(path, pixels, letters):
    path.parent.mkdir(exist_ok=True)
    np.savez(path, pixels=pixels, letters=letters)


def record_session(reader, path):
    """Record every unfinished letter, saving after each so quitting loses at most one letter."""
    pixels, letters = load_session(path)
    for position, letter in enumerate(STATIC_LETTERS, start=1):
        if letter in letters:
            continue
        if not wait_for_start(reader, letter, position):
            return
        samples = record_letter(reader, letter)
        if samples is None:
            return
        pixels = np.concatenate([pixels, samples])
        letters = np.concatenate([letters, np.full(len(samples), letter)])
        save_session(path, pixels, letters)
        print(f"Saved {letter} to {path}")
    print("Session complete.")


def main():
    parser = argparse.ArgumentParser(description="Record hand landmarks for one session.")
    parser.add_argument("session", help="Session name, such as 1 or 2")
    args = parser.parse_args()

    cap = cv2.VideoCapture(0)
    try:
        if not cap.isOpened():
            raise RuntimeError("Could not open webcam 0.")
        with make_video_detector(BASE_DIR / "hand_landmarker.task") as detector:
            reader = HandReader(cap, detector)
            record_session(reader, OUTPUT_DIR / f"session_{args.session}.npz")
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
