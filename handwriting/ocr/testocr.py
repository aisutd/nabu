import ocrfuncs

#A test image that has the Chinese character wo3 (我) on it, relative to the project root
image_path = "handwriting/ocr/testch.png"

#Change the OCR language to Chinese before processing the test image
ocrfuncs.changeLang('ch')

#Process the test image using the OCR functions
result = ocrfuncs.ocrAsResult(image_path)
text = ocrfuncs.ocrAsText(image_path)
ocr_dict = ocrfuncs.ocrAsTuple(image_path)

#Print the OCR results for verification
print("Result:", result)
print("\n\n\n")
print("Text:", text)
print("OCR Tuple:", ocr_dict)