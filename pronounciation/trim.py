import numpy as np
from .config import ALL_LIP_INDICES, CORNER_LEFT_LIP, CORNER_RIGHT_LIP

_POS = {int(m): p for p, m in enumerate(ALL_LIP_INDICES)}
LEFT, RIGHT = _POS[CORNER_LEFT_LIP], _POS[CORNER_RIGHT_LIP]

def activity(frames):
  pts = np.asarray(frames, dtype=np.float32)
  center = (pts[:, LEFT, :2] + pts[:, RIGHT, :2]) / 2
  width = np.median(np.linalg.norm(pts[:, RIGHT, :2] - pts[:, LEFT, :2], axis=1))
  shape = (pts[:, :, :2] - center[:, None, :]) / (width + 1e-6)
  motion = np.abs(np.diff(shape, axis=0)).mean(axis=(1, 2))
  return np.convolve(motion, np.ones(3) / 3, mode="same")

def active_range(frames, pad=3, min_keep=8, fraction=0.25):
  n = len(frames)
  if n < 4:
    return 0, n
  m = activity(frames)
  thr = fraction * np.percentile(m, 90)
  active = np.where(m > thr)[0]
  if len(active) == 0:
    return 0, n
  start = max(0, active[0] - pad)
  end = min(n, active[-1] + 2 + pad)
  if end - start < min_keep:
    return 0, n
  return start, end

def trim_idle(frames, timestamps_ms, **kwargs):
  start, end = active_range(frames, **kwargs)
  return frames[start:end], timestamps_ms[start:end]