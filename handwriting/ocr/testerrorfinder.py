import errorfinder

svg = "handwriting/ocr/testch.svg"
expected = "我"

maxPoint, maxDist, normSize, angle = errorfinder.findError(svg, expected)
points1, dists1, normSize1, angles1 = errorfinder.sortError(errorfinder.findError(svg, expected))
points2, dists2, normSize2, angles2 = errorfinder.findErrorFromThreshold(svg, expected, threshold=0.15)
points3, dists3, normSize3, angles3 = errorfinder.findErrorFromLeaderboard(svg, expected, N=5)
print("\nMax Point:", maxPoint)
print("\nMax Distance:", maxDist)
print("\nNormalized Size:", normSize)
print("\nAngle (rad):", angle)

print("\n\n\nPoints sorted by distance:", points1)
print("\nDistances sorted:", dists1)
print("\nAngles sorted:", angles1)

print("\n\n\nPoints above 15% distance:", points2)
print("\nDists above 15% distance:", dists2)
print("\nAngles above 15% distance:", angles2)

print("\n\n\nTop 5 Points:", points3)
print("\nTop 5 Distances:", dists3)
print("\nTop 5 Angles:", angles3)

#All Results
results = errorfinder.findError(svg, expected)
#Use the results to generate a threshold based on the sizes of the errors
threshold = errorfinder.generateThreshold(results[1])

#The correct way to use combineAndTransform is to first cull the errors based on the threshold, then combine and transform the remaining points.
#This ensures that only the most significant errors are considered for combination and transformation.
#You may optionally perform another culling operation after the combination and transformation to further refine the results.
transformedPoint, transformedSize = errorfinder.cullPointsFromLeaderboard(
    errorfinder.combineAndTransform(
        errorfinder.cullErrorFromThreshold(results, threshold=threshold)), N=5)
#Transformed points and sizes reflect how you would display them, centered at the transformed point with the diamater.
print("\n\n\nTransformed Point (top 5): ", transformedPoint)
print("\nTransformed Size (top 5): ", transformedSize)
print("\nThreshold: ", threshold)