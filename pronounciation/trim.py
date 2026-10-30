import numpy as np
from .config import ALL_LIP_INDICES, CORNER_LEFT_LIP, CORNER_RIGHT_LIP

# Map MediaPipe landmark IDs to positions in the saved mouth-only arrays.
_POS = {int(m): p for p, m in enumerate(ALL_LIP_INDICES)}
LEFT, RIGHT = _POS[CORNER_LEFT_LIP], _POS[CORNER_RIGHT_LIP]

def activity(frames):
  pts = np.asarray(frames, dtype=np.float32)
  # Center each mouth in XY and use one median width to scale the whole recording.
  center = (pts[:, LEFT, :2] + pts[:, RIGHT, :2]) / 2
  width = np.median(np.linalg.norm(pts[:, RIGHT, :2] - pts[:, LEFT, :2], axis=1))
  shape = (pts[:, :, :2] - center[:, None, :]) / (width + 1e-6)
  # Average coordinate changes between adjacent frames, then smooth over three steps.
  motion = np.abs(np.diff(shape, axis=0)).mean(axis=(1, 2))
  return np.convolve(motion, np.ones(3) / 3, mode="same")

def active_range(frames, pad=3, min_keep=8, fraction=0.25):
  n = len(frames)
  # Keep short recordings intact because there is too little motion data to trim.
  if n < 4:
    return 0, n
  m = activity(frames)
  # Adapt the activity threshold to the recording's stronger mouth movements.
  thr = fraction * np.percentile(m, 90)
  active = np.where(m > thr)[0]
  if len(active) == 0:
    return 0, n
  # Pad the detected motion; +2 includes both frames of the last active transition
  # and makes the end index exclusive for slicing.
  start = max(0, active[0] - pad)
  end = min(n, active[-1] + 2 + pad)
  # Keep the original sequence if trimming would leave too few frames.
  if end - start < min_keep:
    return 0, n
  return start, end

def trim_idle(frames, timestamps_ms, **kwargs):
  start, end = active_range(frames, **kwargs)
  # Slice landmarks and timestamps together, preserving the original time values.
  return frames[start:end], timestamps_ms[start:end]