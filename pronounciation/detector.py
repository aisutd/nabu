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

    self.latest_result = None
    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
      base_options=base_options,
      running_mode=vision.RunningMode.LIVE_STREAM,
      result_callback=self._callback, 
      num_faces=1,
    )
    self.detector = vision.FaceLandmarker.create_from_options(options)
