# Nabu

Nabu is a language-learning prototype with English lessons, reusable speaking activities, and experimental mouth-movement analysis. It also includes a separate handwriting/OCR API and tester. The web app uses a shared cookie-inspired theme with Nunito body text and Fredoka headings.

## What works today

| Area | Current implementation |
| --- | --- |
| Learning interface | Responsive React app with Learn, Lessons, Pronunciation, ASL, Handwriting, Profile, and Settings navigation. |
| English lessons | Picture matching, contextual word meanings, sentence-building tiles, and a pronunciation lesson using **bad, back, bail, June, and Kent**. |
| Lesson progress | Answer checking, retries, summaries, and same-browser resume through `localStorage`. In “Say it aloud,” Continue requires a recognized-word match; Skip remains available. |
| Speaking activities | Video or microphone-only recording, uploads, visible/hidden references, expected-word or sentence checks, free-response transcription, feedback, and retry. |
| Pronunciation analysis | Whisper transcription, MediaPipe lip landmarks, geometric comparison with dynamic time warping, feedback, plots, and a PyTorch mouth-motion encoder. |
| Handwriting tools | Separate FastAPI image-upload endpoints for PaddleOCR text recognition and geometric handwriting error detection, plus a browser tester. |
| Native projects | Capacitor Android and iOS wrappers for the built web app. |

The React handwriting and ASL pages and their lesson activities are **placeholders**. The handwriting backend is available separately; it is not wired into those React pages. Profile and Settings are placeholders too. There is no account authentication, database-backed learner history, or cross-device progress sync yet.

**Model interpretation:** the neural encoder returns experimental embedding similarity, not pronunciation accuracy or a percentage. Transcription matches indicate recognized words matched the prompt; they do not establish phonetic accuracy. Lesson completion is not a validated pronunciation grade.

## Technology

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, browser MediaRecorder/Fetch APIs, ESLint.
- **Mobile wrappers:** Capacitor 8.
- **Backend:** Python, FastAPI, Uvicorn, FFmpeg.
- **Speaking/vision:** faster-whisper, MediaPipe, OpenCV, NumPy, Matplotlib, PyTorch.
- **Handwriting:** PaddleOCR/PaddlePaddle, Pillow, SciPy, svgpathtools, bundled Noto fonts.

PostgreSQL, Supabase, GPT, and ElevenLabs are not required by the current workflows.

## Local setup

Run Python commands from the **repository root**. The package directory is spelled **`pronounciation`**; preserve that spelling in commands and imports.

### Prerequisites

- Python with `venv` and pip. Local development has used Python 3.12; availability of the pinned ML packages depends on your platform and Python version.
- Node.js **22.12+** in the 22.x line, or a newer compatible LTS release, and npm. This covers the installed Vite and Capacitor CLI engine requirements.
- FFmpeg on `PATH`, including the `libx264` encoder.
- A browser with MediaRecorder support. Recording needs **localhost or HTTPS** and camera/microphone permission.

For missing system tools on macOS with Homebrew:

```bash
brew install python node git ffmpeg
```

Check the tools:

```bash
python3 --version
node --version
npm --version
ffmpeg -version
ffmpeg -encoders
```

FFmpeg and Node are system tools; installing `requirements.txt` does not install them.

### Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

cd UI
npm ci
cd ..
```

On Windows, activate the environment with `.venv\Scripts\Activate.ps1` in PowerShell instead of `source`.

The Python requirements cover both pronunciation and handwriting, including their ML dependencies. A fresh install of the complete pinned environment has not been verified on every platform. The file currently includes both `opencv-python` and `opencv-contrib-python`, which share the `cv2` namespace.

### Required model and reference assets

| Asset | Expected location | Notes |
| --- | --- | --- |
| MediaPipe face landmarker | `pronounciation/models/face_landmarker.task` | Required for mouth analysis; excluded from Git. |
| MediaPipe face detector | `pronounciation/models/blaze_face_full_range.tflite` | Required for mouth analysis; excluded from Git. |
| Neural checkpoint | `pronounciation/nabu_multivsr_overnight_b0050.pt` | Included in this repository; select it with the environment variable below. |
| Demo reference videos | `pronounciation/test_data/video/` | Local data, excluded from Git; obtain separately. |

A fresh clone does **not** supply the ignored MediaPipe assets or reference videos. Obtain the assets from the project/model source and place them at the paths above. Normal multiple-choice and sentence lessons do not need them.

The current reference catalog expects these browser-compatible files:

```text
bad_browser.mp4
back_browser.mp4
bail_browser.mp4
june_browser.mp4
Kent_browser.mp4
```

Only installed reference files appear in the practice library. The current demo clips are silent visual references and are labeled accordingly; conversion cannot add missing audio.

To convert an existing clip while preserving any audio, replace the example filenames below:

```bash
ffmpeg -n -i input.mp4 -map 0:v:0 -map '0:a:0?' \
  -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart output_browser.mp4
```

Whisper may download `small.en` on first transcription. PaddleOCR initializes its English model when its API starts and may need a model download. Allow network access, disk space, and startup time for those downloads.

## Run the web app

### Terminal 1: pronunciation and shared speaking backend

From the repository root:

```bash
source .venv/bin/activate
export NABU_MOUTH_CHECKPOINT="$PWD/pronounciation/nabu_multivsr_overnight_b0050.pt"
python -m uvicorn pronounciation.api:app --reload --port 8000
```

The explicit checkpoint setting is important: the backend's fallback path is Windows-specific. Set the variable before starting Uvicorn and restart the backend after changing checkpoints.

- API documentation: <http://127.0.0.1:8000/docs>
- Model loading/status: <http://127.0.0.1:8000/models/mouth>
- Installed reference catalog: <http://127.0.0.1:8000/practice>

Compatible neural checkpoints require `training_mode="multivsr-finetune"`, input shape `(29, 40, 3)`, and matching `MouthEncoder` weights. Baseline checkpoints from `mouth_training.py` use different training modes and are not accepted by the API as currently written.

### Terminal 2: frontend

```bash
cd UI
npm run dev
```

Open the URL Vite prints, normally <http://localhost:5173>.

- `#/home`: learning homepage.
- `#/lesson`: English lesson hub and saved progress.
- `#/lesson/say-it-aloud`: pronunciation lesson.
- `#/pronunciation`: standalone practice lab with diagnostic output.

Normal lessons run without the Python backend. Speaking reviews require it. Vite proxies `/speaking`, `/practice`, `/recordings`, `/comparisons`, and `/media` to port 8000. Keep both servers running; use Ctrl+C to stop them.

## Speaking workflow and reuse

```text
Exercise prompt → record/upload → shared speaking API
  ├─ transcription and optional expected-text matching
  ├─ geometric mouth comparison, when supported
  └─ experimental neural similarity, when supported
→ combined feedback → retry, continue, or explicit lesson skip
```

Use the shared component in other exercises:

```tsx
import SpeakingActivity from './components/speaking/SpeakingActivity'

<SpeakingActivity
  exerciseId="say-back"
  capture="video"
  showReference={false}
  onComplete={(result) => {
    // The parent lesson owns saving progress and deciding when to continue.
    console.log(result)
  }}
/>
```

Server-owned exercise answers are defined in `pronounciation/speaking.py`. Hiding the reference affects presentation, not backend reference selection. Audio-only activities request no camera access. Free-response activities have no expected answer and return `match: null`.

The neural path supports isolated-word video clips up to five seconds, with a detectable mouth at every sampled frame. The default single-word video capture stops around 4.5 seconds. Audio-only tasks, sentences, unknown-reference words, and free speech explicitly skip unsupported mouth checks. Failed checks preserve other available results; completion callbacks may contain partial results.

See the [speaking integration guide](UI/src/components/speaking/README.md) for all props, result handling, sentence/free-response examples, and parent reset callbacks.

### Main API routes

| Routes | Purpose |
| --- | --- |
| `POST /speaking/recordings`, `POST /speaking/review` | Shared audio/video upload, task resolution, analysis, and feedback. |
| `GET /speaking/exercises/{exercise_id}` | Server-owned exercise configuration. |
| `GET /practice`, `GET /practice/{word}/video` | Installed reference library and previews. |
| `POST /recordings`, `POST /recordings/{recording_id}/transcription` | Standalone video upload and expected-text check. |
| `POST /comparisons`, `POST /comparisons/neural` | Geometric/combined or neural-only comparisons. |
| `POST /practice/review` | Earlier combined practice-review API, retained for compatibility. |
| `GET /models/mouth`, `GET /media/...` | Model metadata and generated media. |

Use `/docs` for the exact fields and response shapes.

## Run the handwriting API and tester

This is a **separate service**, not the React handwriting page. From the repository root:

```bash
source .venv/bin/activate
python -m uvicorn api:app --app-dir handwriting/ocr --port 8001
```

- Tester: <http://127.0.0.1:8001/tester/>
- API documentation: <http://127.0.0.1:8001/docs>

The backend serves `handwriting/ocr/frontend/index.html` directly; no npm server is required for this tester. Use its HTTP URL instead of opening the HTML file directly. The directory also contains a separate `canvas.js` helper; merely placing a script beside HTML does not load it.

Upload a handwriting image and test `POST /ocr/text`, `POST /ocr/tuple`, or `POST /ocr/errorfinder/findError`. The error finder compares image/SVG ink points with expected text rendered using bundled fonts. Start without `--reload`: this API has custom Paddle signal/shutdown handling.

If startup reports `No module named 'paddle'`, install the **`paddlepaddle`** distribution into the same active Python environment; the import and package names differ. Confirm the remaining handwriting dependencies were installed from `requirements.txt` too.

## Checks

Frontend, from `UI/`:

```bash
npm run test:lessons
npm run lint
npm run build
```

Backend, from the repository root in the activated environment:

```bash
python -m unittest discover -s tests -p 'test_*.py'
```

Backend tests cover feedback, partial failures, references, audio normalization, and shared speaking behavior. Frontend tests cover lesson content/progress and speaking continuation versus explicit skipping. Tests using mocked analysis do not validate neural model quality or replace real browser camera/microphone testing.

## Desktop recording and model development

Desktop collection requires a camera, microphone, and a graphical environment for OpenCV windows:

```bash
python -m pronounciation.test_webcam
python -m pronounciation.compare --help
```

The collector saves labeled landmarks, WAV audio, and MP4 video under `pronounciation/test_data/`. Desktop recording IDs are integers; API upload IDs are UUIDs. `check_confidence.py` and `view_trim.py` review collected recordings. FFmpeg converts saved audiovisual recordings to H.264/AAC for browser playback.

Model/data tooling includes:

- `preprocess_recordings.py`, `export_csv.py`, `export_normalized_csv.py`: older NPZ normalization/resampling and CSV exports. The live recorder's `dataset.csv` is not a direct input to that NPZ workflow.
- `preprocess_hug_landmarks.py`, `preprocess_hug.py`, `huggingFaceTest.py`: Hugging Face metadata, video, and landmark experiments.
- `preprocess_multivsr.py`, `preprocess_multi.py`, `multivsr_batch.py`, `download_videos.py`: MultiVSR processing, source downloading, and ingestion utilities.
- `mouth_training.py`: BiGRU encoder, contrastive training, and embedding comparison.
- `train_multivsr.py`, `overnight_multivsr.py`: MultiVSR fine-tuning and incremental ingestion/training orchestration.
- `repair_nabu_after_training.py`, `repair_nabu_overnight_state.py`: research-state repair utilities; inspect paths and intended changes before running them.

Training/download scripts have dataset-specific inputs and, in several cases, Windows-specific defaults. Inspect each script's arguments and local paths before running it. Optional source downloading uses `yt-dlp`, which is not included in the main requirements; the legacy downloader also imports `executor`. These research dependencies are not needed to use the lesson frontend or run a provided checkpoint.

Detailed commands and data formats are in [notes.txt](notes.txt) and [pronounciation/file and roles.txt](pronounciation/file%20and%20roles.txt).

## Production and native builds

```bash
cd UI
npm run build
npm run preview
```

`preview` serves the built frontend locally. Set `VITE_API_BASE_URL` to a reachable backend **before building**, and configure the backend's comma-separated `NABU_ALLOWED_ORIGINS` for the frontend origin. The development proxy is not included in the production build. `UI/.env.production` is local/ignored; don't assume another checkout has it. Fonts load through Google Fonts with system fallbacks.

For native wrappers, after building in `UI/`:

```bash
npx cap sync android
npx cap open android
# On macOS with Xcode:
npx cap sync ios
npx cap open ios
```

Android needs Android Studio, its SDK, and a compatible JDK; iOS needs Xcode. Native apps must reach a backend address accessible from the device—localhost on a phone is the phone itself.

The root `docker-compose.yml` currently starts a placeholder Alpine container only. `docker compose up -d` does **not** start the APIs or Vite app.

## Repository map

```text
UI/
  src/pages/                 Homepage, lesson routing, and feature pages
  src/components/lessons/    Lesson hub, questions, previews, and summaries
  src/components/speaking/   Reusable recording/review/retry UI
  src/data/                  English lesson content and saved-progress rules
  src/hooks/                 Speaking, practice, and lesson state
  src/api/                   Typed backend clients
  src/index.css              Shared theme tokens and typography
  tests/                     Lesson tests
  android/, ios/             Capacitor native projects
pronounciation/              Speaking API, tracking, analysis, and training tools
handwriting/ocr/             OCR API, error finder, fonts, and separate tester
tests/                       Python API/workflow tests
requirements.txt             Python dependencies
notes.txt                    Detailed development notes and run guides
```
