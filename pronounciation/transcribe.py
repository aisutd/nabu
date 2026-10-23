import wave
import numpy as np  
from faster_whisper import WhisperModel

_model = None

def _get_model():
  global _model
  # Load once on first use; reuse the model for later recordings.
  if _model is None:
        _model = WhisperModel("small.en", device="cpu", compute_type="int8")  
  return _model

def _load_wav(path):  
  with wave.open(str(path), "rb") as w: 
    # Raw samples must match the format expected by the transcription model.
    if w.getnchannels() != 1 or w.getsampwidth() != 2 or w.getframerate() != 16000: 
      raise ValueError("expected a 16 kHz mono 16-bit WAV")  
    raw = w.readframes(w.getnframes())  
  # Convert signed 16-bit PCM samples to floating-point audio near [-1, 1].
  return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0 

def transcribe(wav_path):
  audio = _load_wav(wav_path)  
  # Filter out silence and request word timing for each independent recording.
  segments, _ = _get_model().transcribe(
    audio, 
    language="en",
    word_timestamps=True,
    vad_filter=True,
    condition_on_previous_text=False
  )
  # Flatten segment words, normalize their text, and convert seconds to milliseconds.
  words = []
  for seg in segments:
    for w in seg.words:
      words.append({
        "word": w.word.strip().lower().strip(".,!?"),
        "start_ms": int(w.start * 1000),
        "end_ms": int(w.end * 1000),
        "prob": round(w.probability, 2),
      })
  return words

def check(wav_path, label):
  words = transcribe(wav_path)
  heard = " ".join(w["word"] for w in words)
  # Compare the complete phrase with the typed label after trimming and lowercasing it.
  return heard, heard == label.strip().lower()