# For testing input videos not live ones
import os
import cv2
import numpy as np

from pronounciation.detector import MouthTracker

def process_dataset_clip(video_path: str, output_dir: str = "pronounciation/crops"):
  if not os.path.exists(video_path):
    raise FileNotFoundError(f"video not found at {video_path}")

  # Create the destination for extracted mouth images.
  os.makedirs(output_dir, exist_ok=True)
  tracker = MouthTracker()
  cap = cv2.VideoCapture(video_path)

  # Use video timing for the metric log.
  fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
  frame_idx = 0
  metric_log = []

  print(f"Processing video: {video_path} at {fps:.2f} FPS")

  while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
      break

    # Convert the source frame index to milliseconds.
    timestamp_ms = int((frame_idx / fps) * 1000)
    crop, metrics, pts = tracker.process_frame(frame)

    if crop is not None and crop.size > 0:
      # Match each saved crop to its source frame.
      crop_filename = os.path.join(output_dir, f"frame_{frame_idx:04d}.jpg")
      cv2.imwrite(crop_filename, crop)

      # Keep measurements and full-image lip points together.
      metric_entry = {
        "frame": frame_idx,
        "timestamp_ms": timestamp_ms,
        "aperture_px": metrics["aperture_px"],
        "stretch_px": metrics["stretch_px"],
        "aspect_ratio": metrics["aspect_ratio"],
        "landmarks": pts.tolist()
      }

      metric_log.append(metric_entry)
      
    # Count every source frame, including frames without a crop.
    frame_idx += 1

  cap.release()
  tracker.close()

  print(f"Finished processing {frame_idx} frames.")
  print(f"Saved mouth crops to: {output_dir}")

  # Summarize frames with detected mouths.
  if metric_log:
    ratios = [m["aspect_ratio"] for m in metric_log]
    apertures = [m["aperture_px"] for m in metric_log]

    print(f"Average Aperture: {np.mean(apertures):.2f}px (Max: {np.max(apertures):.2f}px)")
    print(f"Average Lip Aspect Ratio: {np.mean(ratios):.2f} (Max: {np.max(ratios):.2f})")

  # Return the per-frame records for further analysis.
  return metric_log


if __name__ == "__main__":
  test_video_path = "pronounciation/test_videos/sample_clip.mp4"
  if os.path.exists(test_video_path):
    process_dataset_clip(test_video_path)
  else:
    print(f"Please place a test video at {test_video_path}")
