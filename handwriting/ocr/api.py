from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
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
async def lifespan(app):
    ocrfuncs.restoreSignalHandlers()
    yield
    os._exit(0)

#Create the FastAPI app instance
app = FastAPI(lifespan=lifespan)

#Serve the test frontend (handwriting/ocr/frontend) at /tester
app.mount("/tester", StaticFiles(directory=Path(__file__).parent / "frontend", html=True), name="tester")

#Endpoints are plain def (not async def) on purpose: OCR and errorfinder are CPU heavy, and FastAPI runs plain def
#endpoints in a thread pool, so one slow request doesn't block every other request on the event loop

#OCRfunds
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
    return errorfinder.findError(file.file, expected) #hand paddleocr the pixels (same for the rest of the endpoints)

@app.post("/ocr/errorfinder/findErrorFromThreshold")
def ocr_errorfinder_from_threshold(file: UploadFile = File(...), expected: str = Form(...), threshold: float = Form(...)):
    #Call the errorfinder function from errorfinder to find errors in the recognized text based on a threshold
    return errorfinder.findErrorFromThreshold(file.file, expected, threshold)

@app.post("/ocr/errorfinder/findErrorFromLeaderboard")
def ocr_errorfinder_from_leaderboard(file: UploadFile = File(...), expected: str = Form(...), N: int = Form(...)):
    #Call the errorfinder function from errorfinder to find errors in the recognized text based on a leaderboard
    return errorfinder.findErrorFromLeaderboard(file.file, expected, N)

@app.post("/ocr/errorfinder/sortError")
def ocr_errorfinder_sort_errors(file: UploadFile = File(...), expected: str = Form(...)):
    #Call the errorfinder function from errorfinder to sort errors in the recognized text
    return errorfinder.sortError(errorfinder.findError(file.file, expected))#TODO: Needs to changed to accept any input, not just from file.file

@app.post("/ocr/errorfinder/sortPoints")
def ocr_errorfinder_sort_points(file: UploadFile = File(...), expected: str = Form(...)):
    #Call the errorfinder function from errorfinder to sort points in the recognized text
    return errorfinder.sortPoints(errorfinder.transformPoints(errorfinder.findError(file.file, expected)))#TODO: Needs to changed to accept any input, not just from file.file

@app.post("/ocr/errorfinder/generateThreshold")
def ocr_errorfinder_generate_threshold(file: UploadFile = File(...), expected: str = Form(...)):
    #Call the errorfinder function from errorfinder to generate a threshold based on the sizes of the errors
    results = errorfinder.findError(file.file, expected)#TODO: Needs to changed to accept any input, not just from file.file
    return errorfinder.generateThreshold(results[1])

@app.post("/ocr/errorfinder/cullErrorFromThreshold")
def ocr_errorfinder_cull_from_threshold(file: UploadFile = File(...), expected: str = Form(...), threshold: float = Form(...)):
    #Call the errorfinder function from errorfinder to cull errors based on a threshold
    results = errorfinder.findError(file.file, expected)
    return errorfinder.cullErrorFromThreshold(results, threshold)#TODO: Needs to changed to accept any input, not just from file.file

@app.post("/ocr/errorfinder/cullPointsFromThreshold")
def ocr_errorfinder_cull_points_from_threshold(file: UploadFile = File(...), expected: str = Form(...), threshold: float = Form(...)):
    #Call the errorfinder function from errorfinder to cull points based on a threshold
    results = errorfinder.transformPoints(errorfinder.findError(file.file, expected))#TODO: Needs to changed to accept any input, not just from file.file
    return errorfinder.cullPointsFromThreshold(results, threshold)

@app.post("/ocr/errorfinder/cullErrorFromLeaderboard")
def ocr_errorfinder_cull_from_leaderboard(file: UploadFile = File(...), expected: str = Form(...), N: int = Form(...)):
    #Call the errorfinder function from errorfinder to cull errors based on a leaderboard
    results = errorfinder.sortError(errorfinder.findError(file.file, expected))#TODO: Needs to changed to accept any input, not just from file.file
    return errorfinder.cullErrorFromLeaderboard(results, N)

@app.post("/ocr/errorfinder/cullPointsFromLeaderboard")
def ocr_errorfinder_cull_points_from_leaderboard(file: UploadFile = File(...), expected: str = Form(...), N: int = Form(...)):
    #Call the errorfinder function from errorfinder to cull points based on a leaderboard
    results = errorfinder.sortPoints(errorfinder.transformPoints(errorfinder.findError(file.file, expected)))#TODO: Needs to changed to accept any input, not just from file.file
    return errorfinder.cullPointsFromLeaderboard(results, N)

@app.post("/ocr/errorfinder/transformPoints")
def ocr_errorfinder_transform_points(file: UploadFile = File(...), expected: str = Form(...)):
    #Call the errorfinder function from errorfinder to transform points based on the recognized text
    results = errorfinder.findError(file.file, expected)#TODO: Needs to changed to accept any input, not just from file.file
    return errorfinder.transformPoints(results)

@app.post("/ocr/errorfinder/combineAndTransform")
def ocr_errorfinder_combine_and_transform(file: UploadFile = File(...), expected: str = Form(...)):
    #Call the errorfinder function from errorfinder to combine and transform points based on the recognized text
    results = errorfinder.findError(file.file, expected)#TODO: Needs to changed to accept any input, not just from file.file
    return errorfinder.combineAndTransform(results)