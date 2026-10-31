import os
import re
import csv
from .config import ALL_LIP_INDICES

DATASET_PATH = "pronounciation/test_data/dataset.csv"

def _header():
  header = ["label", "frame", "timestamp_ms"]
  # Keep XYZ columns in the same landmark order as the captured frames.
  for i in ALL_LIP_INDICES:
    header += [f"lm{i}_x", f"lm{i}_y", f"lm{i}_z"]
  header.append("recording_id")
  return header

def _next_recording_id(path):
  last = 0
  with open(path, newline="") as f:
    reader = csv.reader(f)
    next(reader, None)
    # Ignore separator rows and choose an ID above every existing recording ID.
    for row in reader:
      if row and row[-1].isdigit():
        last = max(last, int(row[-1]))
  return last + 1

def save_recording(label, frames, timestamps_ms, skipped, path=DATASET_PATH):
  os.makedirs(os.path.dirname(path), exist_ok=True)
  header = _header()
  label = label.strip().lower()

  exists = os.path.exists(path) and os.path.getsize(path) > 0
  if exists:
    # Reject incompatible datasets before appending rows with a different layout.
    with open(path, newline="") as f:
      if next(csv.reader(f), None) != header:
        raise ValueError(f"{path} has different columns than this recorder writes. Move or rename it.")
    recording_id = _next_recording_id(path)
  else:
    recording_id = 1

  with open(path, "a", newline="") as f:
    writer = csv.writer(f)
    if not exists:
      writer.writerow(header)
    else:
      # Separate recordings visually without repeating the header.
      writer.writerow([])

    # Write one row per captured frame, sharing the label and recording ID.
    for i, (pts, t) in enumerate(zip(frames, timestamps_ms)):
      row = [label, i, t]
      # Flatten each landmark's XYZ values to match the header, at six decimal places.
      row += [f"{v:.6f}" for v in pts.reshape(-1)]
      row.append(recording_id) 
      writer.writerow(row)

  return path, recording_id
