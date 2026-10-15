import errorfinder

svg = "handwriting/ocr/testch.svg"
expected = "我"

maxPoint, maxDist, normSize, angle = errorfinder.findError(svg, expected)
points, dists, normSize, angles = errorfinder.findErrorFromThreshold(svg, expected, threshold=0.15)
print("Max Point:", maxPoint)
print("Max Distance:", maxDist)
print("Normalized Size:", normSize)
print("Angle (rad):", angle)
print("Angle (deg):", angle * 180 / 3.141592653589793)

print("Points:", points)
print("Dists:", dists)
print("Angles:", angles)