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

  return <video className="mt-4 block max-h-80 w-full rounded-lg bg-[#111]" ref={videoRef} controls playsInline />
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
    <main className="mx-auto max-w-[1050px] px-5 pt-[max(24px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <h1 className="mb-3 text-[2em] leading-normal font-bold">Pronunciation practice</h1>
      <p className="my-4">
        Compare your mouth movement with an example saying the same word.
      </p>

      <fieldset className="my-6 min-w-0 border-0 p-0" disabled={busy}>
        <label className="mb-4 grid gap-2">
          Word or phrase
          <input
            className="w-full rounded-lg border border-[#cbd2df] p-2.5"
            value={word}
            placeholder="For example: hello"
            onChange={(event) => {
              setWord(event.target.value)
              clearResults()
            }}
          />
        </label>

        <div className="my-6 grid grid-cols-1 gap-5 min-[651px]:grid-cols-2">
          <section className="mb-5 rounded-xl border border-[#dce1eb] bg-white p-5">
            <h2 className="mb-[0.83em] text-[1.5em] leading-normal font-bold">Example</h2>
            <label className="mb-4 grid gap-2">
              Upload a reference video
              <input
                className="w-full rounded-lg border border-[#cbd2df] p-2.5"
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

          <section className="mb-5 rounded-xl border border-[#dce1eb] bg-white p-5">
            <h2 className="mb-[0.83em] text-[1.5em] leading-normal font-bold">Your recording</h2>
            <VideoRecorder
              disabled={busy}
              onRecordingChange={setCapturing}
              onRecording={(file) => {
                setRecording(file)
                setRecordingId(null)
                clearResults()
              }}
            />
            <label className="mb-4 grid gap-2">
              Or select a video
              <input
                className="w-full rounded-lg border border-[#cbd2df] p-2.5"
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
            <p className="my-4">Keep your mouth visible and include audio.</p>
            {recording && <p className="my-4">Selected recording: {recording.name}</p>}
            <VideoPreview file={recording} />
          </section>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            className="cursor-pointer rounded-lg border-0 bg-[#5545d9] px-[18px] py-3 text-white disabled:cursor-default disabled:opacity-60"
            type="button"
            disabled={capturing || !word.trim() || !recording}
            onClick={() => void analyze('transcription')}
          >
            Check pronunciation
          </button>

          <button
            className="cursor-pointer rounded-lg border-0 bg-[#5545d9] px-[18px] py-3 text-white disabled:cursor-default disabled:opacity-60"
            type="button"
            disabled={capturing || !word.trim() || !recording || !example}
            onClick={() => void analyze('comparison')}
          >
            Compare mouth movement
          </button>
        </div>
      </fieldset>

      <p className="my-4" role="status" aria-live="polite">{status}</p>
      {error && <p role="alert" className="my-4 text-[#b42318]">{error}</p>}

      {transcription && (
        <section className="mb-5 rounded-xl border border-[#dce1eb] bg-white p-5">
          <h2 className="mb-[0.83em] text-[1.5em] leading-normal font-bold">Speech recognition</h2>
          <p className="my-4">Expected: {transcription.expected}</p>
          <p className="my-4">Heard: {transcription.heard || '(No speech detected)'}</p>
          <p className="my-4">
            {transcription.match
              ? 'The recognized words match.'
              : 'The recognized words do not match.'}
          </p>
        </section>
      )}

      {comparison && (
        <section className="mb-5 rounded-xl border border-[#dce1eb] bg-white p-5">
          <h2 className="mb-[0.83em] text-[1.5em] leading-normal font-bold">Mouth movement results</h2>

          <p className="my-4">
            Your duration: {comparison.user_ms} ms.
            Example duration: {comparison.example_ms} ms.
          </p>

          <ul className="my-4 list-disc pl-10">
            {comparison.feedback.map((item) => (
              <li className="mb-2.5" key={item.stage}>
                <strong>{item.stage}:</strong> {item.notes.join('; ')}
              </li>
            ))}
          </ul>

          <img
            className="mt-5 block w-full"
            src={`${mediaUrl(comparison.png_url)}?v=${plotVersion}`}
            alt="Graphs comparing mouth opening, width, and shape"
          />
        </section>
      )}
    </main>
  )
}
