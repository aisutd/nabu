import time
import cv2
from pronounciation.detector import MouthTracker

def main():
  tracker = MouthTracker()
  cap = cv2.VideoCapture(0)
  cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
  cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

  print("=====================================")
  print("Nabu pronunciation mouth tracker active")
  print("Press 'q' in the cv window to quit")
  print("=====================================")

  while cap.isOpened():
    ret, frame = cap.read()

    if not ret:
      print("Could not capture from cap")
      break

    timestamp_ms = int(time.time() * 1000)
    crop, metrics, pts = tracker.process_frame(frame, timestamp_ms)

    if crop is not None and crop.size > 0:
      cv2.imshow("Mouth Crop (ROI)", crop)

      hud = (
        f"Aperture: {metrics['aperture_px']:.1f}px | "
        f"Stretch: {metrics['stretch_px']:.1f}px | "
        f"Aspect Ratio: {metrics['aspect_ratio']:.2f}"
      )
      cv2.putText(frame, hud, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

      for pt in pts:
        cv2.circle(frame, tuple(pt), 1, (0, 0, 255), -1)

      x1, y1, x2, y2, = metrics["bbox"]
      cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)

    cv2.imshow("Webcam Feed", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
      break

  cap.release()
  tracker.close()
  cv2.destroyAllWindows()

if __name__ == "__main__":
  main()