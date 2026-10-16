import cv2
import numpy as np
import pickle
import time
import traceback  # Imported to reveal hidden background errors
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Load the existing single-hand model
with open("asl_static_model.p", "rb") as f:
    model = pickle.load(f)

alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

base_options = python.BaseOptions(
    model_asset_path="hand_landmarker.task"
)

# Store landmarks and predictions for both hands
latest_predictions = []
latest_landmarks = []

# Process each frame returned by MediaPipe
def render_callback(
    result: vision.HandLandmarkerResult,
    output_image: mp.Image,
    timestamp_ms: int
):
    global latest_predictions, latest_landmarks

    try:
        frame_predictions = []
        frame_landmarks = []

        if result.hand_landmarks:
            for hand_index, hand in enumerate(result.hand_landmarks):

                # Normalize this hand's landmarks independently
                x_coords = [lm.x for lm in hand]
                y_coords = [lm.y for lm in hand]

                min_x = min(x_coords)
                min_y = min(y_coords)

                features = []

                for lm in hand:
                    features.append(lm.x - min_x)
                    features.append(lm.y - min_y)

                # Existing model expects 42 features for ONE hand
                input_data = np.array(features).reshape(1, -1)

                prediction = model.predict(input_data)
                letter = alphabet[int(prediction[0])]

                frame_predictions.append(letter)
                frame_landmarks.append(hand)

                print(
                    f"Hand {hand_index + 1}: {letter}"
                )

        # Replace old results with the current frame's results
        latest_predictions = frame_predictions
        latest_landmarks = frame_landmarks

    except Exception:
        print("\n--- CALLBACK ERROR ---")
        traceback.print_exc()
        print("----------------------\n")


# Configure MediaPipe to detect up to two hands
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.LIVE_STREAM,
    result_callback=render_callback,
    num_hands=2,
    min_hand_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# 3. Launch hardware webcam connection layer using OpenCV
cap = cv2.VideoCapture(0)

with vision.HandLandmarker.create_from_options(options) as detector:
    print("Webcam pipeline active. Press 'q' inside the video window to close.")
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame
        )

        # Submit frame to MediaPipe
        timestamp_ms = time.monotonic_ns() 
        detector.detect_async(mp_image, timestamp_ms)

        # Draw landmarks and a separate prediction for each hand
        if latest_landmarks:
            for hand_index, hand in enumerate(latest_landmarks):

                # Draw all 21 landmarks for this hand
                for lm in hand:
                    cx = int(lm.x * w)
                    cy = int(lm.y * h)

                    cv2.circle(
                        frame,
                        (cx, cy),
                        5,
                        (0, 255, 0),
                        -1
                    )

                # Display this hand's predicted letter
                if hand_index < len(latest_predictions):
                    letter = latest_predictions[hand_index]

                    wrist = hand[0]
                    text_x = int(wrist.x * w)
                    text_y = max(35, int(wrist.y * h) - 20)

                    cv2.putText(
                        frame,
                        f"Hand {hand_index + 1}: {letter}",
                        (text_x, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.9,
                        (0, 255, 0),
                        2,
                        cv2.LINE_AA
                    )

            cv2.putText(
                frame,
                f"Hands detected: {len(latest_landmarks)}",
                (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (255, 255, 0),
                2
            )

        else:
            cv2.putText(
                frame,
                "No hands detected",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                2
            )

        cv2.imshow("NABU - Two-Hand Tracking", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

cap.release()
cv2.destroyAllWindows()