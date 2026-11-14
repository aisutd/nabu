import numpy as np
import pytest

from asl_core import (
    FRAME_FEATURE_COUNT,
    SEQUENCE_FRAMES,
    MotionSegmenter,
    mirror_sequence_features,
    sequence_features,
)

FPS = 30
WIDTH = 640


def fake_hand(x=300.0, y=200.0, spread=1.0):
    """A repeatable 21-point hand in pixels; `spread` changes the finger shape."""
    points = np.random.default_rng(seed=1).uniform(-50, 50, size=(21, 3)).astype(np.float32)
    points[0] = [0, 0, 0]
    points[1:, :2] *= spread
    points[:, 0] += x
    points[:, 1] += y
    return points


def feed(segmenter, frames, start=0.0):
    """Feed frames at 30 fps and return every finished segment."""
    segments = []
    for index, points in enumerate(frames):
        segment = segmenter.update(points, start + index / FPS)
        if segment is not None:
            segments.append(segment)
    return segments


def still(count, x=300.0):
    return [fake_hand(x=x) for _ in range(count)]


def sweep(count, start_x=300.0, pixels_per_frame=15.0):
    return [fake_hand(x=start_x + pixels_per_frame * step) for step in range(count)]


def test_a_still_hand_gives_no_segment():
    assert feed(MotionSegmenter(), still(60)) == []


def test_a_small_jitter_gives_no_segment():
    rng = np.random.default_rng(seed=2)
    frames = [fake_hand() + rng.normal(0, 0.3, (21, 3)).astype(np.float32) for _ in range(60)]
    assert feed(MotionSegmenter(), frames) == []


def test_rest_move_rest_gives_one_segment_without_the_rests():
    frames = still(20) + sweep(20) + still(20, x=300.0 + 15 * 19)
    segments = feed(MotionSegmenter(), frames)
    assert len(segments) == 1
    assert 15 <= len(segments[0]) <= 26


def test_a_finger_snap_alone_counts_as_motion():
    # Fingers close by half in 0.2 seconds while the wrist stays put, like the sign NO.
    frames = still(20)
    frames += [fake_hand(spread=1.0 - 0.08 * step) for step in range(7)]
    frames += [fake_hand(spread=0.52)] * 20
    assert len(feed(MotionSegmenter(), frames)) == 1


def test_a_slow_drift_does_not_count_as_motion():
    frames = [fake_hand(x=300.0 + 0.5 * step) for step in range(60)]
    assert feed(MotionSegmenter(), frames) == []


def test_losing_the_hand_ends_the_movement():
    segmenter = MotionSegmenter()
    feed(segmenter, still(20) + sweep(15))
    assert segmenter.moving
    segment = segmenter.update(None, 2.0)
    assert segment is not None
    assert not segmenter.moving


def test_sequence_features_have_a_fixed_length():
    for count in (8, 45):
        assert sequence_features(np.stack(sweep(count))).shape == (
            SEQUENCE_FRAMES * FRAME_FEATURE_COUNT,
        )


def test_sequence_features_ignore_position_and_size():
    frames = np.stack(sweep(10))
    moved = frames + np.array([80, -40, 0], dtype=np.float32)
    bigger = frames * 1.7
    assert sequence_features(moved) == pytest.approx(sequence_features(frames), abs=1e-4)
    assert sequence_features(bigger) == pytest.approx(sequence_features(frames), abs=1e-4)


def test_mirrored_sequence_matches_a_truly_mirrored_sign():
    frames = np.stack(sweep(10))
    flipped = frames.copy()
    flipped[:, :, 0] = WIDTH - flipped[:, :, 0]
    mirrored = mirror_sequence_features(sequence_features(frames).reshape(1, -1))[0]
    assert mirrored == pytest.approx(sequence_features(flipped), abs=1e-4)


def test_sequence_features_need_two_usable_frames():
    assert sequence_features(np.stack([fake_hand()])) is None
