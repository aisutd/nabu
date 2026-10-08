import os
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Point this to where your SignAlphaSet dataset folder sits
DATA_DIR = './SignAlphaSet/dataset'  
OUTPUT_FILE = 'asl_data.npz'

# Initialize MediaPipe Landmarker in IMAGE mode
base_options = python.BaseOptions(model_asset_path='hand_landmarker.task')
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.IMAGE,
    num_hands=1,
    min_hand_detection_confidence=0.2 
)

features = []
labels = []

# Map directory text folders (A-Z) into integer values (0-25)
label_map = {letter: idx for idx, letter in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ")}

with vision.HandLandmarker.create_from_options(options) as detector:
    for folder in sorted(os.listdir(DATA_DIR)):
        folder_path = os.path.join(DATA_DIR, folder)
        if not os.path.isdir(folder_path) or folder not in label_map:
            continue
            
        print(f"Processing folder: {folder}...")
        current_label = label_map[folder]
        
        for img_name in os.listdir(folder_path):
            img_path = os.path.join(folder_path, img_name)
            
            bgr_image = cv2.imread(img_path)
            if bgr_image is None:
                continue
                
            rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
            
            # Execute feature detection
            detection_result = detector.detect(mp_image)
            
            if detection_result.hand_landmarks:
                # Grab the first detected hand array
                hand_landmarks = detection_result.hand_landmarks[0]
                
                # Shift coordinates relative to the bounding box minimum anchor points
                x_coords = [lm.x for lm in hand_landmarks]
                y_coords = [lm.y for lm in hand_landmarks]
                min_x, min_y = min(x_coords), min(y_coords)
                
                normalized_landmarks = []
                for lm in hand_landmarks:
                    normalized_landmarks.append(lm.x - min_x)
                    normalized_landmarks.append(lm.y - min_y)
                    
                features.append(normalized_landmarks)
                labels.append(current_label)

# Save matrices locally
np.savez(OUTPUT_FILE, features=np.array(features), labels=np.array(labels))
print(f"Success! Extracted {len(features)} frames and saved to {OUTPUT_FILE}.")
