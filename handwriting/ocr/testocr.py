import ocrfuncs
from tkinter import Tk, filedialog

root = Tk()
root.withdraw()
image_path = filedialog.askopenfilename(
    title="Choose an image",
    filetypes=[
        ("Image files", "*.png"), ("All files", "*.*"),
    ],
)
root.destroy()

if not image_path:
    print("No image selected.")
    raise SystemExit

#Change the OCR language to Chinese before processing the test image
ocrfuncs.changeLang('ch')

#Process the selected image using the OCR functions
result = ocrfuncs.ocrAsResult(image_path)
text = ocrfuncs.ocrAsText(image_path)
ocr_dict = ocrfuncs.ocrAsTuple(image_path)

#print ocr results
print("Result:", result)
print("\n\n\n")
print("Text:", text)
print("OCR Tuple:", ocr_dict)
if not ocr_dict:
    print("No text was recognized.")