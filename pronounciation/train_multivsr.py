"""Fine-tune Nabu's existing 29x40x3 contrastive mouth encoder on MultiVSR clips.

This is a self-supervised *mouth-motion* experiment, NOT word recognition or
pronunciation grading. Requires processed local face-track MP4 clips.

Run from the Nabu repository root after preprocessing enough clips:
    python -m pronounciation.train_multivsr --epochs 2

The original 100-video checkpoint is only READ; we save a NEW checkpoint.
Where official train and val split folders exist, this uses those splits.
Otherwise it holds out entire source-video IDs to reduce leakage.
"""

import argparse
import random
from collections import defaultdict
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import DataLoader

from .mouth_training import LipDataset, MouthEncoder, run_epoch  # Reuse the exact established Nabu architecture and contrastive loss.

DEFAULT_DATA = Path(r"C:\NabuData\processed_multivsr")
DEFAULT_INIT = Path(r"C:\NabuData\models\nabu_all100_1000epochs.pt")
DEFAULT_OUT = Path(r"C:\NabuData\models\nabu_multivsr_finetuned.pt")


def source_group(path):
    with np.load(path, allow_pickle=False) as data:
        if "source_video_id" in data:
            return str(data["source_video_id"])
        raise ValueError(f"Missing source_video_id in {path}: reprocess using preprocess_multivsr.py")


def select_files(data_dir, seed):
    train = sorted((data_dir / "train").glob("*_processed.npz"))
    val = sorted((data_dir / "val").glob("*_processed.npz"))
    if val:
        if not train:
            raise ValueError("Official val folder exists but train folder is empty")
        # Check that source videos don't leak between splits.
        tr_ids = {source_group(p) for p in train}
        val_ids = {source_group(p) for p in val}
        shared = tr_ids & val_ids
        if shared:
            raise ValueError(f"Train/validation contain the same source video IDs: {list(shared)[:5]}")
        return train, val, "official train/val directories"
    if len(train) < 20:
        raise ValueError(f"Only {len(train)} training clips found. Preprocess at least 20 across several source videos first.")
    groups = defaultdict(list)
    for path in train:
        groups[source_group(path)].append(path)
    if len(groups) < 3:
        raise ValueError(f"Only {len(groups)} distinct source videos. Need >=3 to produce a held-out VIDEO split.")
    keys = sorted(groups)
    random.Random(seed).shuffle(keys)
    val_count = max(1, round(len(keys) * 0.2))
    val_keys = set(keys[:val_count])
    tr_files = [p for k, paths in groups.items() if k not in val_keys for p in paths]
    val_files = [p for k, paths in groups.items() if k in val_keys for p in paths]
    return sorted(tr_files), sorted(val_files), "source-video grouped split"


def validate_clips(files):
    for path in files:
        with np.load(path, allow_pickle=False) as item:
            x = item["landmarks_29"]
            if x.shape != (29, 40, 3) or not np.isfinite(x).all():
                raise ValueError(f"Invalid landmarks: {path} {x.shape}")
            if "source_dataset" not in item or str(item["source_dataset"]) != "MultiVSR":
                raise ValueError(f"Not tagged MultiVSR: {path}")


def validation_epoch(model, loader, device, seed):
    # Prevent noise augmentation from changing across validation epochs.
    # The model is in eval mode, so dropout is disabled.
    torch_state = torch.random.get_rng_state()
    cuda_state = torch.cuda.get_rng_state_all() if device.type == "cuda" else None
    try:
        torch.manual_seed(seed)
        if device.type == "cuda":
            torch.cuda.manual_seed_all(seed)
        return run_epoch(model, loader, device)
    finally:
        torch.random.set_rng_state(torch_state)
        if cuda_state is not None:
            torch.cuda.set_rng_state_all(cuda_state)


def main():
    ap = argparse.ArgumentParser(description="Fine-tune Nabu's saved mouth encoder on local MultiVSR landmarks")
    ap.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    ap.add_argument("--init", type=Path, default=DEFAULT_INIT)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--batch-size", type=int, default=16)
    ap.add_argument("--lr", type=float, default=0.0001)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()
    if args.epochs < 1 or args.batch_size < 2 or args.lr <= 0:
        ap.error("epochs >= 1, batch-size >= 2 and lr > 0 required")
    if args.init.resolve() == args.out.resolve():
        ap.error("Refusing to overwrite the existing Nabu checkpoint. Set a different --out.")
    if not args.init.is_file():
        ap.error(f"Initial Nabu checkpoint missing: {args.init}")
    train_files, val_files, split_method = select_files(args.data_dir, args.seed)
    validate_clips(train_files + val_files)
    if len(train_files) < 2 or len(val_files) < 2:
        ap.error(f"Need >=2 samples in both splits, got train={len(train_files)}, val={len(val_files)}")
    batch = min(args.batch_size, len(train_files), len(val_files))
    train_loader = DataLoader(LipDataset(train_files), batch_size=batch, shuffle=True, drop_last=True, num_workers=0)
    val_loader = DataLoader(LipDataset(val_files), batch_size=batch, shuffle=False, drop_last=True, num_workers=0)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'})")
    print(f"MultiVSR: {len(train_files)} train | {len(val_files)} validation | split: {split_method}")
    print(f"Input: (batch, 29, 40, 3), batch size {batch}")
    print("Objective: contrastive mouth-motion adaptation (NOT pronunciation scoring)")
    ckpt = torch.load(args.init, map_location="cpu", weights_only=True)
    if tuple(ckpt.get("input_shape", ())) != (29, 40, 3):
        raise ValueError(f"Incompatible original Nabu checkpoint input: {ckpt.get('input_shape')}")
    model = MouthEncoder(ckpt.get("hidden", 64), ckpt.get("embedding_dim", 64)).to(device)
    model.load_state_dict(ckpt["model_state"])
    print(f"Initialized weights from: {args.init}")
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-3)
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    best = float("inf")
    for epoch in range(1, args.epochs + 1):
        train_loss = run_epoch(model, train_loader, device, optimizer=optimizer)
        val_loss = validation_epoch(model, val_loader, device, args.seed)
        print(f"Epoch {epoch:03d} | train {train_loss:.4f} | held-out {val_loss:.4f}")
        if np.isfinite(val_loss) and val_loss < best:
            best = val_loss
            args.out.parent.mkdir(parents=True, exist_ok=True)
            torch.save({"model_state": model.state_dict(), "input_shape": (29, 40, 3),
                        "hidden": ckpt.get("hidden", 64), "embedding_dim": ckpt.get("embedding_dim", 64),
                        "best_validation_loss": float(best), "epoch": epoch,
                        "training_mode": "multivsr-finetune", "initialized_from": str(args.init),
                        "train_filenames": [p.name for p in train_files], "validation_filenames": [p.name for p in val_files],
                        "split_method": split_method, "objective": "same-recording contrastive representation learning",
                        "seed": args.seed}, args.out)
    print(f"Best held-out loss: {best:.4f}")
    print(f"New checkpoint: {args.out}")
    print("This measures the contrastive pretext task only. Test on NEW SPEAKERS before pronunciation claims.")


if __name__ == "__main__":
    main()
