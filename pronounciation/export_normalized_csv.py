import csv
from pathlib import Path
import numpy as np
from .config import ALL_LIP_INDICES

# Input directory containing processed webcam recordings
PROCESSED_DIR = Path(r"C:\NabuData\processed_webcam")

# Output is separate from the original raw CSV
OUTPUT_FILE = Path(r"C:\NabuData\csv\mouth_recordings_normalized.csv")

# Each isolated-word sequence has 29 frames and 40 XYZ landmarks.
WORD_FRAMES = 29
NUM_LANDMARKS = len(ALL_LIP_INDICES)

# Match the column layout used in the teammate's CSV
columns = ["label", "frame", "timestamp_ms"]

for landmark_id in ALL_LIP_INDICES:
    # Add needed columns for each landmark
    columns.extend([
        f"lm{landmark_id}_x",
        f"lm{landmark_id}_y",
        f"lm{landmark_id}_z",
    ])

# Identify separate recordings of the same word
columns.append("recording_id")

# MAIN
def main():

    # Find all normalized recordings
    recordings = sorted(PROCESSED_DIR.glob("*_processed.npz"))

    # If none found
    if not recordings:
        # Raise the error
        raise FileNotFoundError(
            f"No processed recordings found in {PROCESSED_DIR}"
        )

    # Make output directory and new parent folders if necessary
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    total_rows = 0

    # Rebuild the CSV each run to avoid duplicates
    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as file:

        # Make CSV writer
        writer = csv.writer(file)
        # Write to column headings
        writer.writerow(columns)

        for source in recordings:
            with np.load(source, allow_pickle=False) as data:

                # Normalized and resampled by preprocessing
                if "landmarks_29" not in data.files:
                    # Display reason for skipping video recording
                    print(f"Skipping {source.name}: no 29-frame sequence")
                    continue

                # Get landmarks
                landmarks = data["landmarks_29"]
                # Get timestamps
                timestamps = data["timestamps_ms"]
                # get word labels
                label = str(data["label"].item()).strip()

            # Validate that the array matches layout
            expected_shape = (WORD_FRAMES, NUM_LANDMARKS, 3)

            # Validate that landmarks matches dimensions we need
            if landmarks.shape != expected_shape:
                raise ValueError(
                    f"{source.name}: expected {expected_shape}, "
                    f"got {landmarks.shape}"
                )

            # Validate if any bad landmarks are here
            if not np.isfinite(landmarks).all():
                raise ValueError(
                    f"{source.name}: invalid landmark coordinates"
                )

            # Validate if timestamps are here
            if len(timestamps) < 2 or np.any(np.diff(timestamps) <= 0):
                raise ValueError(
                    f"{source.name}: invalid source timestamps"
                )

            # Generate timestamps now matching 29 new frames
            new_timestamps = np.linspace(
                timestamps[0],
                timestamps[-1],
                WORD_FRAMES,
            )

            # Preserve every normalized frame as a CSV row
            for frame_number in range(WORD_FRAMES):
                row = [
                    label,
                    frame_number,
                    int(round(new_timestamps[frame_number])),
                ]

                # Convert 40 XYZ points into 120 CSV columns
                row.extend(landmarks[frame_number].flatten().tolist())

                # ID for the source recording
                row.append(source.stem.removesuffix("_processed"))

                # Write to CSV writer, increment row count
                writer.writerow(row)
                total_rows += 1

            print(f"Exported {label}: {WORD_FRAMES} frames")

    print(f"\nCSV saved to: {OUTPUT_FILE}")
    print(f"Total frame rows: {total_rows}")
    print(f"Total columns: {len(columns)}")


if __name__ == "__main__":
    main()
