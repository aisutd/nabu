"""Shared speaking service used by lessons, read-aloud tasks, and free practice."""
import logging
import shutil
import subprocess
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL

from fastapi import APIRouter, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .learner_feedback import learner_feedback
from .transcribe import check
from .video_input import prepare_wav

# Small server-owned exercise registry. Replace with the lesson database when available.
EXERCISES = {
    f"say-{word}": {"expected_text": word, "capture": "video", "reference_word": word}
    for word in ("bad", "back", "bail", "june", "kent")
}


class SpeakingRequest(BaseModel):
    recording_id: UUID
    exercise_id: str | None = Field(default=None, max_length=100)
    expected_text: str | None = Field(default=None, max_length=500)


def resolve_task(body):
    if body.exercise_id is not None:
        exercise = EXERCISES.get(body.exercise_id)
        if exercise is None:
            raise HTTPException(404, "Speaking exercise not found")
        # The server's answer wins over any expected_text supplied by the browser.
        return exercise["expected_text"], exercise.get("reference_word")
    expected = (body.expected_text or "").strip() or None
    return expected, expected.lower() if expected and len(expected.split()) == 1 else None


def create_speaking_router(data_dir, reference_dir, reference_files, upload_video, compare_recordings, processing):
    router = APIRouter(prefix="/speaking", tags=["Speaking"])

    def source_path(recording_id):
        for suffix in (".mp4", ".wav"):
            source = data_dir / f"{recording_id}{suffix}"
            if source.is_file():
                return source
        raise HTTPException(404, "Recording not found")

    @router.get("/exercises/{exercise_id}")
    def exercise_info(exercise_id: str):
        exercise = EXERCISES.get(exercise_id)
        if exercise is None:
            raise HTTPException(404, "Speaking exercise not found")
        return {"id": exercise_id, **exercise}

    @router.post("/recordings", status_code=201)
    def upload_recording(media: UploadFile, capture: Literal["audio", "video"] = Form(...)):
        if capture == "video":
            result = upload_video(media)
            return {"id": result["id"], "media_url": result["video_url"], "capture": capture}
        suffix = Path(media.filename or "").suffix.lower()
        if suffix not in {".webm", ".m4a", ".mp4", ".wav", ".ogg", ".mp3"}:
            media.file.close()
            raise HTTPException(415, "Upload a WebM, M4A, MP4, WAV, Ogg, or MP3 audio recording")
        data_dir.mkdir(parents=True, exist_ok=True)
        recording_id = uuid4()
        source = data_dir / f"{recording_id}.upload{suffix}"
        destination = data_dir / f"{recording_id}.wav"
        try:
            with source.open("wb") as output:
                shutil.copyfileobj(media.file, output)
            subprocess.run(
                ["ffmpeg", "-nostdin", "-y", "-i", str(source), "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(destination)],
                check=True, capture_output=True,
            )
        except subprocess.CalledProcessError as error:
            destination.unlink(missing_ok=True)
            raise HTTPException(422, "Could not decode this audio recording") from error
        except Exception:
            destination.unlink(missing_ok=True)
            raise
        finally:
            source.unlink(missing_ok=True)
            media.file.close()
        return {"id": str(recording_id), "media_url": f"/media/{destination.name}", "capture": capture}

    @router.post("/review")
    def review(body: SpeakingRequest):
        expected, reference_word = resolve_task(body)
        source = source_path(body.recording_id)
        speech = None
        comparison = None
        errors = {}
        checks = {"speech": {"status": "failed"}, "mouth": {"status": "skipped"}, "neural": {"status": "skipped"}}
        try:
            with processing:
                wav = source if source.suffix == ".wav" else Path(prepare_wav(str(source), str(source.with_suffix('.speech.wav'))))
                heard, match = check(wav, expected or "")
            speech = {"heard": heard, "expected": expected, "match": match if expected else None}
            checks["speech"] = {"status": "complete"}
        except Exception:
            logging.getLogger(__name__).exception("Speaking transcription failed")
            errors["speech"] = "Could not transcribe this attempt. Check the microphone or try another recording."

        filename = reference_files.get(reference_word)
        reference = reference_dir / filename if filename else None
        if source.suffix != ".mp4":
            reason = "Audio-only activity; mouth analysis needs video."
        elif not expected:
            reason = "Free speech has no expected word or reference."
        elif len(expected.split()) != 1:
            reason = "The current mouth model supports isolated words, not sentences."
        elif reference is None or not reference.is_file():
            reason = "No installed reference for this word. Speech analysis is still available."
        else:
            reason = None
        if reason:
            checks["mouth"]["reason"] = reason
            checks["neural"]["reason"] = reason
        else:
            try:
                # Reuse a server-owned reference without requiring the learner to upload it.
                reference_id = uuid5(NAMESPACE_URL, f"nabu:{reference.resolve()}:{reference.stat().st_mtime_ns}")
                destination = data_dir / f"{reference_id}.mp4"
                # Copy under the same processing lock; comparison acquires it separately.
                with processing:
                    if not destination.exists():
                        shutil.copyfile(reference, destination)
                comparison = compare_recordings(body.recording_id, reference_id, expected)
                checks["mouth"] = {"status": "complete"}
                neural = comparison.get("neural") or {}
                checks["neural"] = {"status": "complete" if neural.get("available") else "skipped"}
                if not neural.get("available"):
                    checks["neural"]["reason"] = neural.get("reason", "Model result not available")
            except Exception:
                logging.getLogger(__name__).exception("Speaking mouth analysis failed")
                checks["mouth"] = {"status": "failed"}
                checks["neural"] = {"status": "skipped", "reason": "Mouth analysis could not complete."}
                errors["mouth"] = "Could not analyze mouth movement. Keep your mouth visible and retry."

        feedback = learner_feedback(speech, comparison)
        if speech is not None and expected is None:
            feedback["title"] = "Here’s what we heard" if speech["heard"] else "No speech detected"
            feedback["next_action"] = "Replay your recording or try another response. This activity has no fixed correct answer."
        elif speech is not None and comparison is None and speech["match"]:
            feedback["next_action"] = "Replay your recording or continue with the exercise."
        if expected and len(expected.split()) > 1 and speech is not None:
            if speech["match"]:
                feedback["title"] = "You said the expected phrase."
            else:
                feedback["next_action"] = "Replay your recording, then repeat the expected phrase clearly. Recognition can make mistakes."
        if speech is None and comparison is None and source.suffix == ".wav":
            feedback["next_action"] = "Check the microphone and try another recording."
        return {"recording_id": str(body.recording_id), "exercise_id": body.exercise_id, "expected_text": expected, "transcription": speech,
                "comparison": comparison, "feedback": feedback, "checks": checks, "errors": errors}

    return router
