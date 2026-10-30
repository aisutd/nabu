#Setting some environment variables to disable unstable features
import os
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

import signal
import threading
import paddle
import paddleocr

#Loaded OCR models keyed by language, so one user's language never affects another's
ocrModels = {}
#Guards ocrModels so two requests can't load the same language at once
ocrModelsLock = threading.Lock()
#One lock per model, PaddleOCR isn't guaranteed to be safe to call from two threads at the same time
ocrLocks = {}

#Returns the OCR model for a language, loading it the first time it's needed. Loading is laggy, but only happens once per language
def getOcr(lang='en'):
    with ocrModelsLock:
        if lang not in ocrModels:
            ocrModels[lang] = paddleocr.PaddleOCR(ocr_version="PP-OCRv6", use_angle_cls=True, lang=lang)
            ocrLocks[lang] = threading.Lock()
        return ocrModels[lang], ocrLocks[lang]

#Load english up front so the first request isn't slow
getOcr('en')

#Paddle replaces the process's SIGINT/SIGTERM handlers with its own C++ crash logger, which crashes or hangs when a server
#tries to stop (e.g. uvicorn --reload restarting, or Ctrl+C). This removes Paddle's handlers and re-registers the Python
#ones (uvicorn's) that Paddle overrode. Must be called from the main thread, after Paddle has been loaded
def restoreSignalHandlers():
    paddle.disable_signal_handler()
    for sig in (signal.SIGINT, signal.SIGTERM):
        handler = signal.getsignal(sig)
        if handler is not None:
            signal.signal(sig, handler)

#Fastest and most versatile OCR function, returns raw result
def ocrAsResult(image_path, lang='en'):
    ocr, lock = getOcr(lang)
    with lock:
        return ocr.ocr(image_path)

#Converts OCR result to plain text
def ocrAsText(image_path, lang='en'):
    #Get the raw OCR result
    result = ocrAsResult(image_path, lang)

    #Check if the result is valid
    if not result or result is None or result[0] is None:
        return ""

    #Initialize the text container
    texts = ""

    #Iterate through each text data in the result
    for fileData in result:
        #Append the recognized texts to the container
        texts = texts + "\n".join(fileData.get("rec_texts", [])) + "\n"
        #Break the loop if no texts were found or data is invalid
        if not texts:
            break

    #Return the final combined text
    return "\n".join(texts) + "\n"

#Converts OCR result to a tuple of (text, score) pairs
def ocrAsTuple(image_path, lang='en'):
    #Get the raw OCR result
    result = ocrAsResult(image_path, lang)

    #Check if the result is valid
    if not result or result is None or result[0] is None:
        return ()

    #Initialize the tuple container
    tupleData = ()

    #Iterate through each text data in the result
    for fileData in result:
        #Extract the recognized texts and scores for the current file data
        texts = fileData.get("rec_texts", [])
        scores = fileData.get("rec_scores", [])
        #Combine the texts and scores into pairs
        nextData = zip(texts, scores)
        #Append the recognized texts and scores to the tuple container
        tupleData = tupleData + tuple(nextData)

    #Return the final combined tuple
    return tupleData