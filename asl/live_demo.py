"""Camera capture and shared state for the ASL demo."""

import pickle
import threading
import time
from pathlib import Path

import cv2

from .asl_core import (
    HandReader,
    HybridRecognizer,
    check_model_bundle,
    check_sign_bundle,
    make_video_detector,
)

BASE_DIR = Path(__file__).resolve().parent
PAGE = BASE_DIR / "demo_web" / "index.html"
LETTER_MODEL = BASE_DIR / "asl_static_model.p"
SIGN_MODEL = BASE_DIR / "asl_sign_model.p"
JPEG_QUALITY = 75
STREAM_FRAME_SECONDS = 1 / 30
DOT_COLOR = (59, 72, 217)  # the page's jam red, in OpenCV's blue-green-red order


def load_bundle(path, check):
    # Load only a model file you created or otherwise trust.
    with open(path, "rb") as file:
        bundle = pickle.load(file)
    check(bundle)
    return bundle


def mirrored_preview(frame, landmarks):
    """Flip for a mirror-like view and draw the hand. The models saw the unflipped frame."""
    preview = cv2.flip(frame, 1)
    height, width = preview.shape[:2]
    for landmark in landmarks or []:
        x = int(round((1 - landmark.x) * (width - 1)))
        y = int(round(landmark.y * (height - 1)))
        cv2.circle(preview, (x, y), 5, DOT_COLOR, -1)
    return preview


class LiveDemo:
    """Runs the camera on one background thread and shares the latest results.

    The lock makes sure a web request never reads results while the camera thread is
    halfway through writing them.
    """

    def __init__(self, recognizer):
        self.recognizer = recognizer
        self.lock = threading.Lock()
        self.jpeg = None
        self.error = None
        self.stopping = threading.Event()

    def run_camera(self):
        cap = None
        try:
            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if not cap.isOpened():
                raise RuntimeError("Could not open webcam 0.")
            with make_video_detector(BASE_DIR / "hand_landmarker.task") as detector:
                reader = HandReader(cap, detector)
                while not self.stopping.is_set():
                    self._process_frame(*reader.read())
        except Exception as problem:  # Shown on the page instead of failing silently.
            with self.lock:
                self.error = str(problem)
        finally:
            if cap is not None:
                cap.release()

    def _process_frame(self, frame, landmarks):
        height, width = frame.shape[:2]
        encoded = cv2.imencode(
            ".jpg", mirrored_preview(frame, landmarks), [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
        )[1]
        with self.lock:
            self.recognizer.update(landmarks, width, height, time.monotonic())
            self.jpeg = encoded.tobytes()

    def snapshot(self):
        with self.lock:
            # Read the text live, so a button click shows up before the next camera frame.
            text = self.recognizer.transcript.text
            state = {
                "mode": "no_hand",
                "letter": None,
                "speed": 0.0,
                "guesses": [],
                "last_sign": None,
                "signs_enabled": self.recognizer.sign_bundle is not None,
            }
            state.update(self.recognizer.state, text=text, error=self.error)
            return state

    def latest_jpeg(self):
        with self.lock:
            return self.jpeg

    def edit_text(self, command):
        actions = {
            "space": self.recognizer.transcript.space,
            "backspace": self.recognizer.transcript.backspace,
            "clear": self.recognizer.transcript.clear,
        }
        if command not in actions:
            return False
        with self.lock:
            actions[command]()
        return True


def create_demo():
    letter_bundle = load_bundle(LETTER_MODEL, check_model_bundle)
    sign_bundle = None
    if SIGN_MODEL.exists():
        sign_bundle = load_bundle(SIGN_MODEL, check_sign_bundle)
    else:
        print("No sign model yet, so only letters are recognized. Run 7_train_signs.py.")
    return LiveDemo(HybridRecognizer(letter_bundle, sign_bundle))
