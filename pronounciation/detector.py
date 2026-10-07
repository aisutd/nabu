import os
import cv2
import numpy as np
import mediapipe as mp

from types import SimpleNamespace
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from .config import DEFAULT_MODEL_PATH, DEFAULT_DETECTOR_PATH
from .metrics import compute_phonetic_metrics, extract_mouth_crop

class MouthTracker:
  def __init__(self, landmarker_path: str = DEFAULT_MODEL_PATH, detector_path: str = DEFAULT_DETECTOR_PATH, face_margin: float = 0.25):

    for p in (landmarker_path, detector_path):
      if not os.path.exists(p):
        raise FileNotFoundError(f"model not found at {p}")

    self.face_margin = face_margin

    self.face_detector = vision.FaceDetector.create_from_options(
      vision.FaceDetectorOptions(
        base_options=python.BaseOptions(model_asset_path=detector_path),
        running_mode=vision.RunningMode.IMAGE,
        min_detection_confidence=0.5,
      )
    )

    self.landmarker = vision.FaceLandmarker.create_from_options(
      vision.FaceLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=landmarker_path),
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
      )
    )

  def process_frame(self, frame_bgr: np.ndarray, timestamp_ms: int, padding: int = 25):
    h, w = frame_bgr.shape[:2]
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
    det = self.face_detector.detect(image=mp_image)

    if not det.detections:
      return None, None, None

    box = det.detections[0].bounding_box
    mx = int(box.width * self.face_margin)
    my = int(box.height * self.face_margin)
    fx1 = max(0, box.origin_x - mx)
    fy1 = max(0, box.origin_y - my)
    fx2 = min(w, box.origin_x + box.width + mx) 
    fy2 = min(h, box.origin_y + box.height + my)

    if fx2 <= fx1 or fy2 <= fy1:
      return None, None, None

    face_rgb = np.ascontiguousarray(frame_rgb[fy1:fy2, fx1:fx2])
    face_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=face_rgb)
    res = self.landmarker.detect(image=face_image)

    if not res.face_landmarks:
      return None, None, None

    fw, fh = fx2 - fx1, fy2 - fy1
    landmarks = []
    for lm in res.face_landmarks[0]:
      full_x = (fx1 + lm.x * fw) / w
      full_y = (fy1 + lm.y * fh) / h
      landmarks.append(SimpleNamespace(x=full_x, y=full_y))

    crop, bbox, pts = extract_mouth_crop(frame_bgr, landmarks, padding=padding)
    metrics = compute_phonetic_metrics(landmarks, w, h)
    metrics["bbox"] = bbox
    return crop, metrics, pts

  def close(self):
    self.face_detector.close()
    self.landmarker.close()