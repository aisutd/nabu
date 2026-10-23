import argparse
import os
import numpy as np
import matplotlib
import matplotlib.pyplot as plt

# draw to a PNG file, no window needed
matplotlib.use("Agg") 

from .config import ALL_LIP_INDICES, CORNER_LEFT_LIP, CORNER_RIGHT_LIP, UPPER_INNER_LIP, LOWER_INNER_LIP
from .detector import MouthTracker
from .trim import active_range
from .video_input import landmarks_from_video, prepare_wav

_POS = {int(m): p for p, m in enumerate(ALL_LIP_INDICES)}
LEFT, RIGHT = _POS[CORNER_LEFT_LIP], _POS[CORNER_RIGHT_LIP]
UP, LOW = _POS[UPPER_INNER_LIP], _POS[LOWER_INNER_LIP]

THRESHOLD = 0.08

def normalize(frames, aspect):

  # x, y only; z is too noisy
  pts = np.asarray(frames, dtype=np.float32)[:, :, :2].copy() 

  # x and y into the same units
  pts[:, :, 1] *= aspect                              

  # center on the middle of the mouth         
  pts -= ((pts[:, LEFT] + pts[:, RIGHT]) / 2)[:, None, :]      

  # rotate so the corners line is level
  d = pts[:, RIGHT] - pts[:, LEFT]                             
  ang = np.arctan2(d[:, 1], d[:, 0])
  c, s = np.cos(-ang)[:, None], np.sin(-ang)[:, None]
  x = pts[:, :, 0] * c - pts[:, :, 1] * s
  y = pts[:, :, 0] * s + pts[:, :, 1] * c
  pts = np.stack([x, y], axis=2)

  # One width for the whole clip (not per frame), so spreading and rounding stay visible.
  width = np.median(pts[:, RIGHT, 0] - pts[:, LEFT, 0])
  return pts / (width + 1e-6)

def features(norm):

  # how open the mouth is
  aperture = norm[:, LOW, 1] - norm[:, UP, 1]  

  # how spread or rounded
  width = norm[:, RIGHT, 0] - norm[:, LEFT, 0]      
  return np.stack([aperture, width], axis=1)

def dtw_path(a, b):

  # Dynamic time warping: the best way to match each frame of a to a frame of b.
  n, m = len(a), len(b)

  cost = np.linalg.norm(a[:, None, :] - b[None, :, :], axis=2)
  acc = np.full((n + 1, m + 1), np.inf)
  acc[0, 0] = 0

  for i in range(1, n + 1):
    for j in range(1, m + 1):
      acc[i, j] = cost[i - 1, j - 1] + min(acc[i - 1, j], acc[i, j - 1], acc[i - 1, j - 1])

  i, j, path = n, m, []

  while i > 0 and j > 0:
    path.append((i - 1, j - 1))
    k = int(np.argmin([acc[i - 1, j - 1], acc[i - 1, j], acc[i, j - 1]]))
    if k == 0:
      i, j = i - 1, j - 1
    elif k == 1:
      i -= 1
    else:
      j -= 1

  return path[::-1]

def compare(user, ref):
  u_frames, u_ts, u_asp = user
  r_frames, r_ts, r_asp = ref

  us, ue = active_range(u_frames)
  rs, re_ = active_range(r_frames)
  u_ms = int(u_ts[ue - 1] - u_ts[us])
  r_ms = int(r_ts[re_ - 1] - r_ts[rs])

  u = normalize(u_frames[us:ue], u_asp)
  r = normalize(r_frames[rs:re_], r_asp)

  path = dtw_path(u.reshape(len(u), -1), r.reshape(len(r), -1))
  ui = np.array([p[0] for p in path])
  ri = np.array([p[1] for p in path])

  return {
    # matched feature curves
    "fu": features(u)[ui], "fr": features(r)[ri],            
    "shape_err": np.linalg.norm(u[ui] - r[ri], axis=2).mean(axis=1),
    "u_pts": u, "r_pts": r, "ui": ui, "ri": ri,
    "user_ms": u_ms, "ref_ms": r_ms,
  }

def report(res):
  print(f"\nSpeed: you {res['user_ms']} ms, example {res['ref_ms']} ms")

  L = len(res["shape_err"])
  edges = np.linspace(0, L, 4).astype(int)

  for k, name in enumerate(["start", "middle", "end"]):
    a, b = edges[k], edges[k + 1]

    # user minus example
    d = (res["fu"][a:b] - res["fr"][a:b]).mean(axis=0) 

    notes = []

    if d[0] > THRESHOLD: 
      notes.append("mouth opens MORE than the example")
    elif d[0] < -THRESHOLD: 
      notes.append("mouth opens LESS than the example")
    if d[1] > THRESHOLD: 
      notes.append("mouth is WIDER / more spread")
    elif d[1] < -THRESHOLD: 
      notes.append("mouth is NARROWER / more rounded")

    err = res["shape_err"][a:b].mean()

    print(f"  {name:<6} shape error {err:.3f}   " + ("; ".join(notes) if notes else "close to the example"))

def plot(res, out_png):
  L = len(res["shape_err"])
  t = np.linspace(0, 100, L)
  worst = int(np.argmax(res["shape_err"]))
  fig, ax = plt.subplots(2, 2, figsize=(11, 8))

  for a, col, title in ((ax[0, 0], 0, "Mouth opening"), (ax[0, 1], 1, "Mouth width")):
    a.plot(t, res["fr"][:, col], color="green", label="example")
    a.plot(t, res["fu"][:, col], color="red", label="you")
    a.axvline(t[worst], color="gray", linestyle=":")
    a.set_title(title)
    a.set_xlabel("% of word")
    a.legend()

  ax[1, 0].plot(t, res["shape_err"], color="purple")
  ax[1, 0].axvline(t[worst], color="gray", linestyle=":")
  ax[1, 0].set_title("Overall shape difference")
  ax[1, 0].set_xlabel("% of word")

  a = ax[1, 1]
  for pts, color, name in ((res["r_pts"][res["ri"][worst]], "green", "example"),
                           (res["u_pts"][res["ui"][worst]], "red", "you")):

    # outer lip, then inner lip
    for k, part in enumerate((pts[:20], pts[20:])):       
      loop = np.vstack([part, part[:1]])
      a.plot(loop[:, 0], loop[:, 1], color=color, label=name if k == 0 else None)

  a.invert_yaxis()
  a.set_aspect("equal")
  a.legend()
  a.set_title(f"Lips at the biggest difference ({t[worst]:.0f}% of word)")

  fig.tight_layout()
  fig.savefig(out_png, dpi=120)
  plt.close(fig)

def main():
  ap = argparse.ArgumentParser(description="Compare your mouth movement to an example video")
  ap.add_argument("--user", required=True, help="your mp4")
  ap.add_argument("--example", required=True, help="mp4 of the same word said correctly")
  ap.add_argument("--user-wav", help="your wav, or the mp4 again to use its audio (optional)")
  ap.add_argument("--word", help="the word you tried to say (used with --user-wav)")
  ap.add_argument("--out", default="pronounciation/test_data/compare_result.png")
  args = ap.parse_args()

  tracker = MouthTracker()
  user = landmarks_from_video(args.user, tracker)
  ref = landmarks_from_video(args.example, tracker)
  tracker.close()

  res = compare(user, ref)
  report(res)
  os.makedirs(os.path.dirname(args.out), exist_ok=True)
  plot(res, args.out)
  print(f"\nSaved plot to {args.out}")

  if args.user_wav and args.word:
    from .transcribe import check
    wav = prepare_wav(args.user_wav, "pronounciation/test_data/audio/_prepared_user.wav")
    heard, match = check(wav, args.word)
    print(f"Whisper heard: '{heard}'" + ("" if match else f"  (expected '{args.word}')"))

if __name__ == "__main__":
  main()