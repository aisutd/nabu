from PIL import Image, ImageDraw, ImageFont
import xml.etree.ElementTree as ET
from svgpathtools import parse_path as parsePath
import math

#Converts an SVG file into a list of points representing the paths and shapes within the SVG.
def extractSvgPoints(textSvg, segments=5):
    #Parse the SVG file
    tree = ET.parse(textSvg)
    root = tree.getroot()

    #Extract points from the SVG elements
    points = []
    for path in root.iter(): 
        tag = path.tag.split('}')[-1] if '}' in path.tag else path.tag
        if tag == 'path':
            d = path.get('d')
            if d:
                for segment in parsePath(d):
                    segmentType = type(segment).__name__
                    if segmentType == 'Line':
                        points.append((segment.start.real, segment.start.imag))
                        points.append((segment.end.real, segment.end.imag))
                    elif segmentType in ('CubicBezier', 'QuadraticBezier', 'Arc'):
                        for i in range(segments + 1): 
                            t = i / segments
                            pointOnCurve = segment.point(t)
                            points.append((pointOnCurve.real, pointOnCurve.imag))
        elif tag == 'polyline': 
            pointsStr = path.get('points')
            if pointsStr:
                cleanPointsStr = pointsStr.replace(',', ' ').split()
                for i in range (0, len(cleanPointsStr), 2): 
                    if i + 1 < len(cleanPointsStr):
                        x, y = map(float, (cleanPointsStr[i], cleanPointsStr[i + 1]))
                        points.append((x, y))
        elif tag == 'line': 
            try: 
                x1 = float(path.get('x1', 0))
                x2 = float(path.get('x2', 0))
                y1 = float(path.get('y1', 0))
                y2 = float(path.get('y2', 0))
                points.append((x1, y1))
                points.append((x2, y2))
            except (TypeError, ValueError, AttributeError):
                continue
    return points

#Converts a text string into a list of points representing the pixels of the rendered text. Designed for a single character in mind but should work with more characters as well.
def extractTextPoints(text, size=32):
    #Create a blank image to render the text on
    img = Image.new('1', (size*2*len(text), size*2), color=0)

    #Setup the drawing context and font for rendering the text
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=size)
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]

    #Render the text onto the image
    draw.text((size // 2, size // 2), text, font=font, fill=1)

    #Convert the image into points where the text exists
    pixels = img.load()
    points = [
        (x, y) 
        for y in range(size * 2) 
        for x in range(size * 2 * len(text)) 
        if pixels[x, y] == 1
    ]
    return points

#Normalizes a list of points to the range [0, 1] and returns the normalized points along with the original bounding box.
def normalize(data): 
    #Handle the case where the data is empty
    if not data:
        return [], (0, 0, 0, 0)

    #Basic AABB calculation
    minX = min(point[0] for point in data)
    minY = min(point[1] for point in data)
    maxX = max(point[0] for point in data)
    maxY = max(point[1] for point in data)
    width = maxX - minX
    height = maxY - minY

    #Handle divide by zero error smoothly
    if width == 0 or height == 0:
        return [(0, 0)] * len(data), (0, 0, 0, 0)

    #Normalize the points to the range [0, 1] and return them along with the original bounding box
    return [( (point[0] - minX) / width, (point[1] - minY) / height ) for point in data], (minX, minY, width, height)

#Sorts the error data based on the distances in descending order and returns the sorted points, distances, normalized size, and angles.
def sortError(errorData):
    points, dists, normSize, angles = errorData
    #Sort the points, distances, and angles based on the distances in descending order
    sortedData = sorted(zip(points, dists, angles), key=lambda x: x[1], reverse=True)
    sortedPoints, sortedDists, sortedAngles = zip(*sortedData) if sortedData else ([], [], [])
    return list(sortedPoints), list(sortedDists), normSize, list(sortedAngles)

#Sorts the error data after being transformed into points, based on the sizes in descending order and returns the sorted points, and sizes.
def sortPoints(pointData):
    points, sizes = pointData
    #Sort the points and sizes based on the sizes in descending order
    sortedData = sorted(zip(points, sizes), key=lambda x: x[1], reverse=True)
    sortedPoints, sortedSizes = zip(*sortedData) if sortedData else ([], [])
    return list(sortedPoints), list(sortedSizes)

#Basic angle function to be a bit more readable than using math.atan2 directly. Returns the angle in radians between two points, with the angle normalized to the range [0, 2π].
def findAngle(point1, point2):
    angle = math.atan2(point2[1] - point1[1], point2[0] - point1[0])
    if(angle < 0):
        angle += 2 * math.pi
    return angle

#Warning, this is O(M*N) where M is the number of points in the text SVG and N is the number of points in the expected text.
def findError(textSvg, expected):
    #Extract and normalize the points from the text SVG and the expected text
    textPoints, normSize = normalize(extractSvgPoints(textSvg))
    expectedPoints, _ = normalize(extractTextPoints(expected))

    #Find the point in the text SVG that is furthest from any point in the expected text
    dists = []
    angles = []
    points = []
    for textPoint in textPoints:
        minAngle = 0
        minDist = float('inf')
        for exp in expectedPoints:
            dist = (textPoint[0] - exp[0])**2 + (textPoint[1] - exp[1])**2
            if dist < minDist:
                minDist = dist
                minAngle = findAngle(textPoint, exp)
        dists.append(math.sqrt(minDist))
        angles.append(minAngle)
        points.append(textPoint)
    #Find the point in the expected text that is furthest from any point in the text SVG
    for expectedPoint in expectedPoints: 
        minAngle = 0
        minDist = float('inf')
        for textPoint in textPoints:
            dist = (textPoint[0] - expectedPoint[0])**2 + (textPoint[1] - expectedPoint[1])**2
            if dist < minDist:
                minDist = dist
                minAngle = findAngle(expectedPoint, textPoint)
        dists.append(math.sqrt(minDist))
        angles.append(minAngle)
        points.append(expectedPoint)

    #Renormalize points so that it accurately reflects where the error occurred in the original coordinate space
    for i in range(len(points)): 
        points[i] = (points[i][0] * normSize[2] + normSize[0], points[i][1] * normSize[3] + normSize[1]) if points[i] else None

    #Ellipse to show problem can be rendered at center maxPoint with w=maxDist*normSize[2] and h=maxDist*normSize[3]
    #You may use maxAngle to move the ellipse in the direction of the error if you want to make it more visually accurate, but it is not necessary.
    #Returns None, 0, (0, 0, 0, 0), 0 if there is an error
    return points, dists, normSize, angles

#Culls transformed points based on a size threshold, returning only the points and sizes that exceed the threshold.
#Note: This function does NOT use 0-1 threshold, as it uses px as the unit for the threshold, which is based on the original coordinate space of the SVG and text.
def cullPointsFromThreshold(errorData, threshold=100):
    points, sizes = sortPoints(errorData)
    newPoints = []
    newSizes = []
    for point, size in zip(points, sizes):
        if size > threshold:
            newPoints.append(point)
            newSizes.append(size)
        else: 
            break
    return newPoints, newSizes

#Culls error data based on a distance threshold, returning only the points, distances, and angles that exceed the threshold.
def cullErrorFromThreshold(errorData, threshold=0.1):
    points, dists, normSize, angles = sortError(errorData)
    newPoints = []
    newDists = []
    newAngles = []
    for point, dist, angle in zip(points, dists, angles):
        if dist > threshold:
            newPoints.append(point)
            newDists.append(dist)
            newAngles.append(angle)
        else: 
            break
    return newPoints, newDists, normSize, newAngles

#Finds the error data from the text SVG and expected text, then culls the results based on a distance threshold, returning only the points, distances, normalized size, and angles that exceed the threshold.
#This function is a convenience wrapper that combines the findError and cullErrorFromThreshold functions
def findErrorFromThreshold(textSvg, expected, threshold=0.1):
    return cullErrorFromThreshold(sortError(findError(textSvg, expected)), threshold=threshold)

#Culls points and sizes based on a number of wanted results, returning only the largest sizes and corresponding points up to N.
def cullPointsFromLeaderboard(errorData, N=5):
    points, sizes = errorData
    newPoints = []
    newSizes = []
    for i in range(min(N, len(sizes))):
        newPoints.append(points[i])
        newSizes.append(sizes[i])
    return newPoints, newSizes

#Culls error data based on a number of wanted results, returning only the largest distances and corresponding points and angles up to N.
def cullErrorFromLeaderboard(errorData, N=5):
    points, dists, normSize, angles = errorData
    newPoints = []
    newDists = []
    newAngles = []
    for i in range(min(N, len(dists))):
        newPoints.append(points[i])
        newDists.append(dists[i])
        newAngles.append(angles[i])
    return newPoints, newDists, normSize, newAngles

#Finds the error data from the text SVG and expected text, then culls the results based on a number of wanted results, returning only the largest distances and corresponding points and angles up to N.
#This function is a convenience wrapper that combines the findError and cullErrorFromLeaderboard functions
def findErrorFromLeaderboard(textSvg, expected, N=5):
    return cullErrorFromLeaderboard(sortError(findError(textSvg, expected)), N=N)

#Transforms the error data into points and sizes based on the angles and normalized size, returning the transformed points and sizes.
#This function is the least scientific of these functions, so feel free to modify it to your liking. It is designed to give a visual representation of the errors, but it may not be the most accurate representation of the errors.
def transformPoints(errorData):
    points, sizes, normSize, angles = errorData
    transformedPoints = []
    transformedSizes = []
    for i in range(len(points)):
        newPoint = (points[i][0] + math.cos(angles[i]) * normSize[2] * sizes[i] / 4, points[i][1] + math.sin(angles[i]) * normSize[3] * sizes[i] / 4)
        transformedPoints.append(newPoint)
        newSize = sizes[i] * (normSize[2] + normSize[3]) / 2
        transformedSizes.append(newSize)
    return transformedPoints, transformedSizes

#Try to combine two points based on their sizes and distances, returning whether they can be combined, the new point, and the new size.
def tryCombine(point1, size1, point2, size2):
    dist = (point1[0] - point2[0])**2 + (point1[1] - point2[1])**2
    if dist < ((size1 + size2)/2)**2: 
        minX = min(point1[0]-size1/2, point2[0]-size2/2)
        maxX = max(point1[0]+size1/2, point2[0]+size2/2)
        minY = min(point1[1]-size1/2, point2[1]-size2/2)
        maxY = max(point1[1]+size1/2, point2[1]+size2/2)
        return True, ((minX + maxX) / 2, (minY + maxY) / 2), max(maxX - minX, maxY - minY)
    return False, None, None

#Loop through all points and try to combine them based on their sizes and distances, returning the new points and sizes after maximum ONE combining.
def combineOne(points, sizes):
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            canCombine, newPoint, newSize = tryCombine(points[i], sizes[i], points[j], sizes[j])
            if canCombine: 
                return True, newPoint, newSize, i, j
    return False, None, None, None, None

#Iteratively combines points based on their sizes and distances until no more combinations can be made, returning the new points and sizes after all possible combinations.
def combineAndTransform(errorData): 
    points, sizes = transformPoints(errorData)
    while True: 
        canCombine, newPoint, newSize, i, j = combineOne(points, sizes)
        if canCombine: 
            points.append(newPoint)
            sizes.append(newSize)
            points.pop(max(i, j))
            points.pop(min(i, j))
            sizes.pop(max(i, j))
            sizes.pop(min(i, j))
        else: 
            break
    combinedData = sorted(zip(points, sizes), key=lambda x: x[1], reverse=True)
    combinedPoints, combinedSizes = zip(*combinedData) if combinedData else ([], [])
    return combinedPoints, combinedSizes

#Generates a threshold based on the sizes of the errors, using the median and median absolute deviation (MAD) to determine a robust threshold that is less sensitive to outliers.
#The threshold is calculated as: median + (MAD * mads), where mads is a multiplier that can be adjusted to control the sensitivity of the threshold. A higher mads value will result in a higher threshold, while a lower mads value will result in a lower threshold. The default value of mads is 3, which is a common choice for robust statistics.
def generateThreshold(sizes, mads=3):
    if not sizes:
        return 0
    medianSize = sorted(sizes)[len(sizes) // 2]
    devs = [abs(size - medianSize) for size in sizes]
    mad = sorted(devs)[len(devs) // 2]
    return medianSize + mad * mads