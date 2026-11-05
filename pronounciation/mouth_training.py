import argparse
import random
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch import nn
from torch.utils.data import DataLoader, Dataset

DEFAULT_DATA = Path(r"C:\NabuData\processed_hf_landmarks")
DEFAULT_CHECKPOINT = Path(r"C:\NabuData\models\nabu_mouth_encoder.pt")
SHAPE = (29, 40, 3)


class LipDataset(Dataset):
    def __init__(self, files):
        self.files = list(files)
        self.arrays = []
        self.labels = []
        for path in self.files:
            with np.load(path, allow_pickle=False) as data:
                if "landmarks_29" not in data:
                    raise ValueError(f"Missing landmarks_29: {path}")
                points = np.asarray(data["landmarks_29"], dtype=np.float32)
                label = str(data["label"]) if "label" in data else path.stem
            if points.shape != SHAPE or not np.isfinite(points).all():
                raise ValueError(f"Invalid landmark array {points.shape}: {path}")
            self.arrays.append(torch.from_numpy(points))
            self.labels.append(label)

    def __len__(self):
        return len(self.files)

    def __getitem__(self, idx):
        return self.arrays[idx]


class MouthEncoder(nn.Module):
    def __init__(self, hidden=64, embedding_dim=64):
        super().__init__()
        self.net = nn.GRU(input_size=40 * 3, hidden_size=hidden, num_layers=2, batch_first=True, bidirectional=True, dropout=0.1)
        self.project = nn.Sequential(nn.Linear(hidden * 2, 128), nn.ReLU(), nn.Linear(128, embedding_dim))

    def forward(self, x):
        if x.ndim != 4 or tuple(x.shape[1:]) != SHAPE:
            raise ValueError(f"Expected (batch, 29, 40, 3), got {tuple(x.shape)}")
        features, _ = self.net(x.reshape(x.shape[0], 29, 120))
        pooled = features.mean(dim=1)
        return F.normalize(self.project(pooled), p=2, dim=-1)


def augment(x):
    """Mild training-only perturbations, not extra independent examples."""
    scale = 1 + torch.randn(x.shape[0], 1, 1, 1, device=x.device) * 0.025
    noise = torch.randn_like(x) * 0.008
    return x * scale + noise


def contrastive_loss(z1, z2, temperature=0.15):
    """InfoNCE: matching views share an index offset of batch size."""
    batch = z1.shape[0]
    z = torch.cat((z1, z2), dim=0)
    similarity = (z @ z.T) / temperature
    similarity.fill_diagonal_(float("-inf"))
    targets = (torch.arange(2 * batch, device=z.device) + batch) % (2 * batch)
    return F.cross_entropy(similarity, targets)


def run_epoch(model, loader, device, optimizer=None):
    is_train = optimizer is not None
    model.train(is_train)
    losses = []
    for points in loader:
        points = points.to(device)
        with torch.set_grad_enabled(is_train):
            z1 = model(augment(points))
            z2 = model(augment(points))
            loss = contrastive_loss(z1, z2)
        if is_train:
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()
        losses.append(loss.item())
    return float(np.mean(losses))


def train(args):
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    random.seed(args.seed)
    files = sorted(args.data_dir.glob("*_processed.npz"))
    if len(files) < 20:
        raise ValueError(f"Only {len(files)} recordings found; need at least 20 for this experiment")

    # The default mode keeps held-out recordings for validation.
    # --train-all is for the final fitting run, AFTER evaluation is complete.
    rng = random.Random(args.seed)
    rng.shuffle(files)
    if args.train_all:
        train_files, val_files = files, []
    else:
        val_count = max(8, round(len(files) * 0.2))
        val_files, train_files = files[:val_count], files[val_count:]

    train_data = LipDataset(train_files)
    val_data = LipDataset(val_files) if val_files else None
    batch_size = min(args.batch_size, len(train_data), len(val_data) if val_data is not None else len(train_data))
    if batch_size < 2:
        raise ValueError("Need at least two samples per contrastive batch")
    if args.train_all and len(train_data) % batch_size != 0:
        raise ValueError(f"For --train-all, choose a batch size that evenly divides {len(train_data)} "
                         f"(for 100 recordings, use --batch-size 20 or 10).")

    train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True, drop_last=True, num_workers=0)
    val_loader = (DataLoader(val_data, batch_size=batch_size, shuffle=False, drop_last=True, num_workers=0)
                  if val_data is not None else None)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'})")
    print(f"Training recordings: {len(train_data)} | Held-out recordings: {len(val_files)}")
    print(f"Input: (batch, {SHAPE[0]}, {SHAPE[1]}, {SHAPE[2]}) | Batch size: {batch_size}")
    print("Goal: self-supervised mouth-motion embeddings, NOT pronunciation accuracy")
    if args.train_all:
        print(f"Full-data mode: no validation set; saving every {args.save_every} epochs and at the final epoch")

    model = MouthEncoder().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-3)
    best = float("inf")
    for epoch in range(1, args.epochs + 1):
        train_loss = run_epoch(model, train_loader, device, optimizer)
        val_loss = run_epoch(model, val_loader, device) if val_loader is not None else None
        if val_loss is None:
            print(f"Epoch {epoch:03d} | train loss {train_loss:.4f} | validation: not available")
        else:
            print(f"Epoch {epoch:03d} | train loss {train_loss:.4f} | validation loss {val_loss:.4f}")

        # In full-data mode, there is no unbiased validation metric to pick a 'best' epoch.
        # Save the final model rather than falsely interpreting training loss as validation.
        save_checkpoint = (epoch == args.epochs or epoch % args.save_every == 0) if args.train_all else (np.isfinite(val_loss) and val_loss < best)
        if save_checkpoint:
            if val_loss is not None:
                best = val_loss
            args.out.parent.mkdir(parents=True, exist_ok=True)
            torch.save({"model_state": model.state_dict(), "input_shape": SHAPE, "hidden": 64, "embedding_dim": 64,
                        "best_validation_loss": None if args.train_all else float(best),
                        "last_training_loss": float(train_loss), "epoch": epoch,
                        "train_filenames": [p.name for p in train_files],
                        "validation_filenames": [p.name for p in val_files], "seed": args.seed,
                        "objective": "same-recording contrastive representation learning",
                        "training_mode": "full-data" if args.train_all else "train-validation"}, args.out)
    if args.train_all:
        print("Full-data fitting complete. No held-out metric is available for this checkpoint.")
    else:
        print(f"Best held-out contrastive loss: {best:.4f}")
    print(f"Checkpoint saved: {args.out}")


def compare(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    # Only load checkpoints created by this script. weights_only avoids arbitrary pickle objects.
    checkpoint = torch.load(args.out, map_location=device, weights_only=True)
    model = MouthEncoder(checkpoint["hidden"], checkpoint["embedding_dim"]).to(device)
    model.load_state_dict(checkpoint["model_state"])
    model.eval()
    vectors = []
    with torch.inference_mode():
        for path in args.compare:
            dataset = LipDataset([Path(path)])
            vectors.append(model(dataset[0].unsqueeze(0).to(device)).squeeze(0))
    similarity = F.cosine_similarity(vectors[0], vectors[1], dim=0).item()
    print(f"Embedding cosine similarity: {similarity:.4f}")
    print("This similarity is experimental; it is NOT a pronunciation score or percent correct.")


def main():
    parser = argparse.ArgumentParser(description="Nabu 29x40x3 lip-motion training baseline")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--train-all", action="store_true", help="Fit on all recordings (no validation; saves periodic/final weights)")
    parser.add_argument("--save-every", type=int, default=50, help="Checkpoint interval for --train-all (default: 50 epochs)")
    parser.add_argument("--compare", nargs=2, type=Path, metavar=("FILE_A", "FILE_B"))
    args = parser.parse_args()
    if args.compare:
        compare(args)
    else:
        if args.epochs < 1 or args.batch_size < 2 or args.save_every < 1:
            parser.error("--epochs, --save-every must be >= 1 and --batch-size must be >= 2")
        train(args)


if __name__ == "__main__":
    main()
