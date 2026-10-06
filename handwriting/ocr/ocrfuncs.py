import os
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"

import paddleocr

ocr = paddleocr.PaddleOCR(ocr_version="PP-OCRv6", use_angle_cls=True, lang='en')

def changeLang(lang): 
    global ocr
    ocr = paddleocr.PaddleOCR(ocr_version="PP-OCRv6", use_angle_cls=True, lang=lang)

def ocrAsResult(image_path):
    return ocr.ocr(image_path)

def ocrAsText(image_path):
    result = ocrAsResult(image_path)
    if not result or result is None or result[0] is None: 
        return ""
    texts = ""
    for fileData in result:
        texts = texts + "\n".join(fileData.get("rec_texts", [])) + "\n"
        if not texts:
            break
    return "\n".join(texts) + "\n"

def ocrAsTuple(image_path):
    result = ocrAsResult(image_path)
    if not result or result is None or result[0] is None: 
        return ()
    tupleData = ()
    for fileData in result:
        tupleData = tupleData + tuple(zip(fileData.get("rec_texts", []), fileData.get("rec_scores", [])))
    return tupleData