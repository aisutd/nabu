"""Prepare a SMALL, local MultiVSR video subset for the Nabu mouth-motion encoder.

This script does NOT download YouTube videos or the 42-GB MultiVSR archive.
The Hugging Face CSVs contain metadata / frame ranges, NOT video pixels.

From the Nabu repository root:
  python -m pronounciation.preprocess_multivsr inspect --metadata train_minor.csv
  python -m pronounciation.preprocess_multivsr video --file path/to/sample.mp4 --label "sample utterance" --preview
  python -m pronounciation.preprocess_multivsr csv --csv path/to/train_minor.csv --video-root path/to/extracted/clips --limit 20

Output is compatible with Nabu's landmark-based contrastive encoder, but a
MultiVSR row can be a SENTENCE. Downsampling whole sentences to 29 frames is
ONLY a self-supervised pipeline experiment, NOT word-aligned training data.
For true word-level training, segment original face tracks using word timings.
"""

import argparse
import hashlib
import re
from pathlib import Path, PurePosixPath

import cv2
import numpy as np

from .config import ALL_LIP_INDICES
from .preprocess_recordings import normalize_landmarks, resample_sequence, MIN_FRAMES, WORD_FRAMES

REPO_ID = "sindhuhegde/multivsr"
DEFAULT_MODEL = Path(r"C:\NabuData\models\face_landmarker.task")
DEFAULT_OUTPUT = Path(r"C:\NabuData\processed_multivsr")
REQUIRED_COLUMNS = {"file_path", "transcript", "length", "language", "start"}


def resolve_csv(name):
    path = Path(name)
    if path.is_file():
        return path
    # A bare HF filename downloads only that CSV, not the giant metadata tar.
    if path.name != name or not name.endswith(".csv"):
        raise FileNotFoundError(f"CSV not found: {name}")
    from huggingface_hub import hf_hub_download
    return Path(hf_hub_download(repo_id=REPO_ID, filename=name, repo_type="dataset"))


def inspect_csv(args):
    import pandas as pd
    path = resolve_csv(args.metadata)
    sample = pd.read_csv(path, nrows=8)
    print(f"CSV: {path}")
    print(f"Columns: {sample.columns.tolist()}")
    missing = REQUIRED_COLUMNS - set(sample.columns)
    if missing:
        raise ValueError(f"Missing columns: {sorted(missing)}")
    print("\nFirst records:")
    for row in sample.itertuples(index=False):
        print(f"  {row.file_path}  lang={row.language}  start={row.start}  frames={row.length}  text={str(row.transcript)[:100]!r}")
    print("\nNote: CSV contains references and transcripts, NOT MP4 video bytes.")
    print("The 'start' and 'length' values are frame offsets into the extracted face-track clips.")


def safe_stem(value):
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value))[:70].strip("._") or "recording"


def tracked_video_path(root, file_path):
    """Use MultiVSR's safe relative IDs: <YouTube ID>/<track number>.mp4."""
    parts = PurePosixPath(str(file_path).replace("\\", "/")).parts
    if len(parts) != 2 or any(p in ("", ".", "..") for p in parts) or not re.fullmatch(r"[A-Za-z0-9_-]+", parts[0]) or not re.fullmatch(r"[A-Za-z0-9_-]+", parts[1]):
        raise ValueError(f"Unsafe/unexpected MultiVSR file_path: {file_path!r}")
    return root / parts[0] / (parts[1] + ".mp4")


def create_detector(model_path):
    import mediapipe as mp
    if not model_path.is_file():
        raise FileNotFoundError(f"Face Landmarker missing: {model_path}")
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_faces=1,
    )
    return mp.tasks.vision.FaceLandmarker.create_from_options(options)


def process_clip(path, detector, out_dir, label, language, sample_id, start=0, length=None, preview=False, split="train", max_frames=75):
    import mediapipe as mp
    if not path.is_file():
        raise FileNotFoundError(path)
    video = cv2.VideoCapture(str(path))
    if not video.isOpened():
        raise ValueError(f"Cannot open: {path}")
    try:
        fps = video.get(cv2.CAP_PROP_FPS)
        count = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
        if not np.isfinite(fps) or fps <= 0:
            raise ValueError(f"Invalid FPS: {path}")
        start = int(start)
        if start < 0 or start >= count:
            raise ValueError(f"Invalid start frame {start} for {count}-frame video: {path}")
        length = count - start if length is None else int(length)
        if length < MIN_FRAMES or (max_frames and length > max_frames):
            raise ValueError(f"Frame count {length} outside {MIN_FRAMES}..{max_frames or 'unlimited'}")
        if start + length > count:
            raise ValueError(f"Frame range [{start}, {start + length}) exceeds {count} frames: {path}")
        video.set(cv2.CAP_PROP_POS_FRAMES, start)
        raw = []
        times = []
        frame_preview = None
        for i in range(length):
            ok, frame = video.read()
            if not ok:
                raise ValueError(f"Cannot read frame {start + i}: {path}")
            rgb = np.ascontiguousarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = detector.detect(image)
            if not result.face_landmarks:
                raise ValueError(f"Face not found at frame {start + i}: {path}")
            face = result.face_landmarks[0]
            mouth = np.asarray([[face[j].x, face[j].y, face[j].z] for j in ALL_LIP_INDICES], dtype=np.float32)
            if mouth.shape != (40, 3) or not np.isfinite(mouth).all():
                raise ValueError(f"Invalid landmarks at frame {start + i}: {path}")
            raw.append(mouth)
            times.append(round(i * 1000 / fps))
            if preview and i == length // 2:
                frame_preview = frame.copy()
                h, w = frame.shape[:2]
                for x, y, _ in mouth:
                    cv2.circle(frame_preview, (round(float(x) * w), round(float(y) * h)), 2, (0, 0, 255), -1)
    finally:
        video.release()

    raw = np.stack(raw)
    timestamps = np.asarray(times, dtype=np.int64)
    normalized = normalize_landmarks(raw)
    fixed = resample_sequence(normalized, timestamps, WORD_FRAMES)
    if fixed.shape != (29, 40, 3) or not np.isfinite(fixed).all():
        raise ValueError(f"Bad normalized output shape: {fixed.shape}")
    # Distinct filenames for different CSV rows and spoken segments.
    digest = hashlib.sha1(f"{sample_id}|{start}|{length}|{label}".encode("utf-8")).hexdigest()[:10]
    out_dir = out_dir / split
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"{safe_stem(sample_id.replace('/', '_'))}_{start}_{digest}_processed.npz"
    np.savez_compressed(
        target,
        landmarks_normalized=normalized,
        landmarks_raw=raw,
        timestamps_ms=timestamps,
        landmarks_29=fixed,
        label=str(label),
        language=str(language),
        sample_unit="word" if len(str(label).strip().split()) == 1 else "utterance",
        source_dataset="MultiVSR",
        source_file=str(sample_id),
        source_video_id=str(sample_id).split("/")[0],
        split=str(split),
        source_start_frame=int(start),
        original_frame_count=len(raw),
        fps=np.float32(fps),
        skipped=0,
    )
    if frame_preview is not None:
        cv2.imwrite(str(target.with_name(target.name.replace("_processed.npz", "_preview.png"))), frame_preview)
    print(f"Saved {target.name} | text={str(label)[:65]!r} | full={normalized.shape} | fixed={fixed.shape}")
    return target


def run_video(args):
    with create_detector(args.model) as detector:
        process_clip(args.file, detector, args.output_dir, args.label, args.language, args.file.stem, start=args.start,
                     length=args.length, preview=args.preview, split="smoke_test", max_frames=args.max_frames)
    print("Single-video smoke test complete. This is NOT a labeled word-training example if the text contains multiple words.")


def iter_csv(path, chunksize=50000):
    import pandas as pd
    for chunk in pd.read_csv(path, chunksize=chunksize):
        missing = REQUIRED_COLUMNS - set(chunk.columns)
        if missing:
            raise ValueError(f"CSV missing columns: {sorted(missing)}")
        yield from chunk.itertuples(index=False)


def run_csv(args):
    csv_path = resolve_csv(args.csv)
    print(f"CSV: {csv_path}")
    print(f"Local video root: {args.video_root}")
    print("WARNING: MultiVSR rows often describe entire phrases. We are generating a short-clip contrastive baseline, NOT word supervision.")
    processed = 0
    seen = 0
    missing = 0
    rejected = 0
    skipped_lang = 0
    with create_detector(args.model) as detector:
        for row in iter_csv(csv_path):
            seen += 1
            if seen > args.max_rows:
                break
            if args.language != "all" and str(row.language).strip().lower() != args.language:
                skipped_lang += 1
                continue
            label = str(row.transcript).strip()
            if not label:
                rejected += 1
                continue
            if args.words_only and len(label.split()) != 1:
                continue
            try:
                path = tracked_video_path(args.video_root, row.file_path)
            except ValueError as exc:
                print(f"SKIP: {exc}")
                rejected += 1
                continue
            if not path.is_file():
                missing += 1
                continue
            try:
                process_clip(path, detector, args.output_dir, label, row.language, str(row.file_path),
                             start=row.start, length=row.length, split=args.split, preview=args.preview,
                             max_frames=args.max_frames)
                processed += 1
            except (OSError, ValueError, RuntimeError) as exc:
                print(f"SKIP {row.file_path}: {exc}")
                rejected += 1
            if processed >= args.limit:
                break
    print(f"Processed: {processed} | Missing local MP4: {missing} | Rejected: {rejected} | Language filtered: {skipped_lang}")
    if processed == 0:
        print("No clips processed. You must obtain and PREPROCESS actual videos following the MultiVSR authors' workflow.")
        raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser(description="Nabu MultiVSR metadata inspection and landmark preprocessing")
    commands = parser.add_subparsers(dest="command", required=True)
    inspect = commands.add_parser("inspect", help="Inspect a small MultiVSR CSV; downloads ONLY that CSV if given a bare HF filename")
    inspect.add_argument("--metadata", default="val_minor.csv")

    video = commands.add_parser("video", help="Preprocess one LOCALLY AVAILABLE video (diagnostic)")
    video.add_argument("--file", type=Path, required=True)
    video.add_argument("--label", required=True, help="Actual spoken word or utterance text")
    video.add_argument("--language", default="en")
    video.add_argument("--start", type=int, default=0)
    video.add_argument("--length", type=int, default=None)

    csv = commands.add_parser("csv", help="Process rows whose face-track MP4 files already exist locally")
    csv.add_argument("--csv", required=True, help="Local CSV path or bare file name on Hugging Face")
    csv.add_argument("--video-root", type=Path, required=True, help="Root of extracted MultiVSR face-track clips: <youtube_id>/<track>.mp4")
    csv.add_argument("--limit", type=int, default=20, help="Maximum successfully processed rows")
    csv.add_argument("--max-rows", type=int, default=10000, help="Scan at most this many CSV rows")
    csv.add_argument("--language", default="en", help="ISO code, or 'all'")
    csv.add_argument("--split", default="train", choices=["train", "val", "test"])
    csv.add_argument("--words-only", action="store_true", help="Only transcripts of exactly one word; often produces zero rows")

    for p in (video, csv):
        p.add_argument("--model", type=Path, default=DEFAULT_MODEL)
        p.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
        p.add_argument("--preview", action="store_true")
        p.add_argument("--max-frames", type=int, default=75, help="Reject clips longer than this (0 disables; shorter clips fit 29-frame experiments better)")

    args = parser.parse_args()
    if args.command == "inspect":
        inspect_csv(args)
    elif args.command == "video":
        run_video(args)
    else:
        if args.limit <= 0 or args.max_rows <= 0:
            parser.error("--limit and --max-rows must be positive")
        run_csv(args)


if __name__ == "__main__":
    main()
