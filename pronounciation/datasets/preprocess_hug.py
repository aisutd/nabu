import argparse
from pathlib import Path
import cv2
import numpy as np
import pandas as pd
from huggingface_hub import hf_hub_download


# Hugging Face dataset location
REPO_ID = "diddmstjr/confusable-100-lipreading"

# Location where processed videos will be saved
OUTPUT_DIR = Path(r"C:\NabuData\processed_hf_video")

# Size of our processed mouth images
IMAGE_SIZE = 96


# RESIZE MOUTH FRAME
def resize_frame(frame, size):

    # Convert the video frame to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Get original height and width
    height, width = gray.shape

    # Resize without stretching the mouth
    scale = min(size / width, size / height)

    new_width = max(1, round(width * scale))
    new_height = max(1, round(height * scale))

    resized = cv2.resize(
        gray,
        (new_width, new_height),
        interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR
    )

    # Add empty space around the image if needed
    result = np.zeros((size, size), dtype=np.uint8)

    x = (size - new_width) // 2
    y = (size - new_height) // 2

    result[y:y + new_height, x:x + new_width] = resized

    return result


# PROCESS HUGGING FACE RECORDING
def preprocess_video(row, output_dir, size):

    # Get the word and its recording folder
    label = str(row["text"])
    folder = str(row["source_folder"])

    # Download this recording from Hugging Face
    video_path = hf_hub_download(
        repo_id=REPO_ID,
        filename=f"{folder}/video.mp4",
        repo_type="dataset"
    )

    # Open the video
    video = cv2.VideoCapture(str(video_path))

    if not video.isOpened():
        raise ValueError(f"Could not open video: {folder}")

    # Get the video frame rate
    fps = video.get(cv2.CAP_PROP_FPS)

    if fps <= 0 or not np.isfinite(fps):
        video.release()
        raise ValueError(f"Invalid video FPS: {folder}")

    frames = []

    # Read every frame from the video
    try:
        while True:

            # Read the next video frame
            success, frame = video.read()

            if not success:
                break

            # Resize the mouth frame
            processed = resize_frame(frame, size)

            # Save the frame in our list
            frames.append(processed)

    finally:
        video.release()

    # Make sure we actually found video frames
    if not frames:
        raise ValueError(f"No frames found: {folder}")

    # Convert frames into a NumPy array
    frames = np.stack(frames)

    # Estimate timestamps using the video FPS
    timestamps = np.rint(
        np.arange(len(frames)) * 1000.0 / fps
    ).astype(np.int64)

    # Create our output folder
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create a filename for this word recording
    target = output_dir / f"{folder}_processed.npz"

    # Save the video frames and recording information
    np.savez_compressed(
        target,
        frames=frames,
        timestamps_ms=timestamps,
        label=label,
        fps=np.float32(fps),
        original_frame_count=np.int32(len(frames)),
        source_folder=folder,
    )

    # Display the processed recording
    print(f"Saved: {target.name}")
    print(f"Word: {label}")
    print(f"Frames: {frames.shape}")
    print(f"FPS: {fps:.2f}")

    return target


# MAIN
def main():

    # Set up command line options
    parser = argparse.ArgumentParser()

    # Choose how many recordings to process
    parser.add_argument("--limit", type=int, default=1)

    # Choose where to save processed files
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)

    # Choose the processed image size
    parser.add_argument("--size", type=int, default=IMAGE_SIZE)

    args = parser.parse_args()

    if args.limit < 0:
        parser.error("--limit must be 0 or greater")

    if args.size < 1:
        parser.error("--size must be at least 1")

    # Read our Hugging Face JSON metadata
    df = pd.read_json(
        f"hf://datasets/{REPO_ID}/merged_metadata.json"
    )

    # Sort the recordings by their original index
    df = df.sort_values("index")

    # A limit of 0 means process every recording
    if args.limit > 0:
        df = df.head(args.limit)

    # Process each recording separately
    for _, row in df.iterrows():
        preprocess_video(row, args.output_dir, args.size)

    print("\nHugging Face preprocessing finished.")
    print(f"Processed recordings: {len(df)}")


if __name__ == "__main__":
    main()
