import csv
from pathlib import Path
import numpy as np
from .config import ALL_LIP_INDICES


# Location of our raw webcam recordings
RECORDINGS_DIR = Path("pronounciation/test_data/recordings")

# Location where our CSV will be saved
OUTPUT_FILE = Path(r"C:\NabuData\csv\mouth_recordings.csv")


# Set the first 3 columns for our CSV
columns = ["label", "frame", "timestamp_ms"]

# Go through all 40 mouth landmarks
for index in ALL_LIP_INDICES:

    # Add X, Y, and Z columns for each landmark
    columns.extend([
        f"lm{index}_x",
        f"lm{index}_y",
        f"lm{index}_z",
    ])

# Add recording ID so we can identify different recordings
columns.append("recording_id")


# Make output directory if it doesn't exist
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

# Find all the raw webcam recordings saved as NPZ files
files = sorted(RECORDINGS_DIR.glob("*.npz"))


# Rebuild the CSV each time so we don't get duplicate rows
with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as file:

    # Make our CSV writer
    writer = csv.writer(file)

    # Write the column headings first
    writer.writerow(columns)

    # Go through each saved recording
    for recording in files:

        # Open the recording and get its saved data
        with np.load(recording, allow_pickle=False) as data:

            # Get the mouth landmarks
            landmarks = data["landmarks"]

            # Get the timestamps
            timestamps = data["timestamps_ms"]

            # Get the word or sentence label
            label = str(data["label"].item())

        # Check that the recording has 40 landmarks with 3 coordinates each
        if landmarks.ndim != 3 or landmarks.shape[1:] != (40, 3):
            raise ValueError(f"Invalid landmarks: {recording}")

        # Make sure every recorded frame has a timestamp
        if len(landmarks) != len(timestamps):
            raise ValueError(f"Timestamp mismatch: {recording}")

        # Go through each frame in this recording
        for frame_number, points in enumerate(landmarks):

            # Start a new CSV row with the label, frame, and timestamp
            row = [
                label,
                frame_number,
                int(timestamps[frame_number]),
            ]

            # Convert our 40 XYZ landmarks into 120 separate values
            row.extend(points.flatten().tolist())

            # Save the recording name so we know which file it came from
            row.append(recording.stem)

            # Write the completed row into our CSV
            writer.writerow(row)


# Display how many recordings were exported and where the CSV was saved
print(f"Exported {len(files)} recordings to {OUTPUT_FILE}")
