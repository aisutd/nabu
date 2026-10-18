from fastapi import FastAPI
import ocrfuncs
import errorfinder

#Create the FastAPI app instance
app = FastAPI()

#OCRfunds
@app.get("/ocr/text")
async def ocr_text(image_path: str):
    #Call the ocrAsText function from ocrfuncs to get the recognized text
    return ocrfuncs.ocrAsText(image_path)

@app.get("/ocr/tuple")
async def ocr_tuple(image_path: str):
    #Call the ocrAsTuple function from ocrfuncs to get the recognized text and scores as tuples
    return ocrfuncs.ocrAsTuple(image_path)

@app.get("/ocr/changeLang")
async def ocr_changeLang(lang: str):
    #Call the changeLang function from ocrfuncs to change the OCR language
    ocrfuncs.changeLang(lang)
    return {"message": f"OCR language changed to {lang}"}

#Errorfinder
@app.get("/ocr/errorfinder/findError")
async def ocr_errorfinder(image_path: str, expected: str):
    #Call the errorfinder function from errorfinder to find errors in the recognized text
    return errorfinder.findError(image_path, expected)

@app.get("/ocr/errorfinder/findErrorFromThreshold")
async def ocr_errorfinder_from_threshold(image_path: str, expected: str, threshold: float):
    #Call the errorfinder function from errorfinder to find errors in the recognized text based on a threshold
    return errorfinder.findErrorFromThreshold(image_path, expected, threshold)

@app.get("/ocr/errorfinder/findErrorFromLeaderboard")
async def ocr_errorfinder_from_leaderboard(image_path: str, expected: str, N: int):
    #Call the errorfinder function from errorfinder to find errors in the recognized text based on a leaderboard
    return errorfinder.findErrorFromLeaderboard(image_path, expected, N)

@app.get("/ocr/errorfinder/sortError")
async def ocr_errorfinder_sort_errors(image_path: str, expected: str):
    #Call the errorfinder function from errorfinder to sort errors in the recognized text
    return errorfinder.sortError(errorfinder.findError(image_path, expected))

@app.get("/ocr/errorfinder/sortPoints")
async def ocr_errorfinder_sort_points(image_path: str, expected: str):
    #Call the errorfinder function from errorfinder to sort points in the recognized text
    return errorfinder.sortPoints(errorfinder.findError(image_path, expected))

@app.get("/ocr/errorfinder/generateThreshold")
async def ocr_errorfinder_generate_threshold(image_path: str, expected: str):
    #Call the errorfinder function from errorfinder to generate a threshold based on the sizes of the errors
    results = errorfinder.findError(image_path, expected)
    return errorfinder.generateThreshold(results[1])

@app.get("/ocr/errorfinder/cullErrorFromThreshold")
async def ocr_errorfinder_cull_from_threshold(image_path: str, expected: str, threshold: float):
    #Call the errorfinder function from errorfinder to cull errors based on a threshold
    results = errorfinder.findError(image_path, expected)
    return errorfinder.cullErrorFromThreshold(results, threshold)

@app.get("/ocr/errorfinder/cullPointsFromThreshold")
async def ocr_errorfinder_cull_points_from_threshold(image_path: str, expected: str, threshold: float):
    #Call the errorfinder function from errorfinder to cull points based on a threshold
    results = errorfinder.findError(image_path, expected)
    return errorfinder.cullPointsFromThreshold(results, threshold)

@app.get("/ocr/errorfinder/cullErrorFromLeaderboard")
async def ocr_errorfinder_cull_from_leaderboard(image_path: str, expected: str, N: int):
    #Call the errorfinder function from errorfinder to cull errors based on a leaderboard
    results = errorfinder.findError(image_path, expected)
    return errorfinder.cullErrorFromLeaderboard(results, N)

@app.get("/ocr/errorfinder/cullPointsFromLeaderboard")
async def ocr_errorfinder_cull_points_from_leaderboard(image_path: str, expected: str, N: int):
    #Call the errorfinder function from errorfinder to cull points based on a leaderboard
    results = errorfinder.findError(image_path, expected)
    return errorfinder.cullPointsFromLeaderboard(results, N)

@app.get("/ocr/errorfinder/transformPoints")
async def ocr_errorfinder_transform_points(image_path: str, expected: str):
    #Call the errorfinder function from errorfinder to transform points based on the recognized text
    results = errorfinder.findError(image_path, expected)
    return errorfinder.transformPoints(results)

@app.get("/ocr/errorfinder/combineAndTransform")
async def ocr_errorfinder_combine_and_transform(image_path: str, expected: str):
    #Call the errorfinder function from errorfinder to combine and transform points based on the recognized text
    results = errorfinder.findError(image_path, expected)
    return errorfinder.combineAndTransform(results)