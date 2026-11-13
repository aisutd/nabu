from types import SimpleNamespace

import numpy as np
import pytest

from asl_core import (
    FEATURE_COUNT,
    RECIPE_VERSION,
    VoteSmoother,
    check_model_bundle,
    confident_letter,
    features_from_pixels,
    jitter_features,
    landmarks_to_pixels,
    make_training_set,
    mirror_features,
    most_confused_pairs,
    normalize_landmarks,
    normalize_pixels,
    per_letter_recall,
)

WIDTH = 640
HEIGHT = 480


def fake_pixel_hand():
    """Return a repeatable, non-symmetric hand as 21 (x, y, z) pixel points."""
    points = np.random.default_rng(seed=0).uniform(-60, 60, size=(21, 3))
    points[0] = [0, 0, 0]
    points[:, 0] += 300
    points[:, 1] += 200
    return points


def to_landmarks(pixel_points, width=WIDTH, height=HEIGHT):
    """Convert pixel points to the 0-to-1 landmarks MediaPipe would report."""
    return [SimpleNamespace(x=x / width, y=y / height, z=z / width) for x, y, z in pixel_points]


def recipe(pixel_points, width=WIDTH, height=HEIGHT):
    return normalize_landmarks(to_landmarks(pixel_points, width, height), width, height)


def test_recipe_returns_63_numbers():
    assert recipe(fake_pixel_hand()).shape == (63,)


def test_recipe_ignores_hand_position():
    hand = fake_pixel_hand()
    moved = hand + [40, -25, 0]
    assert recipe(moved) == pytest.approx(recipe(hand), abs=1e-5)


def test_recipe_ignores_hand_size():
    hand = fake_pixel_hand()
    assert recipe(hand * 1.5) == pytest.approx(recipe(hand), abs=1e-5)


def test_recipe_ignores_picture_aspect_ratio():
    hand = fake_pixel_hand()
    square = recipe(hand, width=640, height=640)
    wide = recipe(hand, width=640, height=480)
    assert square == pytest.approx(wide, abs=1e-5)


def test_mirror_features_matches_a_truly_mirrored_hand():
    hand = fake_pixel_hand()
    flipped = hand.copy()
    flipped[:, 0] = WIDTH - flipped[:, 0]
    assert mirror_features(recipe(hand).reshape(1, -1))[0] == pytest.approx(
        recipe(flipped), abs=1e-5
    )


def test_recipe_rejects_a_hand_with_no_size():
    assert recipe(np.zeros((21, 3))) is None


def test_recipe_rejects_a_wrong_number_of_landmarks():
    assert recipe(fake_pixel_hand()[:20]) is None


def test_saved_pixels_give_the_same_features_as_live_landmarks():
    landmarks = to_landmarks(fake_pixel_hand())
    pixels = landmarks_to_pixels(landmarks, WIDTH, HEIGHT)
    assert normalize_pixels(pixels) == pytest.approx(
        normalize_landmarks(landmarks, WIDTH, HEIGHT)
    )


def test_normalize_pixels_leaves_the_saved_points_unchanged():
    pixels = fake_pixel_hand().astype(np.float32)
    original = pixels.copy()
    normalize_pixels(pixels)
    assert np.array_equal(pixels, original)


def test_features_from_pixels_drops_degenerate_hands():
    good = fake_pixel_hand().astype(np.float32)
    pixels = np.stack([good, np.zeros((21, 3), dtype=np.float32)])
    features, kept = features_from_pixels(pixels)
    assert features.shape == (1, 63)
    assert kept.tolist() == [True, False]
    assert features[0] == pytest.approx(normalize_pixels(good))


def test_jitter_keeps_the_shape_and_changes_the_values_slightly():
    features = recipe(fake_pixel_hand()).reshape(1, -1)
    jittered = jitter_features(features, np.random.default_rng(seed=0))
    assert jittered.shape == features.shape
    assert not np.array_equal(jittered, features)
    assert np.abs(jittered - features).max() < 1.0


def test_per_letter_recall():
    confusion = np.array([[8, 2], [1, 3]])
    assert per_letter_recall(confusion) == pytest.approx([0.8, 0.75])


def test_training_set_keeps_features_and_labels_lined_up():
    features = recipe(fake_pixel_hand()).reshape(1, -1)
    parts = [(features, np.array([3])), (features, np.array([7]))]
    plain_x, plain_y = make_training_set(parts, use_jitter=False)
    jitter_x, jitter_y = make_training_set(parts, use_jitter=True)
    assert plain_x.shape == (4, 63)
    assert plain_y.tolist() == [3, 7, 3, 7]
    assert jitter_x.shape == (8, 63)
    assert jitter_y.tolist() == [3, 7] * 4


def test_confident_letter_rejects_an_unsure_model():
    assert confident_letter([("A", 0.9), ("B", 0.1)]) == "A"
    assert confident_letter([("A", 0.4), ("B", 0.3)]) is None
    assert confident_letter([]) is None


def test_vote_smoother_waits_for_enough_votes():
    smoother = VoteSmoother(window=7, min_votes=4)
    results = [smoother.update("A") for _ in range(4)]
    assert results == [None, None, None, "A"]


def test_vote_smoother_ignores_a_brief_flicker():
    smoother = VoteSmoother(window=7, min_votes=4)
    for _ in range(4):
        smoother.update("A")
    assert smoother.update("B") == "A"


def test_vote_smoother_clears_after_the_hand_is_gone():
    smoother = VoteSmoother(window=7, min_votes=4)
    for _ in range(4):
        smoother.update("A")
    results = [smoother.update(None) for _ in range(7)]
    assert results[-1] is None


def test_check_model_bundle_accepts_the_current_recipe():
    check_model_bundle({"recipe_version": RECIPE_VERSION, "feature_count": FEATURE_COUNT})


@pytest.mark.parametrize(
    "bundle",
    [
        "a model saved before bundles existed",
        {"recipe_version": RECIPE_VERSION - 1, "feature_count": FEATURE_COUNT},
        {"recipe_version": RECIPE_VERSION, "feature_count": 42},
    ],
)
def test_check_model_bundle_refuses_a_mismatch(bundle):
    with pytest.raises(ValueError):
        check_model_bundle(bundle)


def test_most_confused_pairs_lists_biggest_mistakes_and_skips_zero():
    confusion = np.array([[9, 3, 0], [1, 9, 0], [0, 0, 9]])
    assert most_confused_pairs(confusion, "ABC") == [("A", "B", 3), ("B", "A", 1)]
