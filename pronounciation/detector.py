import os
import cv2
import numpy as np
import mediapipe as mp

from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from .config import DEFAULT_MODEL_PATH, DEFAULT_DETECTOR_PATH, DEFAULT_PADDING, ALL_LIP_INDICES
from .metrics import compute_phonetic_metrics, extract_mouth_crop

class MouthTracker:
  def __init__(self, landmarker_path: str = DEFAULT_MODEL_PATH, detector_path: str = DEFAULT_DETECTOR_PATH, face_margin: float = 0.25, detection_interval: int = 1):

    for p in (landmarker_path, detector_path):
      if not os.path.exists(p):
        raise FileNotFoundError(f"model not found at {p}")

    if detection_interval < 1:
      raise ValueError("detection_interval must be at least 1")

    self.face_margin = face_margin
    self.detection_interval = detection_interval
    # Keep the face region between detection passes.
    self._face_bounds = None
    self._frame_count = 0
    self._frame_shape = None

    # Locate the face before estimating its landmarks.
    self.face_detector = vision.FaceDetector.create_from_options(
      vision.FaceDetectorOptions(
        base_options=python.BaseOptions(model_asset_path=detector_path),
        running_mode=vision.RunningMode.IMAGE,
        min_detection_confidence=0.5,
      )
    )

    # Estimate detailed landmarks inside the face region.
    self.landmarker = vision.FaceLandmarker.create_from_options(
      vision.FaceLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=landmarker_path),
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
      )
    )

  def _detect_face_bounds(self, frame_rgb):
    h, w = frame_rgb.shape[:2]
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
    result = self.face_detector.detect(image=image)
    if not result.detections:
      return None

    # Add context around the detected face.
    box = result.detections[0].bounding_box
    mx = int(box.width * self.face_margin)
    my = int(box.height * self.face_margin)
    x1 = max(0, box.origin_x - mx)
    y1 = max(0, box.origin_y - my)
    x2 = min(w, box.origin_x + box.width + mx)
    y2 = min(h, box.origin_y + box.height + my)
    return (x1, y1, x2, y2) if x2 > x1 and y2 > y1 else None

  def process_frame(self, frame_bgr: np.ndarray, padding: int = DEFAULT_PADDING):
    h, w = frame_bgr.shape[:2]
    # MediaPipe expects RGB; OpenCV supplies BGR.
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    # Refresh cached bounds when needed.
    if (
      self._face_bounds is None
      or self._frame_shape != (h, w)
      or self._frame_count % self.detection_interval == 0
    ):
      self._face_bounds = self._detect_face_bounds(frame_rgb)
    self._frame_shape = (h, w)
    self._frame_count += 1

    if self._face_bounds is None:
      return None, None, None

    fx1, fy1, fx2, fy2 = self._face_bounds
    # Give MediaPipe a contiguous face image.
    face_rgb = np.ascontiguousarray(frame_rgb[fy1:fy2, fx1:fx2])
    face_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=face_rgb)
    result = self.landmarker.detect(image=face_image)
    if not result.face_landmarks:
      # Reacquire the face on the next frame.
      self._face_bounds = None
      return None, None, None

    landmarks = result.face_landmarks[0]
    face_bgr = frame_bgr[fy1:fy2, fx1:fx2]
    # Apply mouth padding after moving to full-frame coordinates.
    _, box, pts = extract_mouth_crop(face_bgr, landmarks, padding=0)
    x1, y1, x2, y2 = box
    # Translate the mouth box back to the full frame.
    bbox = [
      max(0, fx1 + x1 - padding),
      max(0, fy1 + y1 - padding),
      min(w, fx1 + x2 + padding),
      min(h, fy1 + y2 + padding),
    ]
    x1, y1, x2, y2 = bbox
    crop = frame_bgr[y1:y2, x1:x2]
    # Move drawing points from face coordinates to image coordinates.
    pts += np.array([fx1, fy1], dtype=np.int32)
    metrics = compute_phonetic_metrics(landmarks, fx2 - fx1, fy2 - fy1)

    metrics["bbox"] = bbox

    lip_points = []
    for i in ALL_LIP_INDICES:
      point = [landmarks[i].x, landmarks[i].y, landmarks[i].z]
      lip_points.append(point)

    lip = np.array(lip_points, dtype=np.float32)

    lip[:, 0] = (fx1 + lip[:, 0] * (fx2 - fx1)) / w
    lip[:, 1] = (fy1 + lip[:, 1] * (fy2 - fy1)) / h
    lip[:, 2] = lip[:, 2] * (fx2 - fx1) / w
    metrics["landmarks"] = lip

    return crop, metrics, pts

  def close(self):
    self.face_detector.close()
    self.landmarker.close()
