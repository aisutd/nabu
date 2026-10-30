from pathlib import Path
import urllib.request
import cv2
import mediapipe as mp
import numpy as np
from huggingface_hub import hf_hub_download
from .config import ALL_LIP_INDICES


# Location of our MediaPipe model
MODEL = Path(r"C:\NabuData\models\face_landmarker.task")

# Download the pretrained model if we don't have it
if not MODEL.exists():

    MODEL.parent.mkdir(parents=True, exist_ok=True)

    urllib.request.urlretrieve(
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        MODEL
    )


# Get our first Hugging Face video
video_path = hf_hub_download(
    repo_id="diddmstjr/confusable-100-lipreading",
    filename="001_June/video.mp4",
    repo_type="dataset"
)

# Open the original video, not our resized grayscale version
video = cv2.VideoCapture(str(video_path))

if not video.isOpened():
    raise RuntimeError("Could not open video")

# Get count of all frames throughout the recording
total = int(video.get(cv2.CAP_PROP_FRAME_COUNT))

# Test landmark detection on every frame
positions = list(range(total))

# Set up MediaPipe face landmark detection
options = mp.tasks.vision.FaceLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=str(MODEL)),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_faces=1
)

found = 0

# Test our mouth-only video with the pretrained model
try:
    with mp.tasks.vision.FaceLandmarker.create_from_options(options) as detector:

        for position in positions:

            # Read the selected video frame
            video.set(cv2.CAP_PROP_POS_FRAMES, position)
            success, frame = video.read()

            if not success:
                print(f"Frame {position}: Could not read")
                continue

            # Convert frame into a MediaPipe image
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            # Try detecting facial landmarks
            result = detector.detect(image)

            if not result.face_landmarks:
                print(f"Frame {position}: No face detected")
                continue

            # Get the same mouth points our webcam uses
            face = result.face_landmarks[0]

            mouth = np.array([
                [face[i].x, face[i].y, face[i].z]
                for i in ALL_LIP_INDICES
            ], dtype=np.float32)

            found += 1

            print(f"Frame {position}: Mouth landmarks {mouth.shape}")

finally:
    video.release()

print(f"\nSuccessful detections: {found}/{len(positions)}")
