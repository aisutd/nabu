import os
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from .config import DEFAULT_MODEL_PATH
from .metrics import compute_phonetic_metrics, extract_mouth_crop

class MouthTracker:
  def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
    if not os.path.exists(model_path):
      raise FileNotFoundError(f"MediaPipe task model not found at {model_path}")

    self.latest = None
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
      base_options=base_options,
      running_mode=vision.RunningMode.LIVE_STREAM,
      result_callback=self._callback, 
      num_faces=1,
    )
    self.detector = vision.FaceLandmarker.create_from_options(options)

  # Iffy on this callback, but it seems to work fine? The callback is called from a different thread than the main thread, so gotta be careful about thread safety? idk
  def _callback(self, result, output_image: mp.Image, timestamp_ms: int):
    self.latest = (result, output_image.numpy_view().copy(), timestamp_ms)

  def process_frame(self, frame_bgr: np.ndarray, timestamp_ms: int, padding: int = 25):
    h, w = frame_bgr.shape[:2]
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

    self.detector.detect_async(mp_image, timestamp_ms)

    snapshot = self.latest
    if snapshot is None:
      return None, None, None

    result, matched_rgb, _ = snapshot

    if not result.face_landmarks:
      return None, None, None

    matched_bgr = cv2.cvtColor(matched_rgb, cv2.COLOR_RGB2BGR)
    h, w = matched_bgr.shape[:2]
    landmarks = result.face_landmarks[0]

    crop, bbox, pts = extract_mouth_crop(matched_bgr, landmarks, padding=padding)
    metrics = compute_phonetic_metrics(landmarks, w, h)
    metrics["bbox"] = bbox

    return crop, metrics, pts

  def close(self):
    self.detector.close()