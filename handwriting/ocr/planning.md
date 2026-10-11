Make svg -> AABB mapped 0-1 floats for x and y positions of strokes
Make AABB + training data -> model for stroke means, std errors
Make checker for AABB + model -> stroke correct?
Check into library pandas

Handwriting error finder: 
font -> svg
image -> svg
aggregate and transform all data points into global points, scaling 0-1 for x and y
find point in font where the nearest matching point in image is the furthest distance away
find point in image where the nearest matching point in font is the furthest distance away
take max of these
there is your worst problem point, return to user

for storing font svgs, take input 'this is what it should be' character as char, convert to svg