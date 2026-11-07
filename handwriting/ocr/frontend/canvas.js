const inputCanvas = document.getElementById("myCanvas");
const inputContext = inputCanvas.getContext("2d");
const expectedCanvas = document.getElementById("expectedCanvas");
const expectedContext = expectedCanvas.getContext("2d");
let inputImage = null;
let errorData = null;
let expectedCharacter = document.getElementById("expected").value;

function drawCircles(context, points, sizes) {
  if (!Array.isArray(points) || !Array.isArray(sizes)) return;

  context.strokeStyle = "red";
  //Scale the outline with the image so it stays visible when a large photo is shrunk to fit the page
  context.lineWidth = Math.max(2, context.canvas.width / 150);
  for (let i = 0; i < Math.min(points.length, sizes.length); i++) {
    const [x, y] = points[i];
    const size = sizes[i];
    if (![x, y, size].every(Number.isFinite) || size <= 0) continue;

    context.beginPath();
    context.arc(x, y, size / 2, 0, 2 * Math.PI);
    context.stroke();
  }
}

function renderComparison() {
  if (!inputImage) return;

  for (const canvas of [inputCanvas, expectedCanvas]) {
    if (canvas.width !== inputImage.naturalWidth || canvas.height !== inputImage.naturalHeight) {
      canvas.width = inputImage.naturalWidth;
      canvas.height = inputImage.naturalHeight;
    }
  }

  inputContext.clearRect(0, 0, inputCanvas.width, inputCanvas.height);
  inputContext.drawImage(inputImage, 0, 0);

  expectedContext.fillStyle = "#fff";
  expectedContext.fillRect(0, 0, expectedCanvas.width, expectedCanvas.height);

  const bounds = errorData?.bounds;
  if (Array.isArray(bounds) && bounds.length === 4 && bounds.every(Number.isFinite)
      && bounds[2] > 0 && bounds[3] > 0 && expectedCharacter) {
    const [left, top, width, height] = bounds;
    expectedContext.font = "100px Arial, sans-serif";
    expectedContext.textAlign = "left";
    expectedContext.textBaseline = "alphabetic";
    expectedContext.fillStyle = "#111";
    const metrics = expectedContext.measureText(expectedCharacter);
    const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    if (metrics.width > 0 && glyphHeight > 0) {
      const [left, top, side] = bounds;                                   //bounds is now a square: width == height == side
      const inkWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
      const scale = side / Math.max(inkWidth, glyphHeight);               //one scale for both axes, like the backend
      //Center the scaled glyph inside the square
      const offsetX = left + (side - inkWidth * scale) / 2;
      const offsetY = top + (side - glyphHeight * scale) / 2;
      expectedContext.save();
      expectedContext.translate(offsetX, offsetY);
      expectedContext.scale(scale, scale);
      //x = actualBoundingBoxLeft puts the glyph's left edge at 0, and y = ascent puts its top edge at 0
      expectedContext.fillText(expectedCharacter, metrics.actualBoundingBoxLeft, metrics.actualBoundingBoxAscent);
      expectedContext.restore();

    }
  } else if (expectedCharacter) {
    expectedContext.font = `${Math.max(16, Math.round(expectedCanvas.height * 0.7))}px Arial, sans-serif`;
    expectedContext.textAlign = "center";
    expectedContext.textBaseline = "middle";
    expectedContext.fillStyle = "#111";
    expectedContext.fillText(expectedCharacter, expectedCanvas.width / 2, expectedCanvas.height / 2);
  }

  if (errorData) {
    drawCircles(inputContext, errorData.points, errorData.sizes);
    drawCircles(expectedContext, errorData.points, errorData.sizes);
  }

  //Say what happened, since clean handwriting produces no circles and would otherwise look like nothing ran
  const explanation = document.getElementById("errorExplanation");
  if (explanation) {
    const count = Array.isArray(errorData?.points) ? errorData.points.length : 0;
    if (!errorData) explanation.textContent = "";
    else if (count === 0) explanation.textContent = "No errors marked. No substantial outliers found between the expected and actual handwriting.";
    else explanation.textContent = `${count} error${count === 1 ? "" : "s"} circled in red.`;
  }
}

document.getElementById("file").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  errorData = null;
  const image = new Image();
  image.onload = () => {
    inputImage = image;
    renderComparison();
    URL.revokeObjectURL(image.src);
  };
  image.src = URL.createObjectURL(file);
});

document.getElementById("expected").addEventListener("input", (event) => {
  expectedCharacter = event.target.value;
  renderComparison();
});

window.addEventListener("findErrorDataReceived", (event) => {
  const [points, sizes, bounds] = event.detail.responseData;
  expectedCharacter = event.detail.expected;
  errorData = { points, sizes, bounds };
  renderComparison();
});