import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import shutil
import sys

STATE_PATH = Path(r"C:\NabuData\MultiVSR\overnight_state.json")
MODELS_DIR = Path(r"C:\NabuData\models")


def main():
    global STATE_PATH, MODELS_DIR
    parser = argparse.ArgumentParser(description="Recover Nabu's saved training checkpoint after an abnormal training-process exit")
    parser.add_argument("--batch", type=int, required=True, help="Completed training boundary (e.g. 6, 9 or 12)")
    parser.add_argument("--prior", type=int, help="Training boundary currently recorded in the state (default: batch - 3)")
    parser.add_argument("--prior-checkpoint", help="Checkpoint currently recorded in the state (default: overnight checkpoint for --prior)")
    parser.add_argument("--state", type=Path, default=STATE_PATH)
    parser.add_argument("--models", type=Path, default=MODELS_DIR)
    args = parser.parse_args()
    STATE_PATH, MODELS_DIR = args.state, args.models
    batch = args.batch
    if args.prior is None and (batch < 6 or batch % 3 != 0):
        raise RuntimeError("Use a completed training boundary: 6, 9, 12, ... (batch 3 was repaired separately).")
    prior = batch - 3 if args.prior is None else args.prior
    if not 0 <= prior < batch:
        raise RuntimeError(f"Expected 0 <= prior < {batch}, found {prior}; no state changed.")

    if not STATE_PATH.is_file():
        raise RuntimeError(f"Controller state not found: {STATE_PATH}")
    with STATE_PATH.open("r", encoding="utf-8-sig") as handle:
        state = json.load(handle)
    if not isinstance(state, dict):
        raise RuntimeError("Controller state is not a JSON object.")

    prior_checkpoint = args.prior_checkpoint or str(MODELS_DIR / f"nabu_multivsr_overnight_b{prior:04d}.pt")
    new_checkpoint = str(MODELS_DIR / f"nabu_multivsr_overnight_b{batch:04d}.pt")
    if state.get("batches_done") != batch:
        raise RuntimeError(f"Expected batches_done={batch}, found {state.get('batches_done')!r}; no state changed.")
    history = state.get("history")
    if not isinstance(history, list) or not any(isinstance(row, dict) and row.get("type") == "ingest" and row.get("batch") == batch for row in history):
        raise RuntimeError(f"Missing ingestion record for batch {batch}; no state changed.")

    if state.get("last_trained_batch") == batch and state.get("checkpoint") == new_checkpoint:
        print(f"[OK] Controller already points to the batch {batch} checkpoint. No changes needed.")
        return 0
    if state.get("last_trained_batch") != prior or state.get("checkpoint") != prior_checkpoint:
        raise RuntimeError(
            "Unexpected controller checkpoint/last_trained_batch combination. "
            f"Expected last_trained_batch={prior} and checkpoint={prior_checkpoint!r}; "
            f"found {state.get('last_trained_batch')!r} and {state.get('checkpoint')!r}. No state changed."
        )

    import torch
    new_path = Path(new_checkpoint)
    if not new_path.is_file() or new_path.stat().st_size == 0:
        raise RuntimeError(f"New checkpoint missing or empty: {new_path}")
    loaded = torch.load(new_path, map_location="cpu", weights_only=True)
    if not isinstance(loaded, dict) or not loaded:
        raise RuntimeError("New checkpoint did not contain a nonempty dictionary; no state changed.")
    print(f"[OK] Checkpoint deserialized: {new_path} ({new_path.stat().st_size / 1048576:.2f} MiB)")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = STATE_PATH.with_name(f"{STATE_PATH.name}.before_b{batch:04d}_repair_{timestamp}.bak")
    shutil.copy2(STATE_PATH, backup)
    print(f"[OK] State backup: {backup}")

    state["last_trained_batch"] = batch
    state["checkpoint"] = new_checkpoint
    temporary = STATE_PATH.with_name(f"{STATE_PATH.name}.repair_tmp")
    try:
        with temporary.open("w", encoding="utf-8") as handle:
            json.dump(state, handle, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, STATE_PATH)
    finally:
        if temporary.exists():
            temporary.unlink()

    print(f"[OK] last_trained_batch: {prior} -> {batch}")
    print(f"[OK] checkpoint: {new_checkpoint}")
    print(f"[OK] batches_done={batch}; next_source_start={state.get('next_source_start')} (unchanged)")
    print("[OK] Run --dry-run to verify, then restart the overnight controller.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"[STOP] {type(error).__name__}: {error}")
        sys.exit(1)
