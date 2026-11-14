"""Serve the live demo page: camera preview, recognized letters and signs, and the text.

Runs only on this computer (localhost). Frames stay in memory and are never saved.

Usage (from the asl folder): ../venv/Scripts/python 8_demo_server.py
Then open http://localhost:8000 in a browser.
"""

import json
import pickle
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import cv2

from asl_core import (
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
HOST = "127.0.0.1"
PORT = 8000
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

    def run_camera(self):
        cap = cv2.VideoCapture(0)
        # Keep only the newest frame. Otherwise frames queue up when processing is slower
        # than the camera, and the screen falls behind the hand.
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        try:
            if not cap.isOpened():
                raise RuntimeError("Could not open webcam 0.")
            with make_video_detector(BASE_DIR / "hand_landmarker.task") as detector:
                reader = HandReader(cap, detector)
                while True:
                    self._process_frame(*reader.read())
        except Exception as problem:  # Shown on the page instead of failing silently.
            with self.lock:
                self.error = str(problem)
            raise
        finally:
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
            return dict(self.recognizer.state, text=text, error=self.error)

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


def stream_frames(handler, demo):
    """Send frames one after another as a motion-JPEG stream, which an <img> can show."""
    handler.send_response(200)
    handler.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    try:
        while True:
            jpeg = demo.latest_jpeg()
            if jpeg:
                header = f"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: {len(jpeg)}"
                handler.wfile.write(header.encode() + b"\r\n\r\n" + jpeg + b"\r\n")
                handler.wfile.flush()
            time.sleep(STREAM_FRAME_SECONDS)
    except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
        return  # The browser tab closed.


def make_handler(demo):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/stream":
                stream_frames(self, demo)
            elif self.path == "/state":
                self._send(200, "application/json", json.dumps(demo.snapshot()).encode())
            elif self.path == "/":
                self._send(200, "text/html; charset=utf-8", PAGE.read_bytes())
            else:
                self._send(404, "text/plain", b"Not found")

        def do_POST(self):
            command = self.path.removeprefix("/text/")
            ok = self.path.startswith("/text/") and demo.edit_text(command)
            self._send(200 if ok else 404, "application/json", json.dumps({"ok": ok}).encode())

        def _send(self, status, content_type, body):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):
            pass  # Keeps the terminal quiet; errors still show.

    return Handler


def main():
    letter_bundle = load_bundle(LETTER_MODEL, check_model_bundle)
    sign_bundle = None
    if SIGN_MODEL.exists():
        sign_bundle = load_bundle(SIGN_MODEL, check_sign_bundle)
    else:
        print("No sign model yet, so only letters are recognized. Run 7_train_signs.py.")
    demo = LiveDemo(HybridRecognizer(letter_bundle, sign_bundle))
    threading.Thread(target=demo.run_camera, daemon=True).start()
    server = ThreadingHTTPServer((HOST, PORT), make_handler(demo))
    print(f"Demo running at http://localhost:{PORT}  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
