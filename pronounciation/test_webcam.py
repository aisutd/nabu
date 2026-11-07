# For testing live input from the webcam, with automatic Nabu neural API inference.
from pronounciation.transcribe import check
from pathlib import Path
import json
import time
import cv2
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from uuid import uuid4

from pronounciation.detector import MouthTracker
from pronounciation.recorder import save_recording
from pronounciation.audio_record import AudioRecorder
from pronounciation.trim import trim_idle
from pronounciation.video_record import VideoRecorder, add_audio

# From Krish's recommendation of 30 frame target.
MIN_FRAMES = 30

# This must match the FastAPI instance running in the other CMD window.
API_BASE = "http://127.0.0.1:8000"
REFERENCE_FILE = Path("pronounciation/test_data/webcam_neural_references.json")

# The current neural video endpoint rejects clips longer than 2.5 s.
# Leave a little margin for encoder/video timing differences.
NEURAL_MAX_SECONDS = 2.3
API_TIMEOUT_SECONDS = 60


def api_json(method, endpoint, body=None, content_type=None):
    headers = {"Accept": "application/json"}
    if content_type is not None:
        headers["Content-Type"] = content_type
    request = Request(f"{API_BASE}{endpoint}", data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=API_TIMEOUT_SECONDS) as response:
            return json.load(response)
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:1200]
        raise RuntimeError(f"API HTTP {error.code}: {detail}") from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError(f"Nabu API unavailable at {API_BASE}: {error}") from error


def check_neural_server():
    try:
        info = api_json("GET", "/models/mouth")
        if not info.get("loaded"):
            raise RuntimeError("The neural checkpoint is not loaded")
        print(f"[NABU] Neural API ready: {info.get('checkpoint')} ({info.get('embedding_dimension')} dimensions)")
    except (RuntimeError, ValueError, KeyError) as error:
        print(f"[NABU] Neural API not ready yet: {error}")
        print("[NABU] Webcam recording still works; inference can be retried after starting FastAPI.")


def upload_webcam_video(video_path):
    """Upload the already-saved MP4; no manual Swagger upload is needed."""
    boundary = f"----Nabu{uuid4().hex}"
    head = (f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="video"; filename="{Path(video_path).name}"\r\n'
            f"Content-Type: video/mp4\r\n\r\n").encode("utf-8")
    tail = f"\r\n--{boundary}--\r\n".encode("utf-8")
    body = head + Path(video_path).read_bytes() + tail
    result = api_json("POST", "/recordings", body=body, content_type=f"multipart/form-data; boundary={boundary}")
    if not result.get("id"):
        raise RuntimeError(f"API upload did not return a recording ID: {result}")
    return result["id"]


def load_references():
    if not REFERENCE_FILE.is_file():
        return {}
    try:
        data = json.loads(REFERENCE_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict) and all(isinstance(k, str) and isinstance(v, str) for k, v in data.items()):
            return data
    except (ValueError, OSError):
        pass
    print("[NABU] Could not read saved reference IDs; starting with empty references.")
    return {}


def save_references(references):
    REFERENCE_FILE.parent.mkdir(parents=True, exist_ok=True)
    REFERENCE_FILE.write_text(json.dumps(references, indent=2, sort_keys=True), encoding="utf-8")


def send_to_neural_api(video_path, label, duration_seconds, references):
    """Upload a short one-word webcam take, then perform actual BiGRU inference."""
    word = label.strip().lower()
    if len(word.split()) != 1:
        print("[NABU] Neural comparison skipped: record one isolated word, not a sentence.")
        return
    if duration_seconds > NEURAL_MAX_SECONDS:
        print(f"[NABU] Neural comparison skipped: {duration_seconds:.2f}s is too long.")
        print(f"[NABU] Record one word in under {NEURAL_MAX_SECONDS}s, with minimal silence.")
        return

    try:
        user_id = upload_webcam_video(video_path)
        reference_id = references.get(word, user_id)
        query = urlencode({"user_id": user_id, "example_id": reference_id, "label": word})
        result = api_json("POST", f"/comparisons/neural?{query}", body=b"")

        similarity = result.get("cosine_similarity")
        if not isinstance(similarity, (float, int)):
            raise RuntimeError(f"Unexpected neural response: {result}")

        print(f"[NABU] Neural inference SUCCESS | model={result.get('checkpoint')}")
        print(f"[NABU] 64D mouth-motion cosine similarity: {float(similarity):.6f}")

        if word not in references:
            # First recording verifies end-to-end inference via a self-comparison.
            # It is NOT a pronunciation test or a known-correct reference.
            references[word] = user_id
            save_references(references)
            print(f"[NABU] FIRST '{word}' take saved as reference for subsequent recordings.")
            print("[NABU] This first self-comparison should be ~1.0; it checks the pipeline only.")
        else:
            print(f"[NABU] Compared this '{word}' take with the first webcam take of '{word}'.")
            print("[NABU] Similarity is an UNCALIBRATED motion metric, not pronunciation accuracy.")
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        print(f"[NABU] Neural inference was not completed: {error}")
        print("[NABU] Local recording remains saved; existing recorder is unaffected.")


def record_another():
    while True:
        again = input("Record another word? Press Enter to continue, or type q and Enter to quit: ").strip().lower()
        if again == "q":
            return False
        if again == "":
            return True
        print("Invalid input. Press Enter on an empty line to continue, or type q and Enter to quit.")


def main():
    tracker = MouthTracker()
    audio = AudioRecorder(sample_rate=16000)
    video = VideoRecorder()
    references = load_references()

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
    print("Nabu mouth tracker + NEURAL API active")
    print("Press any key (except 'q') to start recording. Only the same key can stop it.")
    print("For neural inference, record one word in about 1-2 seconds.")
    print("Press 'q' in the webcam window to quit")
    print("=====================================")
    check_neural_server()

    try:
        if not cap.isOpened():
            print("Could not open webcam")
            return

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("Could not capture from cap")
                break

            crop, metrics, pts = tracker.process_frame(frame)
            found = crop is not None and crop.size > 0

            # Keep the original webcam recording flow. The saved video is added
            # BEFORE drawing the HUD, so the model sees an unobstructed face.
            if recording:
                video.add(frame)
                if found:
                    frames.append(metrics["landmarks"])
                    timestamps_ms.append(int((time.time() - start_time) * 1000))
                else:
                    skipped += 1

            if found:
                cv2.imshow("Mouth Crop (ROI)", crop)
                hud = (f"Aperture: {metrics['aperture_px']:.1f}px | "
                       f"Stretch: {metrics['stretch_px']:.1f}px | "
                       f"Aspect Ratio: {metrics['aspect_ratio']:.2f}")
                cv2.putText(frame, hud, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

                for pt in pts:
                    cv2.circle(frame, tuple(pt), 1, (0, 0, 255), -1)

                x1, y1, x2, y2 = metrics["bbox"]
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)

            if recording:
                cv2.putText(frame, f"REC  frames: {len(frames)}  (press '{chr(record_key)}' to stop)", (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            else:
                cv2.putText(frame, "Press any key to record, or q to quit", (39, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            cv2.imshow("Webcam Feed", frame)
            key = cv2.waitKey(1) & 0xFF

            if key == 255:
                pass
            elif key == ord("q"):
                if recording:
                    audio.discard()
                    video.discard()
                    print("Quit while recording. Recording not saved.")
                break
            elif not recording:
                try:
                    audio.start()
                    video.start()
                except Exception as error:
                    audio.discard()
                    video.discard()
                    print(f"Could not start recording: {error}")
                    continue

                recording = True
                record_key = key
                frames, timestamps_ms, skipped = [], [], 0
                start_time = time.time()
                print(f"Recording started with '{chr(record_key)}' press '{chr(record_key)}' again to stop")
            elif key == record_key:
                elapsed_seconds = time.time() - start_time
                audio.stop()
                recording = False
                record_key = None
                print(f"Recording stopped: {len(frames)} frames, {skipped} skipped; duration={elapsed_seconds:.2f}s")

                if len(frames) < MIN_FRAMES:
                    audio.discard()
                    video.discard()
                    print(f"Only {len(frames)} frames captured. Need at least {MIN_FRAMES}. Recording not saved.")
                else:
                    before = len(frames)
                    frames, timestamps_ms = trim_idle(frames, timestamps_ms)
                    print(f"Trimmed idle frames: {before} -> {len(frames)}")
                    label = input("Enter said word/letter/sentence. Leave empty to discard: ").strip()

                    if label:
                        # Keep the original landmark-saving function unchanged.
                        path, recording_id = save_recording(label, frames, timestamps_ms, skipped)
                        print(f"Saved recording {recording_id} to {path}")

                        wav_path = Path("pronounciation/test_data/audio") / f"recording_{recording_id}.wav"
                        audio.save(wav_path)
                        print(f"Saved audio to {wav_path}")

                        video_path = Path("pronounciation/test_data/video") / f"recording_{recording_id}.mp4"
                        video.save(video_path)
                        add_audio(video_path, wav_path)
                        print(f"Saved video with audio to {video_path}")

                        # NEW: send this exact webcam recording into Nabu's API.
                        # The first take verifies inference; later takes use the
                        # first webcam take as a reference for that word.
                        send_to_neural_api(video_path, label, elapsed_seconds, references)

                        heard, match = check(wav_path, label)
                        print(f"Whisper heard: '{heard}'" + ("" if match else f"  (you typed '{label}', check this one)"))

                        audio.discard()
                        video.discard()
                    else:
                        audio.discard()
                        video.discard()
                        print("Recording discarded.")

                if not record_another():
                    break
    finally:
        audio.discard()
        video.discard()
        cap.release()
        tracker.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
