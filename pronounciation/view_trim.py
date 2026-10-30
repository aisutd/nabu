import sys
import csv
import numpy as np
from pronounciation.trim import activity, active_range

DATASET = "pronounciation/test_data/dataset.csv"

def load(rid):
  frames, label = [], None
  with open(DATASET, newline="") as f:
    reader = csv.reader(f)
    next(reader, None)
    for row in reader:
      if row and row[-1] == str(rid):
        label = row[0]
        # Strip label/frame/time and recording ID columns, restoring 40 XYZ landmarks.
        frames.append(np.array(row[3:-1], dtype=np.float32).reshape(40, 3))
  return label, frames

# Preview trimming for each recording ID supplied on the command line.
for rid in sys.argv[1:]:
  label, frames = load(rid)
  if not frames:
    print(f"recording {rid}: not found")
    continue
  start, end = active_range(frames)
  m = activity(frames)
  # Scale the strongest activity to a 40-character bar for the terminal display.
  scale = 40 / (m.max() + 1e-9)
  print(f"\nrecording {rid} '{label}': {len(frames)} frames -> keep {start}..{end - 1} ({end - start} frames)")
  for i in range(len(frames)):
    # Activity describes frame transitions, so reuse its final value for the last frame.
    bar = "#" * int(m[min(i, len(m) - 1)] * scale)
    tag = "keep" if start <= i < end else "trim"
    print(f"{i:3d} {tag}  {bar}")