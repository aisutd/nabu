import io
import unittest
import wave
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Lock
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pronounciation.speaking import create_speaking_router


def wav_bytes():
    output = io.BytesIO()
    with wave.open(output, 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(16000)
        audio.writeframes(b'\0\0' * 1600)
    return output.getvalue()


class SpeakingServiceTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.data = Path(self.directory.name)
        self.refs = self.data / 'references'
        self.refs.mkdir()
        self.recording_id = uuid4()
        self.audio = self.data / f'{self.recording_id}.wav'
        self.audio.write_bytes(wav_bytes())
        self.compare = Mock(return_value={
            'feedback': [{'stage': 'start', 'notes': ['Close to the example']}],
            'neural': {'available': True, 'cosine_similarity': 0.1},
        })
        app = FastAPI()
        app.include_router(create_speaking_router(self.data, self.refs, {'june': 'june_browser.mp4'}, Mock(), self.compare, Lock()))
        self.client = TestClient(app)
        self.check = patch('pronounciation.speaking.check', return_value=('june', True)).start()
        self.addCleanup(patch.stopall)

    def review(self, **kwargs):
        return self.client.post('/speaking/review', json={'recording_id': str(self.recording_id), **kwargs})

    def video(self):
        self.audio.unlink()
        (self.data / f'{self.recording_id}.mp4').write_bytes(b'demo video')
        (self.refs / 'june_browser.mp4').write_bytes(b'demo reference')
        patch('pronounciation.speaking.prepare_wav', return_value='prepared.wav').start()

    def test_audio_expected_word_never_runs_mouth_model(self):
        result = self.review(expected_text='june').json()
        self.assertTrue(result['transcription']['match'])
        self.assertEqual(result['feedback']['title'], 'You said the word correctly.')
        self.assertEqual(result['checks']['mouth']['status'], 'skipped')
        self.compare.assert_not_called()

    def test_free_response_does_not_assign_correctness(self):
        result = self.review().json()
        self.assertIsNone(result['transcription']['match'])
        self.assertIsNone(result['transcription']['expected'])
        self.assertEqual(result['feedback']['title'], 'Here’s what we heard')
        self.compare.assert_not_called()

    def test_sentence_uses_speech_only(self):
        self.video()
        self.check.return_value = ('hello there', True)
        result = self.review(expected_text='hello there').json()
        self.assertEqual(result['feedback']['title'], 'You said the expected phrase.')
        self.assertIn('sentences', result['checks']['neural']['reason'])
        self.compare.assert_not_called()

    def test_hidden_reference_is_selected_on_server(self):
        self.video()
        result = self.review(expected_text='june').json()
        self.assertEqual(result['checks']['mouth']['status'], 'complete')
        self.compare.assert_called_once()
        user_id, reference_id, word = self.compare.call_args.args
        self.assertEqual(user_id, self.recording_id)
        self.assertEqual(word, 'june')
        self.assertEqual((self.data / f'{reference_id}.mp4').read_bytes(), b'demo reference')

    def test_server_exercise_answer_overrides_client_answer(self):
        result = self.review(exercise_id='say-june', expected_text='back').json()
        self.assertEqual(result['expected_text'], 'june')
        self.check.assert_called_once_with(self.audio, 'june')

    def test_unknown_exercise_is_rejected(self):
        self.assertEqual(self.review(exercise_id='not-installed').status_code, 404)
        self.check.assert_not_called()

    def test_missing_reference_does_not_break_speech(self):
        self.video()
        (self.refs / 'june_browser.mp4').unlink()
        result = self.review(expected_text='june').json()
        self.assertEqual(result['checks']['speech']['status'], 'complete')
        self.assertEqual(result['checks']['mouth']['status'], 'skipped')
        self.compare.assert_not_called()

    def test_speech_failure_preserves_mouth_result(self):
        self.video()
        self.check.side_effect = ValueError('no audio')
        with self.assertLogs('pronounciation.speaking', level='ERROR'):
            result = self.review(expected_text='june').json()
        self.assertEqual(result['checks']['speech']['status'], 'failed')
        self.assertIsNotNone(result['comparison'])

    def test_missing_recording_is_rejected(self):
        self.audio.unlink()
        self.assertEqual(self.review(expected_text='june').status_code, 404)

    def test_upload_normalizes_audio(self):
        response = self.client.post('/speaking/recordings', data={'capture': 'audio'}, files={'media': ('attempt.wav', wav_bytes(), 'audio/wav')})
        self.assertEqual(response.status_code, 201)
        result = response.json()
        with wave.open(str(self.data / f'{result["id"]}.wav')) as audio:
            self.assertEqual((audio.getnchannels(), audio.getframerate(), audio.getsampwidth()), (1, 16000, 2))

    def test_exercise_metadata(self):
        result = self.client.get('/speaking/exercises/say-june').json()
        self.assertEqual(result['expected_text'], 'june')
        self.assertEqual(result['reference_word'], 'june')


if __name__ == '__main__':
    unittest.main()
