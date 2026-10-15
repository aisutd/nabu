import errorfinder

svg = "handwriting/ocr/testch.svg"
expected = "我"

maxPoint, maxDist, normSize, angle = errorfinder.findError(svg, expected)
points1, dists1, normSize1, angles1 = errorfinder.sortError(errorfinder.findError(svg, expected))
points2, dists2, normSize2, angles2 = errorfinder.findErrorFromThreshold(svg, expected, threshold=0.15)
points3, dists3, normSize3, angles3 = errorfinder.findErrorFromLeaderboard(svg, expected, N=5)
print("Max Point:", maxPoint)
print("Max Distance:", maxDist)
print("Normalized Size:", normSize)
print("Angle (rad):", angle)

print("Points sorted by distance:", points1)
print("Distances sorted:", dists1)
print("Angles sorted:", angles1)

print("Points above 15% distance:", points2)
print("Dists above 15% distance:", dists2)
print("Angles above 15% distance:", angles2)

print("Top 5 Points:", points3)
print("Top 5 Distances:", dists3)
print("Top 5 Angles:", angles3)