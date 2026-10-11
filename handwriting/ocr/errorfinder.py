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
        return [(0, 0)] * len(data)

    #Normalize the points to the range [0, 1] and return them along with the original bounding box
    return [( (point[0] - minX) / width, (point[1] - minY) / height ) for point in data], (minX, minY, width, height)

#Warning, this is O(M*N) where M is the number of points in the text SVG and N is the number of points in the expected text.
def findError(textSvg, expected):
    #Extract and normalize the points from the text SVG and the expected text
    textPoints, normSize = normalize(extractSvgPoints(textSvg))
    expectedPoints, _ = normalize(extractTextPoints(expected))

    #Find the point in the text SVG that is furthest from any point in the expected text
    maxDist = 0
    maxPoint = None
    for textPoint in textPoints:
        minDist = min((textPoint[0] - exp[0])**2 + (textPoint[1] - exp[1])**2 for exp in expectedPoints)
        if minDist > maxDist:
            maxDist = minDist
            maxPoint = textPoint
    #Find the point in the expected text that is furthest from any point in the text SVG
    for expectedPoint in expectedPoints:
        minDist = min((expectedPoint[0] - text[0])**2 + (expectedPoint[1] - text[1])**2 for text in textPoints)
        if minDist > maxDist:
            maxDist = minDist
            maxPoint = expectedPoint

    #Renormalize maxPoint so that it accurately reflects where the error occurred in the original coordinate space
    maxPoint = (maxPoint[0] * normSize[2] + normSize[0], maxPoint[1] * normSize[3] + normSize[1]) if maxPoint else None

    #Ellipse to show problem can be rendered at center maxPoint with w=maxDist*normSize[2] and h=maxDist*normSize[3]
    #Returns None, 0, (0, 0, 0, 0) if there is an error
    return maxPoint, math.sqrt(maxDist), normSize