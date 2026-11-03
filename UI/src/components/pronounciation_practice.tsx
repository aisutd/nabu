import { useEffect, useRef, useState } from 'react'
import VideoRecorder from './VideoRecorder'
import {
  compareRecordings,
  mediaUrl,
  transcribeRecording,
  uploadVideo,
} from '../api/pronounciation'
import type {
  Comparison,
  Transcription,
} from '../api/pronounciation'

function VideoPreview({ file }: { file: File | null }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!file || !video) return

    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl

    return () => {
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  if (!file) return null

  return <video ref={videoRef} controls playsInline />
}

export default function PronunciationPractice() {
  const [word, setWord] = useState('')
  const [example, setExample] = useState<File | null>(null)
  const [recording, setRecording] = useState<File | null>(null)

  const [exampleId, setExampleId] = useState<string | null>(null)
  const [recordingId, setRecordingId] = useState<string | null>(null)

  const [transcription, setTranscription] =
    useState<Transcription | null>(null)
  const [comparison, setComparison] = useState<Comparison | null>(null)

  const [busy, setBusy] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [plotVersion, setPlotVersion] = useState(0)

  function clearResults() {
    setTranscription(null)
    setComparison(null)
    setStatus('')
    setError('')
  }

  async function analyze(mode: 'transcription' | 'comparison') {
    const label = word.trim()

    if (!label || !recording || (mode === 'comparison' && !example)) {
      setError('Enter a word and select the required videos.')
      return
    }

    setBusy(true)
    setError('')

    try {
      let userId = recordingId

      if (!userId) {
        setStatus('Uploading your recording...')
        userId = (await uploadVideo(recording)).id
        setRecordingId(userId)
      }

      if (mode === 'transcription') {
        setStatus('Checking what you said...')
        setTranscription(await transcribeRecording(userId, label))
      } else {
        let referenceId = exampleId

        if (!referenceId) {
          setStatus('Uploading the example...')
          referenceId = (await uploadVideo(example!)).id
          setExampleId(referenceId)
        }

        setStatus('Comparing mouth movement...')
        const result = await compareRecordings(
          userId,
          referenceId,
          label,
        )

        setComparison(result)
        setPlotVersion(Date.now())
      }

      setStatus('Done.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="practice">
      <h1>Pronunciation practice</h1>
      <p>
        Compare your mouth movement with an example saying the same word.
      </p>

      <fieldset disabled={busy}>
        <label>
          Word or phrase
          <input
            value={word}
            placeholder="For example: hello"
            onChange={(event) => {
              setWord(event.target.value)
              clearResults()
            }}
          />
        </label>

        <div className="video-grid">
          <section className="card">
            <h2>Example</h2>
            <label>
              Upload a reference video
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.m4v"
                onChange={(event) => {
                  setExample(event.target.files?.[0] ?? null)
                  setExampleId(null)
                  clearResults()
                }}
              />
            </label>
            <VideoPreview file={example} />
          </section>

          <section className="card">
            <h2>Your recording</h2>
            <VideoRecorder
              disabled={busy}
              onRecordingChange={setCapturing}
              onRecording={(file) => {
                setRecording(file)
                setRecordingId(null)
                clearResults()
              }}
            />
            <label>
              Or select a video
              <input
                type="file"
                accept="video/*"
                disabled={capturing}
                onChange={(event) => {
                  setRecording(event.target.files?.[0] ?? null)
                  setRecordingId(null)
                  clearResults()
                }}
              />
            </label>
            <p>Keep your mouth visible and include audio.</p>
            {recording && <p>Selected recording: {recording.name}</p>}
            <VideoPreview file={recording} />
          </section>
        </div>

        <div className="actions">
          <button
            type="button"
            disabled={capturing || !word.trim() || !recording}
            onClick={() => void analyze('transcription')}
          >
            Check pronunciation
          </button>

          <button
            type="button"
            disabled={capturing || !word.trim() || !recording || !example}
            onClick={() => void analyze('comparison')}
          >
            Compare mouth movement
          </button>
        </div>
      </fieldset>

      <p role="status" aria-live="polite">{status}</p>
      {error && <p role="alert" className="error">{error}</p>}

      {transcription && (
        <section className="card">
          <h2>Speech recognition</h2>
          <p>Expected: {transcription.expected}</p>
          <p>Heard: {transcription.heard || '(No speech detected)'}</p>
          <p>
            {transcription.match
              ? 'The recognized words match.'
              : 'The recognized words do not match.'}
          </p>
        </section>
      )}

      {comparison && (
        <section className="card">
          <h2>Mouth movement results</h2>

          <p>
            Your duration: {comparison.user_ms} ms.
            Example duration: {comparison.example_ms} ms.
          </p>

          <ul>
            {comparison.feedback.map((item) => (
              <li key={item.stage}>
                <strong>{item.stage}:</strong> {item.notes.join('; ')}
              </li>
            ))}
          </ul>

          <img
            className="comparison-plot"
            src={`${mediaUrl(comparison.png_url)}?v=${plotVersion}`}
            alt="Graphs comparing mouth opening, width, and shape"
          />
        </section>
      )}
    </main>
  )
}
