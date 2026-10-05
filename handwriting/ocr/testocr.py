import ocrfuncs

image_path = "handwriting/ocr/testch.png"

ocrfuncs.changeLang('ch')
result = ocrfuncs.ocrAsResult(image_path)
text = ocrfuncs.ocrAsText(image_path)
ocr_dict = ocrfuncs.ocrAsTuple(image_path)

print("Result:", result)
print("\n\n\n")
print("Text:", text)
print("OCR Tuple:", ocr_dict)