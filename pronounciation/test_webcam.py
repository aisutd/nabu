# For testing live input from the webcam
from pronounciation.transcribe import check
from pathlib import Path
import time
import cv2

from pronounciation.detector import MouthTracker
from pronounciation.recorder import save_recording
from pronounciation.audio_record import AudioRecorder
from pronounciation.trim import trim_idle
from pronounciation.video_record import VideoRecorder, add_audio

# From Krish's recommendation of 30 frame target
MIN_FRAMES = 30

def main():
  tracker = MouthTracker()

  audio = AudioRecorder(sample_rate=16000)
  video = VideoRecorder() 
  # Open the default camera.
  cap = cv2.VideoCapture(0)
  cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
  cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

  recording = False
  record_key = None
  frames = []
  timestamps_ms = []
  skipped = 0
  start_time = 0.0

  print("=====================================")
  print("Pronunciation mouth tracker active")
  print("Press any key (except 'q') to start recording. Only the same key can stop the recording.")
  print("Press 'q' in the cv window to quit")
  print("=====================================")

  while cap.isOpened():
    ret, frame = cap.read()

    if not ret:
      print("Could not capture from cap")
      break

    crop, metrics, pts = tracker.process_frame(frame)
    found = crop is not None and crop.size > 0

    # Save detected lip landmarks with time elapsed since recording began.
    if recording:
      video.add(frame)
      if found:
        frames.append(metrics["landmarks"])
        timestamps_ms.append(int((time.time() - start_time) * 1000))
      else:
        skipped += 1

    # Draw mouth data only when a valid crop is available.
    if found:
      cv2.imshow("Mouth Crop (ROI)", crop)

      # Show the measurements on the camera image.
      hud = (
        f"Aperture: {metrics['aperture_px']:.1f}px | "
        f"Stretch: {metrics['stretch_px']:.1f}px | "
        f"Aspect Ratio: {metrics['aspect_ratio']:.2f}"
      )
      cv2.putText(frame, hud, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

      # Mark the lip points and mouth bounds.
      for pt in pts:
        cv2.circle(frame, tuple(pt), 1, (0, 0, 255), -1)

      x1, y1, x2, y2, = metrics["bbox"]
      cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)

    if recording:
      cv2.putText(frame, f"REC  frames: {len(frames)}  (press '{chr(record_key)}' to stop)",
                  (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    else:
      cv2.putText(frame, "Press andy key to record, or q to quit", 
                  (39, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

    cv2.imshow("Webcam Feed", frame)

    key = cv2.waitKey(1) & 0xFF

    # waitKey returns -1 when idle; masking converts it to 255.
    if key == 255:
      pass

    elif key == ord("q"):
      if recording:
        # Stop and discard audio and video
        audio.discard()
        video.discard()
        print("Quit while recording. Recording not saved.")
      break

    # Remember the start key so only that key can stop this recording.
    elif not recording:

      # start recording audio and video
      audio.start()
      video.start() 

      recording = True
      record_key = key
      frames, timestamps_ms, skipped = [], [], 0
      start_time = time.time()
      print(f"Recording started with '{chr(record_key)}' press '{chr(record_key)}' again to stop")

    elif key == record_key:

      # stop audio recording
      audio.stop()
      recording = False
      record_key = None
      print(f"Recording stopped: {len(frames)} frames, {skipped} skipped.")

      # Require at least 30 valid frames before saving recording
      if len(frames) < MIN_FRAMES:
        audio.discard()
        video.discard()
        print(f"Only {len(frames)} frames captured. Need at least {MIN_FRAMES}. Recording not saved.")
      else:
        # Attach the spoken label; an empty label discards the capture.
        before = len(frames) 
        frames, timestamps_ms = trim_idle(frames, timestamps_ms) 
        print(f"Trimmed idle frames: {before} -> {len(frames)}")  
        label = input("Enter said word/letter/sentence. leave empty to discard:").strip()

        if label:
          # Keep the original landmark-saving function unchanged.
          path, recording_id = save_recording(label, frames, timestamps_ms, skipped)
          print(f"Saved recording {recording_id} to {path}")

          # Save microphone audio using the SAME recording filename.
          wav_path = Path("pronounciation/test_data/audio") / f"recording_{recording_id}.wav"
          audio.save(wav_path)
          print(f"Saved audio to {wav_path}")
          heard, match = check(wav_path, label) 
          print(f"Whisper heard: '{heard}'" + ("" if match else f"  (you typed '{label}', check this one)"))

          # Clear the microphone buffer for the next recording.
          audio.discard()
          video.discard()

        else:
          # Discard audio when the user rejects the word recording.
          audio.discard()
          video.discard()
          print("Recording discarded.")

      again = input("Record another word? Press Enter to continue, or type q and Enter to quit: ").strip().lower()
      if again == "q":
        break

  # Release capture, models, and display windows.
  audio.discard()
  video.discard()
  cap.release()
  tracker.close()
  cv2.destroyAllWindows()

if __name__ == "__main__":
  main()
