import wave
from threading import Lock

import numpy as np
from faster_whisper import WhisperModel
from huggingface_hub.errors import LocalEntryNotFoundError


class ShortClipWhisperModel(WhisperModel):
  def encode(self, features):
    # faster-whisper zero-pads every segment to 30 seconds. CTranslate2 can
    # encode shorter inputs, so keep the speech and some trailing context.
    if features.ndim == 2:
      active = np.flatnonzero(np.any(features != 0, axis=0))
      if active.size:
        frames = max(300, int(active[-1]) + 51)
        if frames <= 600:
          features = np.ascontiguousarray(features[:, :frames + frames % 2])
    return super().encode(features)


_model = None
_model_lock = Lock()

def _get_model(local_only=False):
  global _model
  with _model_lock:
    if _model is None:
      options = {"device": "cpu", "compute_type": "int8"}
      try:
        _model = ShortClipWhisperModel("small.en", local_files_only=True, **options)
      except LocalEntryNotFoundError:
        if local_only:
          raise
        _model = ShortClipWhisperModel("small.en", **options)
    return _model

def warm_speech_model():
  # Preload only installed weights. A review can download missing weights.
  try:
    _get_model(local_only=True)
  except (OSError, RuntimeError, LocalEntryNotFoundError):
    pass


def _load_wav(path):
  with wave.open(str(path), "rb") as w:
    # Raw samples must match the format expected by the transcription model.
    if w.getnchannels() != 1 or w.getsampwidth() != 2 or w.getframerate() != 16000:
      raise ValueError("expected a 16 kHz mono 16-bit WAV")
    raw = w.readframes(w.getnframes())
  # Convert signed 16-bit PCM samples to floating-point audio near [-1, 1].
  return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0

def _transcribe_words(audio):
  # Filter out silence and request word timing for each independent recording.
  segments, _ = _get_model().transcribe(
    audio,
    language="en",
    word_timestamps=True,
    vad_filter=True,
    condition_on_previous_text=False,
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

def transcribe(wav_path):
  return _transcribe_words(_load_wav(wav_path))


def check(wav_path, label):
  audio = _load_wav(wav_path)
  if len(audio) <= 5 * 16000:
    # The review only needs text. Decode once so uncertain audio cannot trigger
    # repeated sampling or word-by-word alignment.
    segments, _ = _get_model().transcribe(
      audio,
      language="en",
      vad_filter=True,
      without_timestamps=True,
      condition_on_previous_text=False,
      beam_size=1,
      temperature=0.0,
      max_new_tokens=32,
    )
    words = (word.lower().strip(".,!?") for segment in segments for word in segment.text.split())
  else:
    words = (word["word"] for word in _transcribe_words(audio))
  heard = " ".join(words)
  return heard, heard == label.strip().lower()
