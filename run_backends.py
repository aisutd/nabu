"""Run the three Nabu backend services from one terminal."""

import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent
SERVICES = (
    ("Pronunciation", 8000, ("-m", "uvicorn", "pronounciation.api:app")),
    ("Handwriting", 8001, ("-m", "uvicorn", "api:app", "--app-dir", "handwriting/ocr")),
    ("ASL", 8002, ("asl/8_demo_server.py",)),
)


def stop_services(processes):
    for _, process in processes:
        if process.poll() is None:
            process.terminate()

    deadline = time.monotonic() + 10
    for _, process in processes:
        try:
            process.wait(timeout=max(0, deadline - time.monotonic()))
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def main():
    stopping = False

    def request_stop(_signum, _frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)

    env = os.environ.copy()
    env.setdefault(
        "NABU_MOUTH_CHECKPOINT",
        str(ROOT / "pronounciation" / "nabu_multivsr_overnight_b0050.pt"),
    )
    env["PYTHONUNBUFFERED"] = "1"
    processes = []
    try:
        for name, port, args in SERVICES:
            if stopping:
                return 0
            print(f"Starting {name} on http://127.0.0.1:{port}", flush=True)
            process = subprocess.Popen(
                [sys.executable, *args, "--port", str(port)],
                cwd=ROOT,
                env=env,
                start_new_session=os.name == "posix",
            )
            processes.append((name, process))

        while not stopping:
            for name, process in processes:
                code = process.poll()
                if code is not None and not stopping:
                    print(f"{name} stopped (exit code {code}).", file=sys.stderr)
                    return 1
            time.sleep(0.2)
        return 0
    except OSError as exc:
        print(f"Could not start {name}: {exc}", file=sys.stderr)
        return 1
    finally:
        if processes:
            print("Stopping Nabu backends…", flush=True)
            stop_services(processes)


if __name__ == "__main__":
    sys.exit(main())
