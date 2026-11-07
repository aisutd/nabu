import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient
from pronounciation import api
from pronounciation.learner_feedback import learner_feedback


class LearnerWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(api.app)
        self.params = {"user_id": str(uuid4()), "example_id": str(uuid4()), "label": "june"}
        self.comparison = {"feedback": [{"stage": "start", "notes": ["Your mouth opens less than the example"]}],
                           "neural": {"available": True, "cosine_similarity": -0.053}}

    def test_feedback_uses_geometry_without_neural_cutoffs(self):
        result = learner_feedback({"heard": "june", "match": True}, self.comparison)
        self.assertEqual(result["title"], "You said the word correctly.")
        self.assertIn("start", result["next_action"])
        self.assertIn("opens less", result["observations"][1])
        self.assertEqual(result["neural_status"], "available")
        self.assertNotIn("incorrect", str(result))

    def test_word_mismatch_prioritizes_replay(self):
        result = learner_feedback({"heard": "back", "match": False}, self.comparison)
        self.assertEqual(result["title"], "Listen to your attempt again")

    def test_no_results_gives_recording_guidance(self):
        self.assertEqual(learner_feedback(None, None)["title"], "Try another recording")

    def test_review_preserves_comparison_when_audio_fails(self):
        with patch.object(api, "video_path"), patch.object(api, "transcription", side_effect=HTTPException(422, "No audio")), patch.object(api, "comparison", return_value=self.comparison):
            response = self.client.post("/practice/review", params=self.params)
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertEqual(result["errors"], {"transcription": "No audio"})
        self.assertIsNotNone(result["comparison"])
        self.assertIsNone(result["transcription"])

    def test_review_preserves_speech_when_comparison_fails(self):
        speech = {"heard": "june", "expected": "june", "match": True}
        with patch.object(api, "video_path"), patch.object(api, "transcription", return_value=speech), patch.object(api, "comparison", side_effect=HTTPException(422, "No mouth")):
            result = self.client.post("/practice/review", params=self.params).json()
        self.assertEqual(result["transcription"], speech)
        self.assertEqual(result["errors"], {"comparison": "No mouth"})
        self.assertEqual(result["feedback"]["title"], "You said the word correctly.")

    def test_review_rejects_phrase(self):
        response = self.client.post("/practice/review", params={**self.params, "label": "two words"})
        self.assertEqual(response.status_code, 422)

    def test_library_only_lists_installed_references(self):
        with TemporaryDirectory() as directory:
            Path(directory, "june_browser.mp4").write_bytes(b"demo")
            with patch.object(api, "REFERENCE_DIR", Path(directory)):
                words = self.client.get("/practice").json()
                self.assertEqual([item["word"] for item in words], ["june"])
                self.assertFalse(words[0]["has_audio"])
                self.assertEqual(self.client.get("/practice/june/video").content, b"demo")
                self.assertEqual(self.client.get("/practice/bad/video").status_code, 404)
                self.assertEqual(self.client.get("/practice/unknown/video").status_code, 404)


if __name__ == "__main__":
    unittest.main()
