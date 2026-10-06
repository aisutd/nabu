#Setting some environment variables to disable unstable features
import os
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

import paddleocr

#Temporary ocr, default to english
ocr = paddleocr.PaddleOCR(ocr_version="PP-OCRv6", use_angle_cls=True, lang='en')

#Replaces ocr, do be careful, it is laggy. Only do when necessary (when language is different)
def changeLang(lang): 
    #Making sure to use the global ocr instance
    global ocr
    ocr = paddleocr.PaddleOCR(ocr_version="PP-OCRv6", use_angle_cls=True, lang=lang)

#Fastest and most versatile OCR function, returns raw result
def ocrAsResult(image_path):
    return ocr.ocr(image_path)

#Converts OCR result to plain text
def ocrAsText(image_path):
    #Get the raw OCR result
    result = ocrAsResult(image_path)

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
def ocrAsTuple(image_path):
    #Get the raw OCR result
    result = ocrAsResult(image_path)

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