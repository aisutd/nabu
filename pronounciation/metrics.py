import numpy as np
from .config import (
  UPPER_INNER_LIP, 
  LOWER_INNER_LIP,
  CORNER_LEFT_LIP,
  CORNER_RIGHT_LIP,
  ALL_LIP_INDICES, 
  DEFAULT_PADDING
)

def compute_phonetic_metrics(landmarks, img_w: int, img_h: int) -> dict:
  top_y = landmarks[UPPER_INNER_LIP].y * img_h
  bottom_y = landmarks[LOWER_INNER_LIP].y * img_h
  left_x = landmarks[CORNER_LEFT_LIP].x * img_w
  right_x = landmarks[CORNER_RIGHT_LIP].x * img_w

  aperture_px = abs(bottom_y - top_y)
  stretch_px = abs(right_x - left_x)
  aspect_ratio = aperture_px / (stretch_px + 1e-6)

  return {
    "aperture_px": float(aperture_px),
    "stretch_px": float(stretch_px),
    "aspect_ratio": float(aspect_ratio)
  }

def extract_mouth_crop(frame: np.ndarray, landmarks, padding: int = DEFAULT_PADDING):
  h, w = frame.shape[:2]

  mouth_x_list = []
  for i in ALL_LIP_INDICES:
    mouth_x_list.append(landmarks[i].x * w)
  mouth_x = np.array(mouth_x_list, dtype=np.float32)

  mouth_y_list = []
  for i in ALL_LIP_INDICES:
    mouth_y_list.append(landmarks[i].y * h)
  mouth_y = np.array(mouth_y_list, dtype=np.float32)

  x1 = max(0, int(np.min(mouth_x)) - padding)
  x2 = min(w, int(np.max(mouth_x)) + padding)
  y1 = max(0, int(np.min(mouth_y)) - padding)
  y2 = min(h, int(np.max(mouth_y)) + padding)

  crop = frame[y1:y2, x1:x2]
  pts = np.column_stack((mouth_x.astype(np.int32), mouth_y.astype(np.int32)))

  return crop, [x1, y1, x2, y2], pts

