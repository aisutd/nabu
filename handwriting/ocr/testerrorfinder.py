import errorfinder

svg = "handwriting/ocr/testch.svg"
expected = "我"

maxPoint, maxDist, normSize = errorfinder.findError(svg, expected)
print("Max Point:", maxPoint)
print("Max Distance:", maxDist)
print("Normalized Size:", normSize)