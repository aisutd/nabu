import re
import shutil
import subprocess
from pathlib import Path
from threading import Lock
from uuid import UUID, uuid4

import matplotlib

matplotlib.use("Agg")

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

from .compare import compare, plot
from .detector import MouthTracker
from .transcribe import check
from .video_input import landmarks_from_video, prepare_wav

app = FastAPI(title="Nabu Pronunciation")
DATA = Path("pronounciation/test_data/api")
PLOTS = DATA / "plots"
PLOTS.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(DATA)), name="media")
processing = Lock()  


def video_path(recording_id: UUID):
    path = DATA / f"{recording_id}.mp4"
    if not path.is_file():
        raise HTTPException(404, "Recording not found")
    return path

@app.post("/recordings", status_code=201)
def upload_video(video: UploadFile):
    if Path(video.filename or "").suffix.lower() != ".mp4":
        raise HTTPException(415, "Upload an MP4 video")
    recording_id = uuid4()
    path = DATA / f"{recording_id}.mp4"
    try:
        with path.open("wb") as output:
            shutil.copyfileobj(video.file, output)
    except Exception:
        path.unlink(missing_ok=True)
        raise
    finally:
        video.file.close()
    return {"id": str(recording_id), "video_url": f"/media/{path.name}"}


@app.post("/recordings/{recording_id}/transcription")
def transcription(recording_id: UUID, label: str):
    source = video_path(recording_id)
    with processing:
        try:
            wav = prepare_wav(str(source), str(source.with_suffix(".wav")))
        except subprocess.CalledProcessError as error:
            raise HTTPException(422, "Could not extract audio from the video") from error
        heard, match = check(wav, label)
    return {"heard": heard, "expected": label, "match": match}


@app.post("/comparisons")
def comparison(user_id: UUID, example_id: UUID, label: str):
    filename = re.sub(r"[^a-z0-9_-]+", "_", label.strip().lower()).strip("_")
    if not filename or len(filename) > 100:
        raise HTTPException(422, "Label must produce a filename of 1–100 characters using letters or numbers")
    user_path, example_path = video_path(user_id), video_path(example_id)
    with processing:
        tracker = MouthTracker()
        try:
            user = landmarks_from_video(str(user_path), tracker)
            example = landmarks_from_video(str(example_path), tracker)
            if min(len(user[0]), len(example[0])) < 4:
                raise ValueError("Each video needs at least four detected mouth frames")
            result = compare(user, example)
        except ValueError as error:
            raise HTTPException(422, str(error)) from error
        finally:
            tracker.close()
        png = PLOTS / f"{filename}.png"
        plot(result, str(png))
    return {
        "user_ms": result["user_ms"],
        "example_ms": result["ref_ms"],
        "shape_error": result["shape_err"].tolist(),
        "user_features": result["fu"].tolist(),
        "example_features": result["fr"].tolist(),
        "png_url": f"/media/{png.relative_to(DATA).as_posix()}",
    }
