import argparse
from pathlib import Path
import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
from huggingface_hub import hf_hub_download
from .config import ALL_LIP_INDICES
from .preprocess_recordings import normalize_landmarks, resample_sequence, MIN_FRAMES, WORD_FRAMES

# Hugging Face dataset
REPO_ID = "diddmstjr/confusable-100-lipreading"

# Location of our MediaPipe model
MODEL = Path(r"C:\NabuData\models\face_landmarker.task")

# Location for the processed Hugging Face landmarks
OUTPUT_DIR = Path(r"C:\NabuData\processed_hf_landmarks")

# PROCESS ONE VIDEO
def process_video(row, detector, output_dir, preview=False):

    # Get the label and recording folder
    label = str(row["text"]).strip()
    folder = str(row["source_folder"])

    # Download the original video
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
        raise ValueError(f"Invalid FPS: {folder}")

    raw_landmarks = []
    timestamps = []
    preview_image = None

    # Find the middle frame for our preview
    middle = int(video.get(cv2.CAP_PROP_FRAME_COUNT)) // 2

    # Read every frame
    try:
        frame_number = 0

        while True:

            success, frame = video.read()

            if not success:
                break

            # Convert the frame for MediaPipe
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=np.ascontiguousarray(rgb)
            )

            # Detect the face landmarks
            result = detector.detect(image)

            # Stop if a frame has no detected face
            if not result.face_landmarks:
                raise ValueError(f"No landmarks in {folder}, frame {frame_number}")

            face = result.face_landmarks[0]

            # Get the same 40 lip landmarks as our webcam
            mouth = np.array([
                [face[i].x, face[i].y, face[i].z]
                for i in ALL_LIP_INDICES
            ], dtype=np.float32)

            # Store the landmarks and estimated frame timestamp
            raw_landmarks.append(mouth)
            timestamps.append(round(frame_number * 1000 / fps))

            # Save a preview showing where the landmarks were detected
            if preview and frame_number == middle:

                preview_image = frame.copy()
                height, width = frame.shape[:2]

                for point in mouth:
                    x = round(float(point[0]) * width)
                    y = round(float(point[1]) * height)

                    cv2.circle(preview_image, (x, y), 2, (0, 0, 255), -1)

            frame_number += 1

    finally:
        video.release()

    # Make sure the recording has enough frames
    if len(raw_landmarks) < MIN_FRAMES:
        raise ValueError(f"Not enough frames: {folder}")

    # Convert our saved values into arrays
    raw = np.stack(raw_landmarks)
    times = np.array(timestamps, dtype=np.int64)

    # Use the SAME normalization as our webcam recordings
    normalized = normalize_landmarks(raw)

    # Store the processed recording
    payload = {
        "landmarks_normalized": normalized,
        "landmarks_raw": raw,
        "timestamps_ms": times,
        "label": label,
        "skipped": 0,
        "original_frame_count": len(raw),
        "fps": np.float32(fps),
        "source_folder": folder,
    }

    # Create the 29-frame version for individual words
    if label and len(label.split()) == 1:
        payload["landmarks_29"] = resample_sequence(
            normalized, times, WORD_FRAMES
        )

    # Make the output folder if needed
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save the processed landmarks
    target = output_dir / f"{folder}_processed.npz"
    np.savez_compressed(target, **payload)

    # Save our preview separately
    if preview_image is not None:
        cv2.imwrite(str(output_dir / f"{folder}_preview.png"), preview_image)

    print(f"Saved: {target.name}")
    print(f"Label: {label}")
    print(f"Landmarks: {normalized.shape}")

    return target


# MAIN
def main():

    # Set up command line options
    parser = argparse.ArgumentParser()

    # Process one recording by default
    parser.add_argument("--limit", type=int, default=1)

    # Choose where to save our processed data
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)

    # Option to save an image showing the detected lip points
    parser.add_argument("--preview", action="store_true")

    args = parser.parse_args()

    if args.limit < 0:
        parser.error("--limit must be 0 or greater")

    # Make sure the MediaPipe model exists
    if not MODEL.is_file():
        parser.error(f"MediaPipe model not found: {MODEL}")

    # Read the Hugging Face metadata
    df = pd.read_json(
        f"hf://datasets/{REPO_ID}/merged_metadata.json"
    )

    df = df.sort_values("index")

    # A limit of 0 means process everything
    if args.limit > 0:
        df = df.head(args.limit)

    # Set up MediaPipe
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(MODEL)),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=1
    )

    failures = 0

    # Process the selected recordings
    with mp.tasks.vision.FaceLandmarker.create_from_options(options) as detector:

        for _, row in df.iterrows():

            try:
                process_video(row, detector, args.output_dir, args.preview)

            except (ValueError, OSError, RuntimeError) as error:
                failures += 1
                print(f"FAILED {row['source_folder']}: {error}")

    print("\nHugging Face landmark preprocessing finished.")
    print(f"Successful: {len(df) - failures}")
    print(f"Failed: {failures}")


if __name__ == "__main__":
    main()
