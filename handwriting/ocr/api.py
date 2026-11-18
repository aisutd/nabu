from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from io import BytesIO
from PIL import Image, UnidentifiedImageError
import os
import numpy as np
import cv2
import ocrfuncs
import errorfinder

#Paddle takes over the stop signals and can crash during Python's interpreter cleanup, which leaves a dead worker
#holding the port and makes --reload wait forever.
#On startup, give the stop signals back to uvicorn so it can shut down normally.
#On shutdown (open requests are done by then), exit immediately and skip the cleanup. Nothing here needs saving on exit
@asynccontextmanager
async def lifespan(fastapp):
    ocrfuncs.restoreSignalHandlers()
    yield
    os._exit(0)

#Create the FastAPI app instance
app = FastAPI(lifespan=lifespan)

#Serve the test frontend (handwriting/ocr/frontend) at /tester
app.mount("/tester", StaticFiles(directory=Path(__file__).parent / "frontend", html=True), name="tester")

#Endpoints are plain def (not async def) on purpose: OCR and errorfinder are CPU heavy, and FastAPI runs plain def
#endpoints in a thread pool, so one slow request doesn't block every other request on the event loop

#OCRfuncs
#takes files (and an optional language, default english) as input and returns whatever the ocrfuncs functions return
@app.post("/ocr/text")
def ocr_text(file: UploadFile = File(...), lang: str = Form('en')):
    #Call the ocrAsText function from ocrfuncs to get the recognized text
    data = np.frombuffer(file.file.read(), np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    return ocrfuncs.ocrAsText(image, lang)

@app.post("/ocr/tuple")
def ocr_tuple(file: UploadFile = File(...), lang: str = Form('en')):
    #Call the ocrAsTuple function from ocrfuncs to get the recognized text and scores as tuples
    data = np.frombuffer(file.file.read(), np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)
    return ocrfuncs.ocrAsTuple(image, lang)

#Errorfinder
#similarly takes files and returns errors, errors exceeding the threshold, or errors in the leaderboard, depending on the endpoint
@app.post("/ocr/errorfinder/findError")
def ocr_errorfinder(file: UploadFile = File(...), expected: str = Form(...)):
    #Call the errorfinder function from errorfinder to find errors in the recognized text   
    error = errorfinder.findError(file.file, expected) #hand paddleocr the pixels (same for the rest of the endpoints)
    return highlighted_errors(error)


def highlighted_errors(error):
    culledError = errorfinder.cullErrorFromThreshold(error, threshold=errorfinder.generateThreshold(error[1]))
    combinedError = errorfinder.combineAndTransform(culledError)
    points, sizes = errorfinder.cullPointsFromLeaderboard(combinedError, 5)
    return points, sizes, error[2]

def compare_glyph(file, expected):
    expected = expected.strip()
    if len(expected) != 1:
        raise HTTPException(422, "Enter one reference character.")
    try:
        points, distances, bounds, angles = errorfinder.findError(file.file, expected)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(422, "Choose a readable handwriting image.") from exc
    if not distances or not bounds[2] or not bounds[3]:
        raise HTTPException(422, "No clear handwriting was found. Try a darker sample on plain paper.")
    return points, distances, bounds, angles


@app.get("/ocr/reference")
def reference_glyph(expected: str = Query(min_length=1, max_length=1)):
    mask = errorfinder.renderTextMask(expected)
    bounds = mask.getbbox()
    if bounds is None:
        raise HTTPException(422, "Enter a visible reference character.")
    glyph = mask.crop(bounds)
    image = Image.new("RGBA", glyph.size)
    image.putalpha(glyph)
    output = BytesIO()
    image.save(output, format="PNG")
    return Response(output.getvalue(), media_type="image/png")


@app.post("/ocr/errorfinder/grade")
def grade_handwriting(file: UploadFile = File(...), expected: str = Form(...)):
    _, distances, _, _ = compare_glyph(file, expected)
    # Distances are measured in a unit square after aligning the two glyphs.
    mean_distance = sum(distances) / len(distances)
    return {"similarity": round(100 * max(0, 1 - mean_distance / np.sqrt(2)))}


@app.post("/ocr/errorfinder/review")
def review_handwriting(file: UploadFile = File(...), expected: str = Form(...)):
    return highlighted_errors(compare_glyph(file, expected))
