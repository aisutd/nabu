import numpy as np


# MediaPipe lip contour indices.
LIP_OUTER_INDICES = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409,
  291, 375, 321, 405, 314, 17, 84, 181, 91, 146
]

# Inner contour follows the mouth opening.
LIP_INNER_INDICES = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415,
  308, 324, 318, 402, 317, 14, 87, 178, 88, 95
]

# Combine both contours for cropping.
ALL_LIP_INDICES = np.array(LIP_OUTER_INDICES + LIP_INNER_INDICES, dtype=np.int32)

# Anchors for opening and width.
UPPER_INNER_LIP = 13
LOWER_INNER_LIP = 14
CORNER_LEFT_LIP = 61
CORNER_RIGHT_LIP = 291

# Mouth margin in image pixels.
DEFAULT_PADDING = 25
DEFAULT_MODEL_PATH = "pronounciation/models/face_landmarker.task"
DEFAULT_DETECTOR_PATH = "pronounciation/models/blaze_face_full_range.tflite"
