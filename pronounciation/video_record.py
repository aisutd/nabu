# Holds the camera frames while The user records and writes them to an mp4 when saved. It also has add_audio, which merges the wav into that mp4.
import os
import shutil
import subprocess
import time
import cv2

class VideoRecorder:
  def __init__(self, jpeg_quality=90):
    self._quality = jpeg_quality
    self._frames = []   
    self._times = []

  def start(self):
    self._frames, self._times = [], []

  def add(self, frame_bgr):
    # ok is a boolean flag returned by opencv
    ok, buf = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, self._quality])

    if ok:
      self._frames.append(buf)
      self._times.append(time.time())

  def fps(self):

    if len(self._times) < 2:
      return 30.0
    
    return (len(self._times) - 1) / (self._times[-1] - self._times[0])

  def save(self, path):

    if not self._frames:
      raise ValueError("no video frames captured")
    
    os.makedirs(os.path.dirname(str(path)), exist_ok=True)
    first = cv2.imdecode(self._frames[0], cv2.IMREAD_COLOR)
    h, w = first.shape[:2]

    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"mp4v"), self.fps(), (w, h))

    if not writer.isOpened():
      raise RuntimeError(f"could not open video writer for {path}")
    
    for buf in self._frames:
      writer.write(cv2.imdecode(buf, cv2.IMREAD_COLOR))
    writer.release()

    return path

  def discard(self):
    self._frames, self._times = [], []

def add_audio(video_path, wav_path):
  if shutil.which("ffmpeg") is None:
    raise RuntimeError("ffmpeg not found.")

  video_path = str(video_path)

  merged = os.path.splitext(video_path)[0] + "_av.mp4"

  subprocess.run(
    ["ffmpeg", "-y", "-i", video_path, "-i", str(wav_path),
     "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-shortest", merged],
    check=True, capture_output=True,
  )

  os.replace(merged, video_path)  # overwrite the silent video with the merged one
  return video_path