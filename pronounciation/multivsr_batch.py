from __future__ import annotations

import argparse
import csv
import hashlib
import sys
import math
import pickle
import re
import shutil
import subprocess
from collections import OrderedDict
from pathlib import Path

import cv2
import numpy as np

from .config import ALL_LIP_INDICES
from .preprocess_recordings import normalize_landmarks, resample_sequence

ROOT = Path(r"C:\NabuData\MultiVSR")
DEFAULT_CSV = Path(r"C:\NabuData\MultiVSR\metadata\train_major.csv")
DEFAULT_ARCHIVE = ROOT / "metadata" / "multivsr.tar"
DEFAULT_ORIGINALS = ROOT / "originals"
DEFAULT_TRACKS = ROOT / "metadata" / "multivsr"
DEFAULT_PROCESSED = Path(r"C:\NabuData\processed_multivsr")
DEFAULT_MODEL = Path(r"C:\NabuData\models\face_landmarker.task")
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
TRACK_ID = re.compile(r"^\d{5}$")


def run_command(command: list[str], quiet=False):
    if not quiet:
        print("COMMAND:", " ".join(map(str, command)), flush=True)
    result = subprocess.run(command, stdout=subprocess.DEVNULL if quiet else None, stderr=subprocess.DEVNULL if quiet else None, check=False)
    return result.returncode == 0


def resolve_training_csv(path: Path):
    if path.is_file():
        return path
    if path == DEFAULT_CSV:
        # User previously downloaded this large CSV; hf_hub_download reuses its cache.
        from huggingface_hub import hf_hub_download
        print("Local train_major.csv not found; resolving Hugging Face cached copy...", flush=True)
        return Path(hf_hub_download(repo_id="sindhuhegde/multivsr", filename="train_major.csv", repo_type="dataset"))
    raise FileNotFoundError(f"CSV not found: {path}")


def pick_tracks(csv_file: Path, start_source: int, candidates: int, tracks_per_source: int):
    """Read only enough train-major CSV rows to choose a small, bounded source batch.

    CSV order is not randomized: run with a different --source-start to cover new IDs.
    """
    videos = OrderedDict()
    with csv_file.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        required = {"file_path", "language"}
        if not required.issubset(set(reader.fieldnames or [])):
            raise ValueError(f"CSV missing {required - set(reader.fieldnames or [])}: {csv_file}")
        for row in reader:
            if str(row["language"]).strip().lower() != "en":
                continue
            parts = str(row["file_path"]).strip().split("/")
            if len(parts) != 2 or not VIDEO_ID.fullmatch(parts[0]) or not TRACK_ID.fullmatch(parts[1]):
                continue
            source, track = parts
            if source not in videos:
                videos[source] = []
            if track not in videos[source] and len(videos[source]) < tracks_per_source:
                videos[source].append(track)
            if len(videos) >= start_source + candidates:
                break
    return list(videos.items())[start_source:start_source + candidates]


def extract_metadata(archive: Path, tracks_root: Path, selected: list[tuple[str, list[str]]]):
    """Single TAR scan for ONLY selected .txt and .pckl members, not full unpack."""
    root = tracks_root.parent
    wanted = []
    for source, track_ids in selected:
        for track in track_ids:
            for suffix in ("pckl", "txt"):
                if not (tracks_root / source / f"{track}.{suffix}").is_file():
                    wanted.append(f"multivsr/{source}/{track}.{suffix}")
    if not wanted:
        print("All selected metadata pairs already extracted.", flush=True)
        return
    if not archive.is_file():
        raise FileNotFoundError(f"Metadata archive missing: {archive}")
    root.mkdir(parents=True, exist_ok=True)
    # bsdtar supplied with Windows has built-in TAR support. Ignore errors for
    # unavailable individual paths; verify actual files afterward.
    print(f"Extracting {len(wanted)} selected archive members (scans archive once; 42 GB TAR stays intact).", flush=True)
    ok = run_command(["tar", "-xf", str(archive), "-C", str(root), *wanted])
    if not ok:
        print("TAR reported missing members; checking available pairs individually.", flush=True)


def download_video(source: str, originals: Path):
    output = originals / f"{source}.mp4"
    if output.is_file() and output.stat().st_size > 10000:
        return output
    try:
        import yt_dlp  # noqa: F401  (invoke through this Python interpreter)
    except ImportError as exc:
        raise RuntimeError("yt-dlp missing. Install: python -m pip install -U yt-dlp") from exc
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg missing on PATH; install ffmpeg and restart CMD")
    originals.mkdir(parents=True, exist_ok=True)
    cmd = [sys.executable, "-m", "yt_dlp", "--no-playlist", "--merge-output-format", "mp4", "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b", "-o", str(output), f"https://www.youtube.com/watch?v={source}"]
    if not run_command(cmd):
        print(f"DOWNLOAD FAILED {source}: could be unavailable, private, region restricted or rate limited.", flush=True)
        return None
    return output if output.exists() and output.stat().st_size > 10000 else None


def convert_fps(source_path: Path, dest: Path, fps: int = 25):
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg missing on PATH")
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", str(source_path), "-an", "-r", str(fps), "-c:v", "libx264", "-preset", "veryfast", "-crf", "24", "-pix_fmt", "yuv420p", str(dest)]
    if not run_command(cmd, quiet=True) or not dest.is_file() or dest.stat().st_size < 10000:
        raise RuntimeError(f"ffmpeg failed to normalize to {fps}fps: {source_path}")


def parse_word_timings(path: Path, min_score: float, min_seconds: float, max_seconds: float):
    words = []
    # Metadata uses UTF-8, though 'type' under a Windows code page can garble it.
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        match = re.match(r"^\s*(.+?),\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+)\s*$", line)
        if not match:
            continue
        word, start, end, score = match.groups()
        start, end, score = float(start), float(end), float(score)
        if score < min_score or not min_seconds <= (end - start) <= max_seconds:
            continue
        word = word.strip().strip("\"'.,;:!?()[]{}")
        if not word or " " in word or len(word) > 40:
            continue
        words.append((word, start, end, score))
    return words


def load_track(path: Path):
    # WARNING: pickle can execute code. Only load the official, trusted archive.
    with path.open("rb") as stream:
        track = pickle.load(stream)
    if not isinstance(track, dict) or "frame" not in track or "bbox" not in track:
        raise ValueError(f"Unexpected face-track pickle structure: {path}")
    frames = np.asarray(track["frame"], dtype=np.int64).reshape(-1)
    bbox = np.asarray(track["bbox"], dtype=np.float64)
    if bbox.ndim != 2 or bbox.shape[1] != 4 or len(bbox) < 3:
        raise ValueError(f"Invalid bbox shape {bbox.shape}: {path}")

    # Official MultiVSR tracks can store `frame` as [first, last] (INCLUSIVE),
    # while `bbox` contains one box for every frame in that range.  For example,
    # [0, 11055] corresponds to exactly 11056 bounding boxes.  Other tracks
    # may contain an explicit frame number for each bounding box.
    if len(frames) == 2 and frames[1] >= frames[0] and int(frames[1] - frames[0] + 1) == len(bbox):
        frames = np.arange(int(frames[0]), int(frames[1]) + 1, dtype=np.int64)
    elif len(frames) != len(bbox):
        raise ValueError(f"Frame spec {frames.shape} and bbox {bbox.shape} mismatch: {path}")

    if (np.diff(frames) <= 0).any() or (frames < 0).any() or not np.isfinite(bbox).all():
        raise ValueError(f"Invalid face tracking data: {path}")
    # Official crop implementation smooths center and scale with a 13-frame median filter.
    from scipy.signal import medfilt
    center_x = medfilt((bbox[:, 0] + bbox[:, 2]) / 2, kernel_size=13)
    center_y = medfilt((bbox[:, 1] + bbox[:, 3]) / 2, kernel_size=13)
    scale = medfilt(np.maximum(bbox[:, 2] - bbox[:, 0], bbox[:, 3] - bbox[:, 1]) / 2, kernel_size=13)
    return frames, center_x, center_y, scale


def crop_face(image, cx: float, cy: float, bs: float):
    cs = 0.4
    if not math.isfinite(bs) or not (3 <= bs <= 10000):
        raise ValueError(f"Invalid face crop radius: {bs}")
    pad = int(bs * (1 + 2 * cs))
    padded = cv2.copyMakeBorder(image, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(110, 110, 110))
    mx, my = cx + pad, cy + pad
    # Match reference dataset/preprocess.py: square-ish crop from smoothed face boxes.
    x0, x1 = int(mx - bs * (1 + cs)), int(mx + bs * (1 + cs))
    y0, y1 = int(my - bs), int(my + bs * (1 + 2 * cs))
    x0, y0 = max(0, x0), max(0, y0)
    face = padded[y0:y1, x0:x1]
    if face.size == 0:
        raise ValueError("Empty face crop")
    return cv2.resize(face, (224, 224), interpolation=cv2.INTER_LINEAR)


def create_detector(model_path: Path):
    import mediapipe as mp
    if not model_path.is_file():
        raise FileNotFoundError(f"Missing MediaPipe detector: {model_path}")
    options = mp.tasks.vision.FaceLandmarkerOptions(base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)), running_mode=mp.tasks.vision.RunningMode.IMAGE, num_faces=1)
    return mp.tasks.vision.FaceLandmarker.create_from_options(options)


def output_path(out_root: Path, split: str, source: str, track: str, word: str, start: float):
    digest = hashlib.sha1(f"{source}/{track}:{start:.4f}:{word}".encode("utf-8")).hexdigest()[:10]
    return out_root / split / f"{source}_{track}_{round(start*1000):06d}_{digest}_processed.npz"


def process_track(video, detector, source, track_id, txt_path, pckl_path, out_root, limit_words, min_score, max_seconds, min_seconds):
    import mediapipe as mp
    frames, cx, cy, scales = load_track(pckl_path)
    words = parse_word_timings(txt_path, min_score, min_seconds, max_seconds)
    if not words:
        print(f"{source}/{track_id}: no suitable word timings")
        return 0
    # Keep an entire source video in a single split (no video-level train/val leakage).
    split = "val" if int(hashlib.sha1(source.encode()).hexdigest()[:8], 16) % 5 == 0 else "train"
    saved, attempted = 0, 0
    for word, start, end, score in words:
        if saved >= limit_words:
            break
        dest = output_path(out_root, split, source, track_id, word, start)
        if dest.exists():
            saved += 1
            continue
        # The timestamp is relative to the face track, NOT the original full MP4.
        first = max(0, int(math.floor(start * 25)))
        last = min(len(frames) - 1, int(math.ceil(end * 25)) - 1)
        if last - first + 1 < 3:
            continue
        positions = np.unique(np.linspace(first, last, min(29, last - first + 1)).round().astype(int))
        points = []
        attempted += 1
        failed = False
        for pos in positions:
            video.set(cv2.CAP_PROP_POS_FRAMES, int(frames[pos]))
            ok, image = video.read()
            if not ok:
                failed = True
                break
            try:
                cropped = crop_face(image, float(cx[pos]), float(cy[pos]), float(scales[pos]))
                rgb = np.ascontiguousarray(cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB))
                result = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
                if not result.face_landmarks:
                    failed = True
                    break
                lip = np.asarray([[result.face_landmarks[0][i].x, result.face_landmarks[0][i].y, result.face_landmarks[0][i].z] for i in ALL_LIP_INDICES], dtype=np.float32)
                if lip.shape != (40, 3) or not np.isfinite(lip).all():
                    failed = True
                    break
                points.append(lip)
            except (ValueError, cv2.error):
                failed = True
                break
        if failed or len(points) < 3:
            continue
        raw = np.stack(points)
        timestamps = np.asarray(positions, dtype=np.int64) * 40  # 25 fps standardized source
        try:
            normal = normalize_landmarks(raw)
            fixed = resample_sequence(normal, timestamps, 29)
            if fixed.shape != (29, 40, 3) or not np.isfinite(fixed).all():
                continue
        except (ValueError, FloatingPointError):
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(dest, landmarks_29=fixed.astype(np.float32), label=word, source_dataset="MultiVSR", language="en", sample_unit="word", source_video_id=source, source_file=f"{source}/{track_id}", start_seconds=np.float32(start), end_seconds=np.float32(end), alignment_score=np.float32(score))
        saved += 1
    print(f"{source}/{track_id}: {saved} words available, {attempted} new word attempts; split={split}", flush=True)
    return saved


def main():
    p = argparse.ArgumentParser(description="MultiVSR original videos + 42GB metadata -> word-aligned Nabu NPZ")
    p.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    p.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    p.add_argument("--originals", type=Path, default=DEFAULT_ORIGINALS)
    p.add_argument("--tracks-root", type=Path, default=DEFAULT_TRACKS)
    p.add_argument("--out", type=Path, default=DEFAULT_PROCESSED)
    p.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    p.add_argument("--work-dir", type=Path, default=ROOT / "work")
    p.add_argument("--source-start", type=int, default=0, help="Source offset; increase to process later videos")
    p.add_argument("--source-count", type=int, default=10, help="Successful video sources to aim for")
    p.add_argument("--candidates", type=int, default=35, help="Maximum unique sources to examine, including unavailable YouTube IDs")
    p.add_argument("--tracks-per-source", type=int, default=2)
    p.add_argument("--words-per-track", type=int, default=30)
    p.add_argument("--min-score", type=float, default=0.80)
    p.add_argument("--min-seconds", type=float, default=0.15)
    p.add_argument("--max-seconds", type=float, default=1.50)
    p.add_argument("--download", action="store_true", help="Download missing English source videos using yt-dlp")
    p.add_argument("--keep-downloaded", action="store_true", help="Compatibility option; this script always preserves original videos")
    p.add_argument("--no-extract", action="store_true", help="Only use metadata pairs that are already extracted")
    args = p.parse_args()
    if args.source_count < 1 or args.candidates < 1 or args.tracks_per_source < 1 or args.words_per_track < 1:
        p.error("source-count, candidates, tracks-per-source, and words-per-track must be positive")
    if args.candidates < args.source_count:
        p.error("--candidates must be at least --source-count")
    if args.source_start < 0:
        p.error("--source-start must be >= 0")
    try:
        csv_file = resolve_training_csv(args.csv)
    except (OSError, ImportError) as exc:
        p.error(str(exc))
    selected = pick_tracks(csv_file, args.source_start, args.candidates, args.tracks_per_source)
    print(f"Selected {len(selected)} candidate English source videos. Target: {args.source_count}", flush=True)
    if not selected:
        raise SystemExit("No matching English CSV rows")
    if not args.no_extract:
        extract_metadata(args.archive, args.tracks_root, selected)
    total, sources = 0, 0
    with create_detector(args.model) as detector:
        for source, tracks in selected:
            existing = args.originals / f"{source}.mp4"
            valid_tracks = [(t, args.tracks_root / source / f"{t}.txt", args.tracks_root / source / f"{t}.pckl") for t in tracks]
            valid_tracks = [(t, txt, pckl) for t, txt, pckl in valid_tracks if txt.is_file() and pckl.is_file()]
            if not valid_tracks:
                print(f"SKIP {source}: no matching face-track metadata", flush=True)
                continue
            original = existing if existing.is_file() and existing.stat().st_size > 10000 else None
            if original is None and args.download:
                original = download_video(source, args.originals)
            if original is None:
                print(f"SKIP {source}: original MP4 missing (add --download)", flush=True)
                continue
            standardized = args.work_dir / f"{source}_25fps.mp4"
            try:
                convert_fps(original, standardized)
                video = cv2.VideoCapture(str(standardized))
                try:
                    if not video.isOpened():
                        raise ValueError(f"Cannot read standardized video {standardized}")
                    video_total = 0
                    for track, txt, pckl in valid_tracks:
                        try:
                            video_total += process_track(video, detector, source, track, txt, pckl, args.out, args.words_per_track, args.min_score, args.max_seconds, args.min_seconds)
                        except (ValueError, RuntimeError, IndexError, OSError, EOFError, pickle.UnpicklingError) as exc:
                            print(f"SKIP TRACK {source}/{track}: {exc}", flush=True)
                finally:
                    video.release()
                if video_total:
                    sources += 1
                    total += video_total
                    print(f"PROGRESS: {sources} video sources / {total} word recordings", flush=True)
            except (RuntimeError, OSError, ValueError) as exc:
                print(f"SKIP VIDEO {source}: {exc}", flush=True)
            finally:
                standardized.unlink(missing_ok=True)
                # Preserve originals unless user explicitly manages them; the source files
                # may be needed to debug or extend word extraction in a future run.
            if sources >= args.source_count:
                break
    print(f"COMPLETE: {sources} successful sources; {total} existing/new processed words; NPZ output: {args.out}", flush=True)
    if sources == 0:
        raise SystemExit("No videos processed. Check yt-dlp/ffmpeg, TAR members, and original video availability.")


if __name__ == "__main__":
    main()

