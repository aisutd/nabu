import os
import re
import csv
from .config import ALL_LIP_INDICES

RECORDINGS_DIR = "pronounciation/test_data/recordings"

def save_recording(label, frames, timestamps_ms, skipped, out_dir=RECORDINGS_DIR):
  os.makedirs(out_dir, exist_ok=True)

  # Make the spoken label safe to use as a filename.
  safe = re.sub(r"[^a-zA-Z0-9_-]", "_", label.strip().lower())
  path = os.path.join(out_dir, f"{safe}.csv")

  # Number repeated labels to preserve earlier recordings.
  count = 2
  while os.path.exists(path):
    path = os.path.join(out_dir, f"{safe}_{count}.csv")
    count += 1

  header = ["label", "frame", "timestamp_ms"]
  for i in ALL_LIP_INDICES:
    header += [f"lm{i}_x", f"lm{i}_y", f"lm{i}_z"]

  with open(path, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(header)

    for i, (pts, t) in enumerate(zip(frames, timestamps_ms)):
      row = [label.strip(), i , t]
      row += [f"{v:.6f}" for v in pts.reshape(-1)]
      writer.writerow(row)

  return path
