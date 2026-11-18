import os
import shutil
import subprocess
import cv2
import numpy as np
from .detector import MouthTracker

def landmarks_from_video(video_path, tracker=None):

  if not os.path.exists(video_path):
    raise FileNotFoundError(f"video not found at {video_path}")

  own_tracker = tracker is None
  tracker = tracker or MouthTracker()
  cap = cv2.VideoCapture(video_path)
  fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

  frames, times = [], []
  index = 0
  aspect = None

  while True:
    ok, frame = cap.read()

    if not ok:
      break

    aspect = frame.shape[0] / frame.shape[1]

    crop, metrics, _ = tracker.process_frame(frame)

    if crop is not None and crop.size > 0:
      frames.append(metrics["landmarks"])
      times.append(int(index / fps * 1000))

    index += 1

  cap.release()

  if own_tracker:
    tracker.close()

  if not frames:
    raise ValueError(f"no mouth found in {video_path}")

  print(f"{video_path}: mouth found in {len(frames)}/{index} frames ({fps:.1f} fps)")
  return np.stack(frames), np.array(times, dtype=np.int64), aspect

def prepare_wav(source, out_path):

  if shutil.which("ffmpeg") is None:
    raise RuntimeError("ffmpeg not found.")
  
  os.makedirs(os.path.dirname(out_path), exist_ok=True)

  subprocess.run(
    ["ffmpeg", "-y", "-i", source, "-vn", "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", out_path],

    check=True, capture_output=True,
  )

  return out_path
