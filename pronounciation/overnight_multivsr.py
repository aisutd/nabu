from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(r"C:\NabuData\MultiVSR")
DATA = Path(r"C:\NabuData\processed_multivsr")
MODELS = Path(r"C:\NabuData\models")
DEFAULT_INIT = MODELS / "nabu_multivsr_finetuned.pt"
DEFAULT_STATE = ROOT / "overnight_state.json"
DEFAULT_LOG = ROOT / "overnight_logs" / "nabu_overnight.log"


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def count_files(root: Path):
    return sum(1 for _ in root.glob("*_processed.npz")) if root.exists() else 0


def atomic_save(path: Path, content: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(content, f, indent=2)
        f.flush()
        os.fsync(f.fileno())
    tmp.replace(path)


def log(message, path: Path):
    line = f"[{now()}] {message}"
    print(line, flush=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def run(cmd: list[str], log_path: Path, output: list[str] | None = None):
    log("COMMAND: " + subprocess.list2cmdline(cmd), log_path)
    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"
    with log_path.open("a", encoding="utf-8") as dest:
        # Inherit terminal and mirror output into the log. No shell execution.
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, errors="replace", encoding="utf-8", env=env)
        try:
            assert proc.stdout is not None
            for line in proc.stdout:
                print(line, end="", flush=True)
                dest.write(line)
                dest.flush()
                if output is not None:
                    output.append(line)
            return proc.wait()
        except KeyboardInterrupt:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
            raise


def verify_checkpoint(path: Path, output: list[str], init: str, train_n: int, val_n: int, epochs: int, started: float):
    # The trainer saves on every held-out improvement, so a readable checkpoint may still be partial.
    # Also require the summary lines it prints only after the final epoch.
    if not path.is_file() or path.stat().st_size < 1000:
        return "checkpoint missing or truncated"
    if path.stat().st_mtime < started:
        return "checkpoint is older than this training attempt"
    import torch
    from .mouth_training import MouthEncoder
    try:
        ckpt = torch.load(path, map_location="cpu", weights_only=True)
    except Exception as e:
        return f"checkpoint does not deserialize ({type(e).__name__}: {e})"
    if not isinstance(ckpt, dict) or ckpt.get("training_mode") != "multivsr-finetune" or tuple(ckpt.get("input_shape", ())) != (29, 40, 3):
        return "not a 29x40x3 MultiVSR fine-tune checkpoint"
    if Path(str(ckpt.get("initialized_from"))) != Path(init):
        return f"initialized from {ckpt.get('initialized_from')}, expected {init}"
    if len(ckpt.get("train_filenames", [])) != train_n or len(ckpt.get("validation_filenames", [])) != val_n:
        return f"split sizes differ from this batch ({train_n} train / {val_n} val)"
    weights = ckpt.get("model_state")
    if not isinstance(weights, dict) or not weights or not all(torch.is_tensor(t) and bool(torch.isfinite(t).all()) for t in weights.values()):
        return "model weights missing or not finite"
    try:
        MouthEncoder(ckpt.get("hidden", 64), ckpt.get("embedding_dim", 64)).load_state_dict(weights)
    except (RuntimeError, TypeError, ValueError) as e:
        return f"weights do not fit the Nabu encoder ({e})"
    loss, epoch = ckpt.get("best_validation_loss"), ckpt.get("epoch")
    if not isinstance(loss, float) or not 0 <= loss < float("inf") or not isinstance(epoch, int) or not 1 <= epoch <= epochs:
        return f"invalid best loss {loss!r} or epoch {epoch!r}"
    lines = [line.strip() for line in output]
    if not any(line.startswith(f"Epoch {epochs:03d} |") for line in lines):
        return f"trainer never reported epoch {epochs}"
    if f"Best held-out loss: {loss:.4f}" not in lines or f"New checkpoint: {path}" not in lines:
        return "trainer did not report finishing with this checkpoint"
    return None


def parse_args():
    ap = argparse.ArgumentParser(description="Resumable bounded overnight MultiVSR/Nabu batch preprocessor and fine-tuner")
    ap.add_argument("--target-batches", type=int, default=12, help="Total ingestion batches to finish (including previous runs)")
    ap.add_argument("--source-start", type=int, default=10, help="First new source offset; ignored when state exists")
    ap.add_argument("--source-count", type=int, default=12, help="Successful source videos targeted per batch")
    ap.add_argument("--candidates", type=int, default=40, help="Unique English source IDs scanned per batch")
    ap.add_argument("--tracks-per-source", type=int, default=3)
    ap.add_argument("--words-per-track", type=int, default=40)
    ap.add_argument("--train-every", type=int, default=3, help="Fine-tune after every N ingestion batches and at the end")
    ap.add_argument("--epochs", type=int, default=5, help="Epochs per incremental fine-tune (restarts optimizer)")
    ap.add_argument("--batch-size", type=int, default=16)
    ap.add_argument("--min-free-gb", type=float, default=40, help="Stop acquisition if free disk drops below this threshold")
    ap.add_argument("--initial-checkpoint", type=Path, default=DEFAULT_INIT)
    ap.add_argument("--state", type=Path, default=DEFAULT_STATE)
    ap.add_argument("--log", type=Path, default=DEFAULT_LOG)
    ap.add_argument("--offline", action="store_true", help="Use only previously downloaded source MP4s")
    ap.add_argument("--dry-run", action="store_true", help="Print planned commands; do not run, modify state or download")
    a = ap.parse_args()
    if not (a.target_batches >= 1 and a.source_start >= 0 and a.source_count >= 1
            and a.candidates >= a.source_count and a.tracks_per_source >= 1
            and a.words_per_track >= 1 and a.train_every >= 1 and a.epochs >= 1
            and a.batch_size >= 2 and a.min_free_gb >= 1):
        ap.error("Invalid non-positive options; candidates must be >= source-count")
    return a


def main():
    a = parse_args()
    if not (Path("pronounciation") / "multivsr_batch.py").is_file():
        raise SystemExit("Run from the Nabu repository ROOT (with pronounciation/multivsr_batch.py present)")
    if not (Path("pronounciation") / "train_multivsr.py").is_file():
        raise SystemExit("Missing pronounciation/train_multivsr.py")
    if not a.initial_checkpoint.is_file() and not a.state.exists():
        raise SystemExit(f"Missing initial checkpoint: {a.initial_checkpoint}")
    if not (ROOT / "metadata" / "multivsr.tar").exists() and not a.offline:
        raise SystemExit(f"Missing metadata TAR at {ROOT / 'metadata' / 'multivsr.tar'}")
    if not a.dry_run and sys.prefix == sys.base_prefix:
        raise SystemExit("Use your Nabu venv explicitly: venv\\Scripts\\python.exe -m pronounciation.overnight_multivsr")

    if a.state.exists():
        state = json.loads(a.state.read_text(encoding="utf-8"))
        if state.get("version") != 1:
            raise SystemExit("Unknown state file format; backup and inspect before continuing")
    else:
        state = {"version": 1, "batches_done": 0, "next_source_start": a.source_start,
                 "last_trained_batch": 0, "checkpoint": str(a.initial_checkpoint), "history": []}
    if not Path(state["checkpoint"]).is_file():
        raise SystemExit(f"Resume checkpoint missing: {state['checkpoint']}")
    if not a.dry_run:
        log(f"START venv={sys.executable} batches={state['batches_done']}/{a.target_batches} "
            f"next_source={state['next_source_start']} checkpoint={state['checkpoint']}", a.log)
        log("All prior NPZ files and MP4 originals are preserved; no automatic deletions.", a.log)
    else:
        print("DRY RUN (no downloads, training, or filesystem modifications)")
        print("Existing state:", state)

    def recover(code, new_file, output, train_n, val_n, started):
        # Training has exited 0xC0000409 at shutdown after saving (batches 3, 6, 9, 12).
        batch_number = state["batches_done"]
        log(f"TRAIN EXIT {code} (0x{code & 0xFFFFFFFF:08X}) at batch {batch_number}; verifying {new_file}", a.log)
        problem = verify_checkpoint(new_file, output, state["checkpoint"], train_n, val_n, a.epochs, started)
        if problem:
            log(f"RECOVERY REFUSED: {problem}", a.log)
            return False
        cmd = [sys.executable, "-u", "-m", "pronounciation.repair_nabu_after_training", "--batch", str(batch_number),
               "--prior", str(state["last_trained_batch"]), "--prior-checkpoint", state["checkpoint"],
               "--state", str(a.state), "--models", str(MODELS)]
        if run(cmd, a.log) != 0:
            log("RECOVERY FAILED: repair script stopped", a.log)
            return False
        try:
            repaired = json.loads(a.state.read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            log(f"RECOVERY FAILED: cannot reread {a.state}: {e}", a.log)
            return False
        if repaired != dict(state, last_trained_batch=batch_number, checkpoint=str(new_file)):
            log(f"RECOVERY FAILED: {a.state} does not match batch {batch_number} / {new_file}; inspect it and the repair backup", a.log)
            return False
        state.update(repaired)
        log(f"TRAIN RECOVERED batch {batch_number}: verified {new_file} and reloaded {a.state}", a.log)
        return True

    def fine_tune():
        train_n = count_files(DATA / "train")
        val_n = count_files(DATA / "val")
        batch_number = state["batches_done"]
        if train_n < a.batch_size or val_n < a.batch_size:
            msg = f"SKIP training at batch {batch_number}: need at least {a.batch_size} samples in both splits, have train={train_n}, val={val_n}"
            print(msg) if a.dry_run else log(msg, a.log)
            return False
        new_file = MODELS / f"nabu_multivsr_overnight_b{batch_number:04d}.pt"
        if new_file.exists():
            raise SystemExit(f"Refusing to overwrite prior checkpoint: {new_file}; inspect your state file")
        cmd = [sys.executable, "-u", "-m", "pronounciation.train_multivsr",
               "--epochs", str(a.epochs), "--batch-size", str(a.batch_size),
               "--init", state["checkpoint"], "--out", str(new_file)]
        if a.dry_run:
            print("WOULD TRAIN:", subprocess.list2cmdline(cmd))
            return False
        log(f"TRAIN cumulative NPZ: {train_n} train / {val_n} val from checkpoint {state['checkpoint']}", a.log)
        output = []
        started = time.time()
        result = run(cmd, a.log, output)
        recovered = result != 0 and recover(result, new_file, output, train_n, val_n, started)
        if not recovered and (result != 0 or not new_file.is_file() or new_file.stat().st_size < 1000):
            log(f"TRAIN FAILED (code {result}); preserving checkpoint {state['checkpoint']}", a.log)
            raise SystemExit(2)
        state["checkpoint"] = str(new_file)
        state["last_trained_batch"] = batch_number
        state["history"].append({"type": "train", "batch": batch_number, "exit_code": result,
                                 "train_npz": train_n, "val_npz": val_n, "checkpoint": str(new_file)})
        atomic_save(a.state, state)
        log(f"TRAIN SUCCESS saved {new_file}", a.log)
        return True

    # If an earlier invocation finished ingestion but was interrupted before fine-tuning,
    # catch up without downloading additional video.
    # Same for a training boundary whose fine-tune failed, so it is retried rather than skipped.
    if state["batches_done"] > state["last_trained_batch"] and (state["batches_done"] >= a.target_batches or state["batches_done"] % a.train_every == 0):
        fine_tune()

    while state["batches_done"] < a.target_batches:
        free_gb = shutil.disk_usage(ROOT.anchor).free / (1024 ** 3)
        if free_gb < a.min_free_gb:
            log(f"DISK SAFETY STOP: {free_gb:.1f} GiB free < {a.min_free_gb:.1f} GiB floor. "
                "No MP4 or NPZ was deleted.", a.log)
            if state["batches_done"] > state["last_trained_batch"]:
                fine_tune()
            break
        next_batch = state["batches_done"] + 1
        offset = state["next_source_start"]
        cmd = [sys.executable, "-u", "-m", "pronounciation.multivsr_batch",
               "--source-start", str(offset), "--source-count", str(a.source_count),
               "--candidates", str(a.candidates), "--tracks-per-source", str(a.tracks_per_source),
               "--words-per-track", str(a.words_per_track)]
        if not a.offline:
            cmd.append("--download")
        if a.dry_run:
            print(f"WOULD INGEST batch {next_batch}: {subprocess.list2cmdline(cmd)}")
            state["batches_done"] = next_batch
            state["next_source_start"] += a.candidates
            continue

        before_tr = count_files(DATA / "train")
        before_val = count_files(DATA / "val")
        log(f"BATCH {next_batch}/{a.target_batches}: source offset={offset} "
            f"(free={free_gb:.1f} GiB, train={before_tr}, val={before_val})", a.log)
        code = run(cmd, a.log)
        if code != 0:
            log(f"INGEST FAILED (code {code}) at offset={offset}. Rerun same command to retry. "
                "Completed NPZs and MP4s will be reused.", a.log)
            raise SystemExit(code)
        after_tr = count_files(DATA / "train")
        after_val = count_files(DATA / "val")
        gained = after_tr + after_val - before_tr - before_val
        state["batches_done"] = next_batch
        state["next_source_start"] += a.candidates
        state["history"].append({"type": "ingest", "batch": next_batch, "offset": offset,
                                 "new_npz": gained, "train_npz": after_tr, "val_npz": after_val})
        atomic_save(a.state, state)
        log(f"BATCH {next_batch} COMPLETE: +{gained} new NPZ; train={after_tr}, val={after_val}", a.log)
        if (next_batch % a.train_every == 0 or next_batch >= a.target_batches) and next_batch > state["last_trained_batch"]:
            fine_tune()

    if not a.dry_run:
        log(f"DONE batches={state['batches_done']}/{a.target_batches} "
            f"train={count_files(DATA / 'train')} val={count_files(DATA / 'val')} "
            f"latest_checkpoint={state['checkpoint']} state={a.state}", a.log)


if __name__ == "__main__":
    main()