import os
import logging
import re
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path
from threading import Lock
from uuid import UUID, uuid4

import matplotlib
import numpy as np
import torch

matplotlib.use("Agg")

from fastapi import BackgroundTasks, HTTPException, UploadFile
from fastapi.responses import FileResponse
from .learner_feedback import learner_feedback
from .speaking import stage_reference

from pronounciation.training.mouth_training import MouthEncoder
from pronounciation.datasets.preprocess_recordings import normalize_landmarks, resample_sequence

from ..analysis.compare import compare, plot, feedback
from ..analysis.transcribe import check, warm_speech_model
from ..analysis.video_input import comparison_landmarks, prepare_wav, track_video

DATA = Path(__file__).resolve().parents[1] / "test_data" / "api"
PLOTS = DATA / "plots"
PLOTS.mkdir(parents=True, exist_ok=True)
processing = Lock()

MODEL_PATH = Path(os.environ.get(
    "NABU_MOUTH_CHECKPOINT",
    str(Path(__file__).resolve().parents[1] / "nabu_multivsr_overnight_b0050.pt"),
))
MODEL_SHAPE = (29, 40, 3)
MAX_WORD_SECONDS = 5.0

# Curated local demo references. Do not expose arbitrary filesystem paths.
REFERENCE_DIR = Path(__file__).resolve().parents[1] / "test_data" / "video"
REFERENCE_FILES = {word: f"{word}_browser.mp4" for word in ("bad", "back", "bail", "june")}
REFERENCE_FILES["kent"] = "Kent_browser.mp4"


def practice_library():
    return [
        {"id": word, "word": word, "has_audio": False, "video_url": f"/practice/{word}/video"}
        for word, filename in REFERENCE_FILES.items()
        if (REFERENCE_DIR / filename).is_file()
    ]


def practice_reference(word: str, background_tasks: BackgroundTasks):
    filename = REFERENCE_FILES.get(word)
    if filename is None or not (REFERENCE_DIR / filename).is_file():
        raise HTTPException(404, "Practice reference not available")
    reference = REFERENCE_DIR / filename
    background_tasks.add_task(warm_practice_reference, reference)
    return FileResponse(reference, media_type="video/mp4")


def warm_practice_reference(reference: Path):
    try:
        with processing:
            _, path = stage_reference(DATA, reference)
            reference_embedding(path, path.stat().st_mtime_ns)
    except (OSError, ValueError, RuntimeError):
        logging.getLogger(__name__).debug("Could not prepare practice reference %s", reference, exc_info=True)
        return
    warm_speech_model()


def video_path(recording_id: UUID):
    path = DATA / f"{recording_id}.mp4"
    if not path.is_file():
        raise HTTPException(404, "Recording not found")
    return path


@lru_cache(maxsize=1)
def mouth_model():
    if not MODEL_PATH.is_file():
        raise RuntimeError(f"Mouth model checkpoint not found: {MODEL_PATH}")
    try:
        checkpoint = torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
        if checkpoint.get("training_mode") != "multivsr-finetune" or tuple(checkpoint.get("input_shape", ())) != MODEL_SHAPE:
            raise ValueError("Checkpoint is not a compatible 29x40x3 MultiVSR mouth model")
        hidden = int(checkpoint.get("hidden", 64))
        embedding_dim = int(checkpoint.get("embedding_dim", 64))
        model = MouthEncoder(hidden=hidden, embedding_dim=embedding_dim)
        model.load_state_dict(checkpoint["model_state"], strict=True)
        model.eval()
        return model, {
            "checkpoint": MODEL_PATH.name,
            "architecture": "BiGRU MouthEncoder",
            "input_shape": list(MODEL_SHAPE),
            "embedding_dimension": embedding_dim,
            "training_recordings": len(checkpoint.get("train_filenames", [])),
            "validation_recordings": len(checkpoint.get("validation_filenames", [])),
            "best_held_out_contrastive_loss": checkpoint.get("best_validation_loss"),
            "objective": "same-recording contrastive representation learning",
        }
    except Exception as error:
        raise RuntimeError(f"Could not load mouth model: {error}") from error


def mouth_input(track):
    frames, positions, _, fps, count = track
    if not np.isfinite(fps) or fps <= 0 or count < 3:
        raise ValueError("Video needs at least three frames and a valid frame rate")
    if count / fps > MAX_WORD_SECONDS:
        raise ValueError("Neural comparison requires a trimmed single-word clip no longer than 5.0 seconds")

    # Use the same evenly spaced frame indices as the training input pipeline.
    sampled = np.linspace(0, count - 1, min(29, count)).round().astype(int)
    indices = np.searchsorted(positions, sampled)
    if np.any(indices == len(positions)) or np.any(positions[indices] != sampled):
        raise ValueError("No detectable mouth at one or more sampled frames")
    raw = np.asarray(frames[indices], dtype=np.float32)
    if raw.shape[1:] != (40, 3) or not np.isfinite(raw).all():
        raise ValueError("Invalid mouth landmarks")
    timestamps = sampled * 1000.0 / fps
    normalized = normalize_landmarks(raw)
    fixed = resample_sequence(normalized, timestamps, 29)
    if fixed.shape != MODEL_SHAPE or not np.isfinite(fixed).all():
        raise ValueError("Mouth preprocessing did not produce a valid (29, 40, 3) input")
    return np.ascontiguousarray(fixed, dtype=np.float32)


@lru_cache(maxsize=16)
def reference_track(path: Path, modified_ns: int):
    return track_video(str(path))


@lru_cache(maxsize=16)
def reference_embedding(path: Path, modified_ns: int):
    data = mouth_input(reference_track(path, modified_ns))
    model, _ = mouth_model()
    with torch.inference_mode():
        return model(torch.from_numpy(data[None]))


def neural_result(user_path: Path, example_path: Path, user_track=None):
    model, info = mouth_model()
    if user_track is None:
        user_track = track_video(str(user_path), max_seconds=MAX_WORD_SECONDS)
    user_data = mouth_input(user_track)
    example_embedding = reference_embedding(example_path, example_path.stat().st_mtime_ns)
    with torch.inference_mode():
        user_embedding = model(torch.from_numpy(user_data[None]))
        similarity = float(torch.sum(user_embedding * example_embedding).item())
    if not np.isfinite(similarity):
        raise ValueError("Model returned a non-finite similarity")
    return {
        "available": True,
        "checkpoint": info["checkpoint"],
        "cosine_similarity": round(max(-1.0, min(1.0, similarity)), 6),
        "embedding_dimension": info["embedding_dimension"],
        "metric": "uncalibrated_mouth_motion_embedding_similarity",
        "note": "Not a pronunciation score or percentage; clips must contain one trimmed word.",
    }


def upload_video(video: UploadFile):
    suffix = Path(video.filename or "").suffix.lower()

    if suffix not in {".mp4", ".mov", ".webm", ".m4v"}:
        video.file.close()
        raise HTTPException(415, "Upload an MP4, MOV, WebM, or M4V video")

    recording_id = uuid4()
    source = DATA / f"{recording_id}.upload{suffix}"
    destination = DATA / f"{recording_id}.mp4"

    try:
        with source.open("wb") as output:
            shutil.copyfileobj(video.file, output)

        subprocess.run(
            [
                "ffmpeg",
                "-nostdin",
                "-y",
                "-i", str(source),
                "-map", "0:v:0",
                "-map", "0:a:0?",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-movflags", "+faststart",
                str(destination),
            ],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as error:
        destination.unlink(missing_ok=True)
        raise HTTPException(422, "Could not process this video") from error
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        source.unlink(missing_ok=True)
        video.file.close()

    return {
        "id": str(recording_id),
        "video_url": f"/media/{destination.name}",
    }


def transcription(recording_id: UUID, label: str):
    source = video_path(recording_id)
    with processing:
        try:
            wav = prepare_wav(str(source), str(source.with_suffix(".wav")))
        except subprocess.CalledProcessError as error:
            raise HTTPException(422, "Could not extract audio from the video") from error
        heard, match = check(wav, label)
    return {"heard": heard, "expected": label, "match": match}


def comparison(user_id: UUID, example_id: UUID, label: str):
    filename = re.sub(r"[^a-z0-9_-]+", "_", label.strip().lower()).strip("_")
    if not filename or len(filename) > 100:
        raise HTTPException(422, "Label must produce a filename of 1–100 characters using letters or numbers")
    user_path, example_path = video_path(user_id), video_path(example_id)
    with processing:
        try:
            user_track = track_video(str(user_path), track_motion=True)
            user = comparison_landmarks(user_track)
            example = comparison_landmarks(reference_track(example_path, example_path.stat().st_mtime_ns))
            if min(len(user[0]), len(example[0])) < 4:
                raise ValueError("Each video needs at least four detected mouth frames")
            result = compare(user, example)
        except ValueError as error:
            raise HTTPException(422, str(error)) from error
        png = PLOTS / f"{filename}.png"
        png.parent.mkdir(parents=True, exist_ok=True)
        plot(result, str(png))

        # Keep the legacy comparison working even when a video isn't a trimmed word.
        if len(label.strip().split()) == 1:
            try:
                neural = neural_result(user_path, example_path, user_track)
            except (ValueError, RuntimeError) as error:
                neural = {"available": False, "reason": str(error)}
        else:
            neural = {"available": False, "reason": "Neural inference expects one isolated word"}

    return {
        "user_ms": result["user_ms"],
        "example_ms": result["ref_ms"],
        "shape_error": result["shape_err"].tolist(),
        "user_features": result["fu"].tolist(),
        "example_features": result["fr"].tolist(),
        "png_url": f"/media/{png.relative_to(DATA).as_posix()}",
        "neural": neural,
        "feedback": feedback(result),
    }


def neural_comparison(user_id: UUID, example_id: UUID, label: str):
    if len(label.strip().split()) != 1:
        raise HTTPException(422, "Neural comparison needs a single expected word")
    user_path, example_path = video_path(user_id), video_path(example_id)
    with processing:
        try:
            result = neural_result(user_path, example_path)
        except ValueError as error:
            raise HTTPException(422, str(error)) from error
        except RuntimeError as error:
            raise HTTPException(503, str(error)) from error
    return {"user_id": str(user_id), "example_id": str(example_id), "expected": label, **result}


def mouth_model_info():
    try:
        _, info = mouth_model()
    except RuntimeError as error:
        raise HTTPException(503, str(error)) from error
    return {**info, "loaded": True, "device": "cpu"}


def review_attempt(user_id: UUID, example_id: UUID, label: str):
    if len(label.strip().split()) != 1:
        raise HTTPException(422, "Learner practice requires one isolated word")
    # Validate both IDs before expensive processing; each check acquires its own lock.
    video_path(user_id)
    video_path(example_id)
    results = {"transcription": None, "comparison": None}
    errors = {}
    for name, operation in (
        ("transcription", lambda: transcription(user_id, label)),
        ("comparison", lambda: comparison(user_id, example_id, label)),
    ):
        try:
            results[name] = operation()
        except HTTPException as error:
            errors[name] = str(error.detail)
        except Exception:
            logging.getLogger(__name__).exception("Learner review %s failed", name)
            # Preserve the other check's result without exposing internal exceptions.
            errors[name] = "This check could not complete. Try another recording or inspect the server logs."
    return {**results, "errors": errors, "feedback": learner_feedback(**results)}


def __getattr__(name):
    if name == "app":
        from run_backends import app
        return app
    raise AttributeError(name)
