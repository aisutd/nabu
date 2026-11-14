from types import SimpleNamespace

import numpy as np
from test_sign_motion import FPS, still, sweep

from asl_core import NO_SIGN, HybridRecognizer, Transcript

WIDTH = 640
HEIGHT = 480


class FixedModel:
    """Stands in for a trained model: always gives the same probabilities."""

    def __init__(self, probabilities):
        self.probabilities = np.array([probabilities])

    def predict_proba(self, features):
        return self.probabilities


def letter_bundle(chance_of_a=0.9):
    model = FixedModel([chance_of_a, 1 - chance_of_a])
    return {"model": model, "labels": ["A", "B"]}


def sign_bundle(sign, chance=0.9):
    other = "hello" if sign == NO_SIGN else NO_SIGN
    return {"model": FixedModel([chance, 1 - chance]), "labels": [sign, other]}


def as_landmarks(points):
    return [SimpleNamespace(x=x / WIDTH, y=y / HEIGHT, z=z / WIDTH) for x, y, z in points]


def run(recognizer, frames, start=0.0):
    for index, points in enumerate(frames):
        landmarks = as_landmarks(points) if points is not None else None
        recognizer.update(landmarks, WIDTH, HEIGHT, start + index / FPS)


def rest_sign_rest():
    return still(30) + sweep(20) + still(40, x=300.0 + 15 * 19)


def test_transcript_keeps_words_apart():
    transcript = Transcript()
    for letter in "NABU":
        transcript.add_letter(letter)
    transcript.add_word("HELLO")
    transcript.add_letter("A")
    transcript.backspace()
    assert transcript.text == "NABU HELLO "


def test_a_steady_letter_is_added_once():
    recognizer = HybridRecognizer(letter_bundle())
    run(recognizer, still(30))
    assert recognizer.transcript.text == "A"
    assert recognizer.state["mode"] == "letter"


def test_an_unsure_letter_is_not_added():
    recognizer = HybridRecognizer(letter_bundle(chance_of_a=0.5))
    run(recognizer, still(30))
    assert recognizer.transcript.text == ""


def test_the_same_letter_twice_needs_the_hand_to_leave():
    recognizer = HybridRecognizer(letter_bundle())
    run(recognizer, still(15) + [None] * 10 + still(15))
    assert recognizer.transcript.text == "AA"


def test_a_confident_sign_is_added_as_a_word():
    recognizer = HybridRecognizer(letter_bundle(), sign_bundle("thank_you"))
    run(recognizer, rest_sign_rest())
    assert "THANK YOU" in recognizer.transcript.text
    assert recognizer.state["last_sign"]["label"] == "THANK YOU"


def test_no_sign_adds_no_word():
    recognizer = HybridRecognizer(letter_bundle(), sign_bundle(NO_SIGN))
    run(recognizer, rest_sign_rest())
    assert recognizer.transcript.text.replace("A", "") == ""


def test_an_unsure_sign_adds_no_word():
    recognizer = HybridRecognizer(letter_bundle(), sign_bundle("hello", chance=0.5))
    run(recognizer, rest_sign_rest())
    assert "HELLO" not in recognizer.transcript.text


def test_without_a_sign_model_movements_are_ignored():
    recognizer = HybridRecognizer(letter_bundle())
    run(recognizer, rest_sign_rest())
    assert recognizer.state["signs_enabled"] is False
    assert recognizer.transcript.text.replace("A", "") == ""
