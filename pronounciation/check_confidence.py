import sys
import csv
from pronounciation.transcribe import transcribe

DATASET = "pronounciation/test_data/dataset.csv"
AUDIO = "pronounciation/test_data/audio/recording_{}.wav"

def typed_label(rid):
  with open(DATASET, newline="") as f:
    reader = csv.reader(f)
    next(reader, None)
    for row in reader:
      if row and row[-1] == str(rid):
        return row[0]
  return None

for rid in sys.argv[1:]:
  label = typed_label(rid)
  words = transcribe(AUDIO.format(rid))
  print(f"\nrecording {rid}  typed: '{label}'")
  for w in words:
    print(f"  {w['word']:<10} prob={w['prob']:.2f}  {w['start_ms']}-{w['end_ms']} ms")