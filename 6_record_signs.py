"""Record moving signs as short clips: rest, sign, rest.

Saves hand landmark numbers only, never video frames. Rerunning a session skips finished signs.

Usage: venv/Scripts/python 6_record_signs.py 1
"""

import argparse
import time
from pathlib import Path

import cv2
import numpy as np

from asl_core import DYNAMIC_SIGNS, HandReader, landmarks_to_pixels, make_video_detector

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "my_signs"
WINDOW_TITLE = "Record signs"
CLIPS_PER_SIGN = 20
# Each clip is a still start, the sign, then a still end, like signing for real.
PHASES = [("Hold still", 1.0), ("SIGN NOW", 2.5), ("Hold still", 0.8)]
NO_SIGN_HINT = "change letters, scratch, reach, wave"
KEY_START = ord(" ")
KEY_REDO = ord("r")
KEY_QUIT = ord("q")
GREEN = (0, 255, 0)
RED = (0, 0, 255)


class StopClip(Exception):
    """Raised when the owner presses redo or quit in the middle of a clip."""


def show_frame(frame, landmarks, lines, color):
    """Draw a mirrored preview and return the key pressed. The detector saw the unflipped frame."""
    preview = cv2.flip(frame, 1)
    height, width = preview.shape[:2]
    for landmark in landmarks or []:
        x = int(round((1 - landmark.x) * (width - 1)))
        y = int(round(landmark.y * (height - 1)))
        cv2.circle(preview, (x, y), 4, GREEN, -1)
    for row, line in enumerate(lines):
        position = (20, 40 + row * 35)
        cv2.putText(preview, line, position, cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)
    cv2.imshow(WINDOW_TITLE, preview)
    return cv2.waitKey(1) & 0xFF


def wait_for_start(reader, sign, position, total):
    """Show the next sign until the owner presses start. Returns False if they quit."""
    while True:
        frame, landmarks = reader.read()
        lines = [f"Next: {sign} ({position}/{total})", "SPACE start, q quit"]
        if sign == "no_sign":
            lines.insert(1, NO_SIGN_HINT)
        key = show_frame(frame, landmarks, lines, GREEN)
        if key == KEY_START:
            return True
        if key == KEY_QUIT:
            return False


def record_clip(reader, sign, clip_number):
    """Record one clip. Returns its frames as (pixels, seconds, phases) lists."""
    pixels, seconds, phases = [], [], []
    clip_start = time.monotonic()
    for phase_index, (label, duration) in enumerate(PHASES):
        phase_end = time.monotonic() + duration
        while time.monotonic() < phase_end:
            frame, landmarks = reader.read()
            height, width = frame.shape[:2]
            points = landmarks_to_pixels(landmarks, width, height) if landmarks else None
            # A missing hand is stored as NaN so every frame keeps its place in time.
            pixels.append(points if points is not None else np.full((21, 3), np.nan))
            seconds.append(time.monotonic() - clip_start)
            phases.append(phase_index)
            lines = [f"{sign}: clip {clip_number}/{CLIPS_PER_SIGN}", label, "r redo sign, q quit"]
            color = GREEN if phase_index == 1 else RED
            key = show_frame(frame, landmarks, lines, color)
            if key in (KEY_REDO, KEY_QUIT):
                raise StopClip(key)
    return pixels, seconds, phases


def record_sign(reader, sign):
    """Record every clip of one sign, restarting on redo. Returns None if the owner quits."""
    while True:
        try:
            return [record_clip(reader, sign, number) for number in range(1, CLIPS_PER_SIGN + 1)]
        except StopClip as stop:
            if stop.args[0] == KEY_QUIT:
                return None


def load_session(path):
    """Return a saved session as a dict of arrays, or empty arrays for a new session."""
    if not path.exists():
        return {
            "pixels": np.empty((0, 21, 3), dtype=np.float32),
            "seconds": np.empty(0),
            "phase": np.empty(0, dtype=int),
            "clip": np.empty(0, dtype=int),
            "clip_signs": np.empty(0, dtype="<U16"),
        }
    with np.load(path) as data:
        return {name: data[name] for name in data.files}


def add_clips(session, sign, clips):
    """Append one sign's clips to the session, numbering each clip."""
    next_clip = len(session["clip_signs"])
    for offset, (pixels, seconds, phases) in enumerate(clips):
        session["pixels"] = np.concatenate([session["pixels"], np.asarray(pixels, np.float32)])
        session["seconds"] = np.concatenate([session["seconds"], seconds])
        session["phase"] = np.concatenate([session["phase"], phases])
        session["clip"] = np.concatenate([session["clip"], [next_clip + offset] * len(phases)])
    session["clip_signs"] = np.concatenate([session["clip_signs"], [sign] * len(clips)])


def record_session(reader, path, signs):
    """Record every unfinished sign, saving after each so quitting loses at most one sign."""
    session = load_session(path)
    for position, sign in enumerate(signs, start=1):
        if sign in session["clip_signs"]:
            continue
        if not wait_for_start(reader, sign, position, len(signs)):
            return
        clips = record_sign(reader, sign)
        if clips is None:
            return
        add_clips(session, sign, clips)
        path.parent.mkdir(exist_ok=True)
        np.savez(path, **session)
        print(f"Saved {sign} to {path}")
    print("Session complete.")


def main():
    parser = argparse.ArgumentParser(description="Record moving signs for one session.")
    parser.add_argument("session", help="Session name, such as 1 or 2")
    parser.add_argument(
        "--signs", nargs="+", choices=DYNAMIC_SIGNS, default=DYNAMIC_SIGNS,
        help="Record only these signs, such as: --signs thank_you no_sign",
    )
    args = parser.parse_args()

    cap = cv2.VideoCapture(0)
    try:
        if not cap.isOpened():
            raise RuntimeError("Could not open webcam 0.")
        with make_video_detector(BASE_DIR / "hand_landmarker.task") as detector:
            reader = HandReader(cap, detector)
            record_session(reader, OUTPUT_DIR / f"session_{args.session}.npz", args.signs)
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
