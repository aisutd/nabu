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
    file_data = result[0]
    texts = file_data.get("rec_texts", [])
    if not texts:
        return ""
    return "\n".join(texts) + "\n"

def ocrAsTuple(image_path):
    result = ocrAsResult(image_path)
    if not result or result is None or result[0] is None: 
        return []
    file_data = result[0]
    texts = file_data.get("rec_texts", [])
    scores = file_data.get("rec_scores", [])
    return list(zip(texts, scores))