"""Run the unified Nabu FastAPI server."""

import argparse
import asyncio
from contextlib import asynccontextmanager
import os
from pathlib import Path
import signal
from threading import Thread, current_thread, main_thread

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from asl.live_demo import PAGE, STREAM_FRAME_SECONDS, create_demo
from handwriting.ocr import api as handwriting
from pronounciation import api as mouth
from pronounciation.speaking import create_speaking_handlers

ROOT = Path(__file__).resolve().parent


@asynccontextmanager
async def lifespan(app):
    if current_thread() is main_thread():
        # Paddle can replace Uvicorn's signal handlers when it loads.
        handlers = {sig: signal.getsignal(sig) for sig in (signal.SIGINT, signal.SIGTERM)}
        try:
            from handwriting.ocr import ocrfuncs

            ocrfuncs.restoreSignalHandlers()
        finally:
            for sig, handler in handlers.items():
                signal.signal(sig, handler)

    app.state.asl_demo = None
    app.state.asl_error = None
    try:
        demo = create_demo()
    except Exception as exc:
        app.state.asl_error = str(exc)
    else:
        app.state.asl_demo = demo
        camera = Thread(target=demo.run_camera, daemon=True)
        camera.start()
    try:
        yield
    finally:
        if app.state.asl_demo is not None:
            demo.stopping.set()
            camera.join(timeout=3)


def register_speaking_routes(router, handlers):
    exercise_info, upload_recording, review = handlers
    router.add_api_route("/speaking/exercises/{exercise_id}", exercise_info, methods=["GET"], tags=["Speaking"])
    router.add_api_route("/speaking/recordings", upload_recording, methods=["POST"], status_code=201, tags=["Speaking"])
    router.add_api_route("/speaking/review", review, methods=["POST"], tags=["Speaking"])


app = FastAPI(title="Nabu API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip() for origin in os.getenv(
            "NABU_ALLOWED_ORIGINS", "http://localhost:5173,capacitor://localhost,https://localhost"
        ).split(",")
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.add_api_route("/practice", mouth.practice_library, methods=["GET"], tags=["Pronunciation"])
app.add_api_route("/practice/{word}/video", mouth.practice_reference, methods=["GET"], tags=["Pronunciation"])
app.add_api_route("/recordings", mouth.upload_video, methods=["POST"], status_code=201, tags=["Pronunciation"])
app.add_api_route("/recordings/{recording_id}/transcription", mouth.transcription, methods=["POST"], tags=["Pronunciation"])
app.add_api_route("/comparisons", mouth.comparison, methods=["POST"], tags=["Pronunciation"])
app.add_api_route("/comparisons/neural", mouth.neural_comparison, methods=["POST"], tags=["Pronunciation"])
app.add_api_route("/models/mouth", mouth.mouth_model_info, methods=["GET"], tags=["Pronunciation"])
app.add_api_route("/practice/review", mouth.review_attempt, methods=["POST"], tags=["Pronunciation"])

register_speaking_routes(app, create_speaking_handlers(
    mouth.DATA, mouth.REFERENCE_DIR, mouth.REFERENCE_FILES,
    mouth.upload_video, mouth.comparison, mouth.processing,
))

app.add_api_route("/ocr/text", handwriting.ocr_text, methods=["POST"], tags=["Handwriting"])
app.add_api_route("/ocr/tuple", handwriting.ocr_tuple, methods=["POST"], tags=["Handwriting"])
app.add_api_route("/ocr/reference", handwriting.reference_glyph, methods=["GET"], tags=["Handwriting"])
app.add_api_route("/ocr/errorfinder/findError", handwriting.ocr_errorfinder, methods=["POST"], tags=["Handwriting"])
app.add_api_route("/ocr/errorfinder/grade", handwriting.grade_handwriting, methods=["POST"], tags=["Handwriting"])
app.add_api_route("/ocr/errorfinder/review", handwriting.review_handwriting, methods=["POST"], tags=["Handwriting"])

app.mount("/media", StaticFiles(directory=mouth.DATA), name="media")
app.mount("/tester", StaticFiles(directory=ROOT / "handwriting/ocr/frontend", html=True), name="tester")


@app.get("/asl-demo", include_in_schema=False)
def asl_demo_page():
    return FileResponse(PAGE)


@app.get("/asl-api/state", tags=["ASL"])
def asl_state(request: Request):
    demo = request.app.state.asl_demo
    if demo is None:
        state = {
            "mode": "no_hand", "letter": None, "speed": 0, "guesses": [],
            "last_sign": None, "signs_enabled": False, "text": "",
            "error": request.app.state.asl_error,
        }
    else:
        state = demo.snapshot()
    return JSONResponse(state, headers={"Cache-Control": "no-store"})


@app.post("/asl-api/text/{command}", tags=["ASL"])
def asl_edit_text(command: str, request: Request):
    demo = request.app.state.asl_demo
    if demo is None:
        raise HTTPException(503, "ASL recognition is unavailable.")
    if not demo.edit_text(command):
        raise HTTPException(404, "Unknown transcript command.")
    return {"ok": True}


@app.get("/asl-api/stream", tags=["ASL"])
async def asl_stream(request: Request):
    demo = request.app.state.asl_demo
    if demo is None:
        raise HTTPException(503, "ASL recognition is unavailable.")

    async def frames():
        while not demo.stopping.is_set():
            jpeg = demo.latest_jpeg()
            if jpeg is not None:
                header = f"--frame\r\nContent-Type: image/jpeg\r\nContent-Length: {len(jpeg)}\r\n\r\n"
                yield header.encode() + jpeg + b"\r\n"
            await asyncio.sleep(STREAM_FRAME_SECONDS)

    return StreamingResponse(
        frames(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store"},
    )


def main():
    import uvicorn

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port, timeout_graceful_shutdown=5)


if __name__ == "__main__":
    main()
