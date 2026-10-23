import ocrfuncs

#A test image that has the Chinese character wo3 (我) on it, relative to the project root
image_path = "handwriting/ocr/testch.png"

#Process the test image using the OCR functions, in Chinese
result = ocrfuncs.ocrAsResult(image_path, 'ch')
text = ocrfuncs.ocrAsText(image_path, 'ch')
ocr_dict = ocrfuncs.ocrAsTuple(image_path, 'ch')

#Print the OCR results for verification
print("Result:", result)
print("\n\n\n")
print("Text:", text)
print("OCR Tuple:", ocr_dict)