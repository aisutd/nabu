import time
from collections import Counter, deque

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
STATIC_LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY"
# Bump this whenever the recipe changes, so the live app refuses models trained on the old one.
RECIPE_VERSION = 2
FEATURE_COUNT = 63
SEED = 42
# Extraction and the live app must use the same value, or they see different hands.
DETECTION_CONFIDENCE = 0.5
# Live smoothing: a letter must be this likely in a frame, then win this many recent frames.
MIN_LETTER_CONFIDENCE = 0.6
VOTE_WINDOW = 7
MIN_VOTES = 4

# Moving signs. "no_sign" covers moves that aren't words, like changing between letters.
DYNAMIC_SIGNS = ["hello", "thank_you", "yes", "no", "no_sign", "happy", "birthday"]
SEQUENCE_FRAMES = 20
FRAME_FEATURE_COUNT = FEATURE_COUNT + 2  # hand shape, plus the wrist's path
# Hand speed is measured in hand-sizes per second, so distance from the camera doesn't matter.
# Two thresholds (start high, stop low) stop the state from flickering near one value.
MOTION_START_SPEED = 0.8
MOTION_STOP_SPEED = 0.4
SPEED_SMOOTHING = 0.5  # weight of the newest frame when averaging speed
STILL_SECONDS_TO_END = 0.25
MIN_SIGN_SECONDS = 0.15  # a quick finger snap, like NO, lasts about 0.2 seconds
MAX_SIGN_SECONDS = 3.0
PRE_ROLL_FRAMES = 3  # frames kept from just before motion is noticed
MIN_SIGN_CONFIDENCE = 0.6
# After a sign ends, the hand often holds its final shape; don't read that as a letter.
LETTERS_PAUSE_AFTER_SIGN_SECONDS = 0.6
NO_SIGN = "no_sign"
# Below this size, dividing by the hand's size would only amplify noise.
MIN_HAND_SIZE = 1e-6
# Training-only variation, in degrees of tilt and hand-sizes of position noise.
MAX_JITTER_DEGREES = 10
JITTER_NOISE = 0.02


def landmarks_to_pixels(landmarks, width, height):
    """Convert MediaPipe's 0-to-1 landmarks into a (21, 3) array of pixels, or None if invalid."""
    points = np.array(
        [[lm.x * width, lm.y * height, lm.z * width] for lm in landmarks],
        dtype=np.float32,
    )
    if points.shape != (21, 3) or not np.isfinite(points).all():
        return None
    return points


def normalize_pixels(points):
    """Convert (21, 3) pixel points into 63 wrist-centered, size-normalized values."""
    centered = points - points[0]
    scale = np.linalg.norm(centered[9])
    if scale < MIN_HAND_SIZE:
        return None
    return (centered / scale).flatten()


def normalize_landmarks(landmarks, width, height):
    """Convert 21 hand landmarks into 63 wrist-centered, size-normalized values."""
    points = landmarks_to_pixels(landmarks, width, height)
    if points is None:
        return None
    return normalize_pixels(points)


def mirror_features(features):
    """Return left/right mirrored copies of feature rows shaped (samples, 63)."""
    mirrored = features.reshape(-1, 21, 3).copy()
    # Coordinates are relative to the wrist, so mirroring only flips the sign of x.
    mirrored[:, :, 0] *= -1
    return mirrored.reshape(-1, 63)


def features_from_pixels(pixels):
    """Apply the recipe to saved (samples, 21, 3) pixels, dropping any degenerate hands.

    Returns the features and a True/False mask of which samples were kept.
    """
    normalized = [normalize_pixels(points) for points in pixels]
    kept = np.array([vector is not None for vector in normalized], dtype=bool)
    usable = [vector for vector in normalized if vector is not None]
    return np.asarray(usable, dtype=np.float32).reshape(-1, 63), kept


def jitter_features(features, rng):
    """Return copies with a small random tilt and position noise, for training data only.

    The tilt stays small because some letters, like H and U, differ mainly by orientation.
    """
    points = features.reshape(-1, 21, 3).copy()
    angles = np.radians(rng.uniform(-MAX_JITTER_DEGREES, MAX_JITTER_DEGREES, len(points)))
    cosines, sines = np.cos(angles)[:, None], np.sin(angles)[:, None]
    x, y = points[:, :, 0].copy(), points[:, :, 1].copy()
    points[:, :, 0] = x * cosines - y * sines
    points[:, :, 1] = x * sines + y * cosines
    points += rng.normal(0, JITTER_NOISE, points.shape)
    return points.reshape(-1, 63).astype(np.float32)


def per_letter_recall(confusion):
    """Return the fraction of each letter's samples predicted correctly."""
    return confusion.diagonal() / np.maximum(confusion.sum(axis=1), 1)


def most_confused_pairs(confusion, letters, count=10):
    """Return the largest mistakes as (actual, predicted, number of samples), biggest first."""
    mistakes = confusion.copy()
    np.fill_diagonal(mistakes, 0)
    largest = np.argsort(mistakes, axis=None)[::-1][:count]
    pairs = []
    for actual, predicted in zip(*np.unravel_index(largest, mistakes.shape), strict=True):
        if mistakes[actual, predicted] > 0:
            pairs.append((letters[actual], letters[predicted], int(mistakes[actual, predicted])))
    return pairs


def load_recorded_session(path):
    """Return a recorded session's features and integer letter labels."""
    with np.load(path) as data:
        pixels, letters = data["pixels"], data["letters"]
    features, kept = features_from_pixels(pixels)
    labels = np.array([ALPHABET.index(letter) for letter in letters[kept]])
    return features, labels


def make_training_set(parts, use_jitter):
    """Combine (features, labels) parts and add mirrored copies, plus jittered copies if asked."""
    features = np.concatenate([part[0] for part in parts])
    labels = np.concatenate([part[1] for part in parts])
    all_features = [features, mirror_features(features)]
    if use_jitter:
        rng = np.random.default_rng(SEED)
        all_features.extend(jitter_features(copy, rng) for copy in list(all_features))
    return np.concatenate(all_features), np.tile(labels, len(all_features))


def make_letter_network():
    """Return an untrained neural network, with inputs scaled to similar ranges first."""
    network = MLPClassifier(
        hidden_layer_sizes=(128, 64), early_stopping=True, max_iter=100, random_state=SEED
    )
    return make_pipeline(StandardScaler(), network)


def make_model_bundle(model):
    """Package a trained model with what the live app needs to check and use it."""
    return {
        "model": model,
        "recipe_version": RECIPE_VERSION,
        "feature_count": FEATURE_COUNT,
        "labels": [ALPHABET[int(label)] for label in model.classes_],
    }


def check_model_bundle(bundle):
    """Raise an error if a saved model wasn't trained with the current recipe."""
    if not isinstance(bundle, dict) or bundle.get("recipe_version") != RECIPE_VERSION:
        raise ValueError("This model uses an old recipe. Rerun 2_train_model.py.")
    if bundle.get("feature_count") != FEATURE_COUNT:
        raise ValueError("This model expects a different feature size. Rerun 2_train_model.py.")


def predict_top3(model, labels, landmarks, width, height):
    """Return the three most likely (letter, probability) pairs, or [] for an unusable hand."""
    features = normalize_landmarks(landmarks, width, height)
    if features is None:
        return []
    probabilities = model.predict_proba(features.reshape(1, -1))[0]
    indices = np.argsort(probabilities)[::-1][:3]
    return [(labels[index], float(probabilities[index])) for index in indices]


def confident_letter(predictions):
    """Return the top letter if the model is sure enough, otherwise None."""
    if predictions and predictions[0][1] >= MIN_LETTER_CONFIDENCE:
        return predictions[0][0]
    return None


class VoteSmoother:
    """Only reports a letter once it has won enough of the recent frames."""

    def __init__(self, window=VOTE_WINDOW, min_votes=MIN_VOTES):
        self.votes = deque(maxlen=window)
        self.min_votes = min_votes

    def update(self, letter):
        """Add this frame's letter, or None for no opinion, and return the winner or None."""
        self.votes.append(letter)
        counts = Counter(vote for vote in self.votes if vote is not None)
        if not counts:
            return None
        winner, votes = counts.most_common(1)[0]
        return winner if votes >= self.min_votes else None


def make_video_detector(model_path):
    """Return a hand detector that processes frames in order on the calling thread."""
    options = vision.HandLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.VIDEO,
        num_hands=1,
        min_hand_detection_confidence=DETECTION_CONFIDENCE,
    )
    return vision.HandLandmarker.create_from_options(options)


class HandReader:
    """Reads webcam frames and finds the hand in each one."""

    def __init__(self, cap, detector):
        self.cap = cap
        self.detector = detector
        self.last_timestamp = -1

    def read(self):
        """Return the next frame and its landmarks, or None for landmarks if no hand is found."""
        success, frame = self.cap.read()
        if not success:
            raise RuntimeError("Could not read from the webcam.")
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        # MediaPipe rejects repeated timestamps, and two frames can land in the same millisecond.
        self.last_timestamp = max(time.monotonic_ns() // 1_000_000, self.last_timestamp + 1)
        result = self.detector.detect_for_video(image, self.last_timestamp)
        return frame, result.hand_landmarks[0] if result.hand_landmarks else None


def hand_size(points):
    """Return the wrist-to-middle-knuckle distance in pixels."""
    return float(np.linalg.norm(points[9] - points[0]))


def sequence_features(pixels):
    """Turn one sign's (frames, 21, 3) pixels into a fixed-length vector.

    Each frame gets the 63 hand-shape numbers plus the wrist's movement since the first
    frame, measured in hand-sizes. The sign is then resampled to SEQUENCE_FRAMES frames,
    so fast and slow signers produce the same length. Returns None if unusable.
    """
    shapes = [normalize_pixels(points) for points in pixels]
    usable = [index for index, shape in enumerate(shapes) if shape is not None]
    if len(usable) < 2:  # noqa: PLR2004 - resampling needs a start and an end
        return None
    points = np.asarray(pixels, dtype=np.float32)[usable]
    scale = float(np.median([hand_size(frame) for frame in points]))
    path = (points[:, 0, :2] - points[0, 0, :2]) / scale
    frames = np.hstack([np.stack([shapes[index] for index in usable]), path])
    old_positions = np.linspace(0, 1, len(frames))
    new_positions = np.linspace(0, 1, SEQUENCE_FRAMES)
    columns = [np.interp(new_positions, old_positions, column) for column in frames.T]
    return np.stack(columns, axis=1).astype(np.float32).flatten()


def mirror_sequence_features(features):
    """Return left/right mirrored copies of sequence feature rows, for training only."""
    frames = features.reshape(-1, SEQUENCE_FRAMES, FRAME_FEATURE_COUNT).copy()
    frames[:, :, 0:FEATURE_COUNT:3] *= -1  # every landmark's x
    frames[:, :, FEATURE_COUNT] *= -1  # the wrist path's x
    return frames.reshape(len(features), -1)


class MotionSegmenter:
    """Watches hand speed and hands back each complete movement as a list of frames.

    Feed it one frame at a time. It returns a (frames, 21, 3) array when a movement ends,
    and None otherwise. `moving` says whether a movement is in progress right now.
    """

    def __init__(self):
        self.speed = 0.0
        self.moving = False
        self.previous = None
        self.recent = deque(maxlen=PRE_ROLL_FRAMES)
        self.frames = []
        self.start_time = 0.0
        self.still_since = None
        self.frames_before_still = 0

    def update(self, points, now):
        """Add one frame's (21, 3) pixels, or None if no hand, taken at `now` seconds."""
        if points is None:
            segment = self._finish()
            self.previous = None
            self.speed = 0.0
            return segment
        self._update_speed(points, now)
        if not self.moving:
            self._watch_for_start(points, now)
            return None
        self.frames.append(points)
        return self._watch_for_end(now)

    def _update_speed(self, points, now):
        if self.previous is not None:
            previous_points, previous_time = self.previous
            seconds = max(now - previous_time, 1e-3)
            moved = np.linalg.norm(points - previous_points, axis=1).mean()
            raw_speed = moved / max(hand_size(points), MIN_HAND_SIZE) / seconds
            self.speed = SPEED_SMOOTHING * raw_speed + (1 - SPEED_SMOOTHING) * self.speed
        self.previous = (points, now)

    def _watch_for_start(self, points, now):
        self.recent.append(points)
        if self.speed >= MOTION_START_SPEED:
            self.moving = True
            self.frames = list(self.recent)
            self.start_time = now
            self.still_since = None

    def _watch_for_end(self, now):
        if now - self.start_time > MAX_SIGN_SECONDS:
            self._reset()  # Too long to be one sign, such as waving around.
            return None
        if self.speed >= MOTION_STOP_SPEED:
            self.still_since = None
            return None
        if self.still_since is None:
            self.still_since = now
            self.frames_before_still = len(self.frames)
        if now - self.still_since >= STILL_SECONDS_TO_END:
            return self._finish()
        return None

    def _finish(self):
        """End the current movement and return it, or None if it was too short to be a sign."""
        if not self.moving:
            self._reset()
            return None
        end = self.frames_before_still if self.still_since is not None else len(self.frames)
        duration = (self.still_since or self.previous[1]) - self.start_time
        segment = np.stack(self.frames[:end]) if end else None
        self._reset()
        if segment is None or duration < MIN_SIGN_SECONDS:
            return None
        return segment

    def _reset(self):
        self.moving = False
        self.frames = []
        self.recent.clear()
        self.still_since = None


def check_sign_bundle(bundle):
    """Raise an error if a saved sign model doesn't match the current sequence recipe."""
    if not isinstance(bundle, dict) or bundle.get("recipe_version") != RECIPE_VERSION:
        raise ValueError("This sign model uses an old recipe. Rerun 7_train_signs.py.")
    if bundle.get("sequence_frames") != SEQUENCE_FRAMES:
        raise ValueError("This sign model expects a different length. Rerun 7_train_signs.py.")


def predict_sign(bundle, segment):
    """Return the most likely (sign, probability) for one movement, or None if unusable."""
    features = sequence_features(segment)
    if features is None:
        return None
    probabilities = bundle["model"].predict_proba(features.reshape(1, -1))[0]
    best = int(np.argmax(probabilities))
    return bundle["labels"][best], float(probabilities[best])


def display_name(sign):
    return sign.replace("_", " ").upper()


class Transcript:
    """The running text: letters join into words, and signed words are separated by spaces."""

    def __init__(self):
        self.text = ""

    def add_letter(self, letter):
        self.text += letter

    def add_word(self, word):
        self.space()
        self.text += word + " "

    def space(self):
        if self.text and not self.text.endswith(" "):
            self.text += " "

    def backspace(self):
        self.text = self.text[:-1]

    def clear(self):
        self.text = ""


class HybridRecognizer:
    """Reads letters while the hand is still and signs when it moves.

    Call update() once per frame. The latest results are in `state`, and the text in
    `transcript`. Without a sign model it still reads letters, and ignores movements.
    """

    def __init__(self, letter_bundle, sign_bundle=None):
        self.letter_bundle = letter_bundle
        self.sign_bundle = sign_bundle
        self.segmenter = MotionSegmenter()
        self.smoother = VoteSmoother()
        self.transcript = Transcript()
        self.last_letter = None
        self.letters_paused_until = 0.0
        self.last_sign = None
        self.state = {}

    def update(self, landmarks, width, height, now):
        points = landmarks_to_pixels(landmarks, width, height) if landmarks else None
        segment = self.segmenter.update(points, now)
        if segment is not None:
            self._read_sign(segment, now)
        predictions = []
        if points is None or self.segmenter.moving or now < self.letters_paused_until:
            self._forget_letter()
        else:
            model, letters = self.letter_bundle["model"], self.letter_bundle["labels"]
            predictions = predict_top3(model, letters, landmarks, width, height)
            self._read_letter(self.smoother.update(confident_letter(predictions)))
        self._save_state(points, predictions)

    def _read_letter(self, stable_letter):
        """Add a letter once when it becomes steady; the same letter again needs a pause."""
        if stable_letter and stable_letter != self.last_letter:
            self.transcript.add_letter(stable_letter)
        self.last_letter = stable_letter

    def _forget_letter(self):
        self.smoother = VoteSmoother()
        self.last_letter = None

    def _read_sign(self, segment, now):
        self.letters_paused_until = now + LETTERS_PAUSE_AFTER_SIGN_SECONDS
        if self.sign_bundle is None:
            return
        self.last_sign = predict_sign(self.sign_bundle, segment)
        if self.last_sign is None:
            return
        sign, probability = self.last_sign
        if sign != NO_SIGN and probability >= MIN_SIGN_CONFIDENCE:
            self.transcript.add_word(display_name(sign))

    def _save_state(self, points, predictions):
        if points is None:
            mode = "no_hand"
        elif self.segmenter.moving:
            mode = "moving"
        else:
            mode = "letter"
        self.state = {
            "mode": mode,
            "text": self.transcript.text,
            "letter": self.last_letter,
            "guesses": [{"label": label, "chance": chance} for label, chance in predictions],
            "last_sign": None,
            "speed": round(float(self.segmenter.speed), 2),  # plain float, so JSON can send it
            "signs_enabled": self.sign_bundle is not None,
        }
        if self.last_sign is not None:
            sign, chance = self.last_sign
            self.state["last_sign"] = {"label": display_name(sign), "chance": chance}
