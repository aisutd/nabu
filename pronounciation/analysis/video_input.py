import os
import shutil
import subprocess
import cv2
import numpy as np
from .detector import MouthTracker

def track_video(video_path, tracker=None, *, track_motion=False, max_seconds=None):
  if not os.path.exists(video_path):
    raise FileNotFoundError(f"video not found at {video_path}")

  own_tracker = tracker is None
  tracker = tracker or MouthTracker(track_motion=track_motion, detection_interval=4 if track_motion else 1)
  cap = cv2.VideoCapture(video_path)
  try:
    fps = float(cap.get(cv2.CAP_PROP_FPS))
    if max_seconds is not None and fps > 0:
      duration = cap.get(cv2.CAP_PROP_FRAME_COUNT) / fps
      if duration > max_seconds:
        raise ValueError(f"Neural comparison requires a trimmed single-word clip no longer than {max_seconds:.1f} seconds")
    frames, positions = [], []
    index = 0
    aspect = None
    while True:
      ok, frame = cap.read()
      if not ok:
        break

      aspect = frame.shape[0] / frame.shape[1]
      if track_motion:
        timestamp_ms = max(index, int(index / (fps or 30.0) * 1000))
        crop, metrics, _ = tracker.process_frame(frame, timestamp_ms=timestamp_ms)
      else:
        crop, metrics, _ = tracker.process_frame(frame)
      if crop is not None and crop.size > 0:
        frames.append(metrics["landmarks"])
        positions.append(index)
      index += 1
  finally:
    cap.release()
    if own_tracker:
      tracker.close()

  if not frames:
    raise ValueError(f"no mouth found in {video_path}")

  return np.stack(frames), np.array(positions), aspect, fps, index


def comparison_landmarks(track):
  frames, positions, aspect, fps, _ = track
  times = (positions / (fps or 30.0) * 1000).astype(np.int64)
  return frames, times, aspect


def landmarks_from_video(video_path, tracker=None):
  return comparison_landmarks(track_video(video_path, tracker))


def prepare_wav(source, out_path):

  if shutil.which("ffmpeg") is None:
    raise RuntimeError("ffmpeg not found.")
  
  os.makedirs(os.path.dirname(out_path), exist_ok=True)

  subprocess.run(
    ["ffmpeg", "-y", "-i", source, "-vn", "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", out_path],

    check=True, capture_output=True,
  )

  return out_path
