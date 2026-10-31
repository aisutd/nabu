import argparse
from pathlib import Path
import numpy as np
from .config import ALL_LIP_INDICES, UPPER_INNER_LIP, LOWER_INNER_LIP, CORNER_LEFT_LIP, CORNER_RIGHT_LIP


# Find positions of the 40 saved mouth landmarks from MediaPipe
SAVED_INDEX = {int(mp_index): position for position, mp_index in enumerate(ALL_LIP_INDICES)}

# Get mouth corner positions
LEFT = SAVED_INDEX[CORNER_LEFT_LIP]
RIGHT = SAVED_INDEX[CORNER_RIGHT_LIP]

# Get upper and lower lip positions
UPPER = SAVED_INDEX[UPPER_INNER_LIP]
LOWER = SAVED_INDEX[LOWER_INNER_LIP]


# Location of saved webcam recordings
RECORDINGS_DIR = Path(__file__).resolve().parent / "test_data" / "recordings"

# Location where processed recordings will be saved
PROCESSED_DIR = Path(r"C:\NabuData\processed_webcam")

# Minimum number of frames required for preprocessing
MIN_FRAMES = 30

# Number of frames we want for each word
WORD_FRAMES = 29


# NORMALIZE LANDMARKS
def normalize_landmarks(raw: np.ndarray) -> np.ndarray:

    """Normalize the mouth landmarks while keeping mouth movement visible.

    Center the mouth in each frame and use one mouth width for
    the entire recording so the mouth changes are not lost.
    """

    # Convert our recorded landmarks into a NumPy array
    points = np.asarray(raw, dtype=np.float32)

    # Get the expected number of mouth landmarks and coordinates
    expected_shape = (len(ALL_LIP_INDICES), 3)

    # Check if the recording has the correct landmark dimensions
    if points.ndim != 3 or tuple(points.shape[1:]) != expected_shape:
        raise ValueError(f"Expected (frames, {expected_shape[0]}, 3), got {points.shape}")

    # Check for any invalid landmark values
    if not np.isfinite(points).all():
        raise ValueError("Landmarks contain NaN or infinite coordinates")

    # Find the middle point between the left and right mouth corners
    center = (points[:, LEFT, :] + points[:, RIGHT, :]) / 2.0

    # Calculate mouth width for every frame
    widths = np.linalg.norm(points[:, RIGHT, :2] - points[:, LEFT, :2], axis=1)

    # Get one reference mouth width for the entire recording
    reference_width = float(np.median(widths))

    # Make sure the mouth width is not too small
    if reference_width <= 1e-6:
        raise ValueError("Mouth-corner width is zero or too small to normalize")

    # Center each mouth and divide the points by our reference width
    return ((points - center[:, None, :]) / reference_width).astype(np.float32)


# RESAMPLE FRAMES
def resample_sequence(points: np.ndarray, timestamps_ms: np.ndarray, target_frames: int) -> np.ndarray:

    """Convert the recording into a set number of frames using timestamps."""

    # Convert timestamps into a NumPy array
    timestamps = np.asarray(timestamps_ms, dtype=np.float64)

    # Check that every frame has a timestamp
    if len(timestamps) != len(points):
        raise ValueError("Timestamp count does not match frame count")

    # Make sure timestamps are valid and increase in order
    if not np.isfinite(timestamps).all() or np.any(np.diff(timestamps) <= 0):
        raise ValueError("Timestamps must be finite and strictly increasing")

    # Generate new timestamps to match the number of frames we want
    target_times = np.linspace(timestamps[0], timestamps[-1], target_frames)

    # Put the landmark coordinates into a simpler array for processing
    flat = points.reshape(len(points), -1)

    # Estimate new landmark positions between our original frames
    sampled = np.stack([
        np.interp(target_times, timestamps, flat[:, feature])
        for feature in range(flat.shape[1])
    ], axis=1)

    # Put the landmarks back into their original coordinate layout
    return sampled.reshape(target_frames, *points.shape[1:]).astype(np.float32)


# PREPROCESS RECORDING
def preprocess_file(source: Path, destination_dir: Path = PROCESSED_DIR) -> Path:

    # Open the saved webcam recording
    with np.load(source, allow_pickle=False) as recording:

        # Get the original mouth landmarks
        raw = recording["landmarks"]

        # Get timestamps for each recorded frame
        times = recording["timestamps_ms"]

        # Get the word or sentence label
        label = str(recording["label"]).strip()

        # Get how many frames were skipped
        skipped = int(recording["skipped"])

    # Make sure the recording has enough valid frames
    if len(raw) < MIN_FRAMES:
        raise ValueError(f"{len(raw)} frames; need at least {MIN_FRAMES} valid frames")

    # Normalize the recorded mouth landmarks
    normalized = normalize_landmarks(raw)

    # Convert timestamps into integers
    times = np.asarray(times, dtype=np.int64)

    # Make sure timestamps match the frames and increase in order
    if times.shape != (len(raw),) or np.any(np.diff(times) <= 0):
        raise ValueError("Timestamps do not match frames or are not strictly increasing")

    # Store the processed recording information
    payload = {

        # Keep all the original frames after normalization
        "landmarks_normalized": normalized,

        # Keep the original timestamps
        "timestamps_ms": times,

        # Store the label entered by the user
        "label": label,

        # Store how many frames were skipped
        "skipped": skipped,

        # Store the original number of recorded frames
        "original_frame_count": len(raw),
    }

    # Check if the label contains only one word
    is_single_word = len(label.split()) == 1 and bool(label)

    # Only create the 29-frame version for a single word
    # We do not have exact word boundaries for sentences yet
    if is_single_word:

        # Resample the normalized landmarks into 29 frames
        payload["landmarks_29"] = resample_sequence(normalized, times, WORD_FRAMES)

    # Make the output directory if it does not exist
    destination_dir.mkdir(parents=True, exist_ok=True)

    # Create a filename for our processed recording
    target = destination_dir / f"{source.stem}_processed.npz"

    # Save the normalized landmarks and recording information
    np.savez_compressed(target, **payload)

    # Display where the recording was saved
    print(f"Saved: {target}")

    # Display the recording label
    print(f"Label: {label}")

    # Display the original number of frames and landmarks
    print(f"Original: {len(raw)} frames, {normalized.shape[1]} points, 3 coordinates")

    # Display if we created a 29-frame word sequence
    print(f"29-frame isolated-word sequence: {'yes' if is_single_word else 'no (multiword prompt)'}")

    # Return the location of our processed recording
    return target


# MAIN
def main() -> None:

    # Set up command line options for preprocessing
    parser = argparse.ArgumentParser(description="Normalize Nabu webcam lip-landmark recordings")

    # Allow the user to choose a recording
    # Otherwise we use the latest saved webcam recording
    parser.add_argument("--input", type=Path, help="Input NPZ; defaults to latest webcam recording")

    # Allow the user to choose where processed files are saved
    parser.add_argument("--output-dir", type=Path, default=PROCESSED_DIR)

    # Get the options entered by the user
    args = parser.parse_args()

    # Check if the user selected a recording
    if args.input is None:

        # Find all saved webcam recordings
        recordings = list(RECORDINGS_DIR.glob("*.npz"))

        # Report an error if there are no recordings
        if not recordings:
            parser.error(f"No .npz recordings in {RECORDINGS_DIR}")

        # Choose the most recently saved recording
        source = max(recordings, key=lambda p: p.stat().st_mtime)

    else:

        # Use the recording selected by the user
        source = args.input

    # Process the selected recording
    preprocess_file(source, args.output_dir)


# Run the program when this file is executed directly
if __name__ == "__main__":
    main()
