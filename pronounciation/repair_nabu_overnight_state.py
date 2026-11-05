import json
import os
from pathlib import Path
import shutil
import sys
from datetime import datetime

OLD_CHECKPOINT = r"C:\NabuData\models\nabu_multivsr_finetuned.pt"
NEW_CHECKPOINT = r"C:\NabuData\models\nabu_multivsr_overnight_b0003.pt"
SKIP_DIRS = {"venv", ".venv", "node_modules", ".git", "__pycache__", "originals", "extracted", "train", "val", "tmp", "temp", ".cache"}


def read_json(path):
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except (OSError, UnicodeError, ValueError):
        return None


def matching_state(data):
    return (
        isinstance(data, dict)
        and data.get("batches_done") == 3
        and data.get("next_source_start") == 130
        and data.get("last_trained_batch") in (0, 3)
        and data.get("checkpoint") in (OLD_CHECKPOINT, NEW_CHECKPOINT)
        and isinstance(data.get("history"), list)
    )


def find_matching_state_files():
    roots = [Path.cwd(), Path(r"C:\NabuData")]
    seen = set()
    found = []
    for root in roots:
        if not root.is_dir():
            continue
        for folder, subdirs, files in os.walk(root):
            subdirs[:] = [d for d in subdirs if d.lower() not in SKIP_DIRS]
            for filename in files:
                if not filename.lower().endswith(".json") or "backup" in filename.lower() or ".bak" in filename.lower():
                    continue
                path = Path(folder) / filename
                try:
                    canonical = str(path.resolve()).casefold()
                except OSError:
                    continue
                if canonical in seen:
                    continue
                seen.add(canonical)
                data = read_json(path)
                if matching_state(data):
                    found.append((path, data))
    return found


def main():
    ckpt = Path(NEW_CHECKPOINT)
    if not ckpt.is_file():
        raise RuntimeError(f"New checkpoint is missing: {ckpt}")
    import torch
    payload = torch.load(ckpt, map_location="cpu", weights_only=True)
    if not isinstance(payload, dict) or not payload:
        raise RuntimeError("Checkpoint did not contain a nonempty dictionary")
    print(f"[OK] Checkpoint readable: {ckpt} ({ckpt.stat().st_size / 1048576:.2f} MiB)")

    found = find_matching_state_files()
    if len(found) != 1:
        print(f"[STOP] Expected exactly one matching state JSON; found {len(found)}.")
        for path, _ in found:
            print(f"  {path}")
        print("No files changed. Check the state filename inside pronounciation\\overnight_multivsr.py.")
        return 1

    state_path, state = found[0]
    print(f"[OK] Matching controller state: {state_path}")
    if state["last_trained_batch"] == 3 and state["checkpoint"] == NEW_CHECKPOINT:
        print("[OK] State already repaired; no changes made.")
        return 0
    if state["last_trained_batch"] != 0 or state["checkpoint"] != OLD_CHECKPOINT:
        print("[STOP] Unexpected partial state; no changes made.")
        return 1

    backup = state_path.with_name(state_path.name + ".before_b0003_repair_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".bak")
    shutil.copy2(state_path, backup)
    state["last_trained_batch"] = 3
    state["checkpoint"] = NEW_CHECKPOINT
    temporary = state_path.with_name(state_path.name + ".nabu_repair_tmp")
    try:
        with open(temporary, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
            f.write("\n")
        os.replace(temporary, state_path)
    finally:
        if temporary.exists():
            temporary.unlink()

    print(f"[OK] State backup: {backup}")
    print("[OK] last_trained_batch: 0 -> 3")
    print(f"[OK] checkpoint: {NEW_CHECKPOINT}")
    print("[OK] batches_done: 3 (unchanged); next_source_start: 130 (unchanged)")
    print("[OK] You can dry-run, then resume the same 12-batch command.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"[STOP] {type(e).__name__}: {e}")
        sys.exit(1)
