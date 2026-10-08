import cv2
import numpy as np
import pickle
import time
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# 1. Load your trained scikit-learn model brain
with open('asl_static_model.p', 'rb') as f:
    model = pickle.load(f)

alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")

# 2. Configure the modern MediaPipe Hand Landmarker for LIVE_STREAM mode
base_options = python.BaseOptions(model_asset_path='hand_landmarker.task')

# Storage variables to pass data safely across the asynchronous frame threads
latest_prediction = "None"
latest_landmarks = None

# This callback function executes every single time MediaPipe finishes tracking a frame
def render_callback(result: vision.HandLandmarkerResult, output_image: mp.Image, timestamp_ms: int):
    global latest_prediction, latest_landmarks
    
    # FIX: Check if the list contains data and extract the first hand list [0]
    if result.hand_landmarks and len(result.hand_landmarks) > 0:
        hand_landmarks = result.hand_landmarks[0]
        latest_landmarks = hand_landmarks
        
        # Calculate bounding shifts for spatial normalization
        x_coords = [lm.x for lm in hand_landmarks]
        y_coords = [lm.y for lm in hand_landmarks]
        min_x, min_y = min(x_coords), min(y_coords)
        
        live_features = []
        for lm in hand_landmarks:
            live_features.append(lm.x - min_x)
            live_features.append(lm.y - min_y)
            
        # Run prediction matrix matching against your classifier model
        prediction = model.predict([np.array(live_features)])
        latest_prediction = alphabet[int(prediction)]
    else:
        latest_landmarks = None
        latest_prediction = "None"

options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.LIVE_STREAM,
    result_callback=render_callback,
    num_hands=1,
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
        
        # Convert OpenCV format (BGR) to MediaPipe format (RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        # Generate an absolute increasing millisecond timestamp required for live streams
        frame_timestamp_ms = int(time.time() * 1000)
        
        # Send frame into the background tracker asynchronously
        detector.detect_async(mp_image, frame_timestamp_ms)
        
        # Draw skeletal coordinate nodes manually if landmarks are active
        if latest_landmarks:
            for lm in latest_landmarks:
                cx, cy = int(lm.x * w), int(lm.y * h)
                cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1)
                
            # Render guessed letter layout box text onto the screen environment
            if latest_prediction != "None":
                cv2.putText(frame, f"Sign: {latest_prediction}", (30, 60), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 255, 0), 3, cv2.LINE_AA)
            else:
                cv2.putText(frame, "Calculating Sign...", (30, 60), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 255), 2, cv2.LINE_AA)
        else:
            cv2.putText(frame, "No Hand Detected", (30, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 2, cv2.LINE_AA)
                            
        cv2.imshow('ASL Static Alpha Recognition', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()
