import os
import re
import time
import numpy as np

RECORDINGS_DIR = "pronounciation/test-data/recordings"

def save_recording(label, frames, timestamps_ms, skipped, out_dir=RECORDINGS_DIR):
  os.makedirs(out_dir, exist_ok=True)

  safe = re.sub(r"[^a-zA-Z0-9_-]", "_", label.strip().lower())
  path = os.path.join(out_dir, f"{safe}_{int(time.time())}.npz")

  np.savez(
    path, 
    landmarks=np.stack(frames),
    timestamps_ms=np.array(timestamps_ms, dtype=np.int64),
    label=label.strip(), 
    skipped=skipped,
  )

  return path