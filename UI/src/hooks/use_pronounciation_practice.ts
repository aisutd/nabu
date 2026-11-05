import { useState } from 'react'
import {
  compareRecordings,
  transcribeRecording,
  uploadVideo,
} from '../api/pronounciation'
import type {
  Comparison,
  Transcription,
} from '../api/pronounciation'

export type AnalysisMode = 'all' | 'transcription' | 'comparison'
export type Stage = 'idle' | 'running' | 'done' | 'error'

export default function usePronunciationPractice() {
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

  const [uploadState, setUploadState] = useState<Stage>('idle')
  const [speechState, setSpeechState] = useState<Stage>('idle')
  const [mouthState, setMouthState] = useState<Stage>('idle')

  function clearResults() {
    setTranscription(null)
    setComparison(null)
    setStatus('')
    setError('')
    setUploadState('idle')
    setSpeechState('idle')
    setMouthState('idle')
  }

  function changeWord(value: string) {
    setWord(value)
    clearResults()
  }

  function changeExample(file: File | null) {
    setExample(file)
    setExampleId(null)
    clearResults()
  }

  function changeRecording(file: File | null) {
    setRecording(file)
    setRecordingId(null)
    clearResults()
  }

  async function analyze(mode: AnalysisMode) {
    if (busy || capturing) return

    const label = word.trim()

    if (!label || !recording || (mode !== 'transcription' && !example)) {
      setError('Add the phrase and required videos first.')
      return
    }

    setBusy(true)
    clearResults()
    setUploadState('running')

    let userId = recordingId
    let referenceId = exampleId

    try {
      setStatus('Preparing your videos…')

      if (!userId) {
        userId = (await uploadVideo(recording)).id
        setRecordingId(userId)
      }

      if (mode !== 'transcription' && !referenceId) {
        referenceId = (await uploadVideo(example!)).id
        setExampleId(referenceId)
      }

      setUploadState('done')
    } catch (err) {
      setUploadState('error')
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setStatus('Could not prepare the videos.')
      setBusy(false)
      return
    }

    const errors: string[] = []

    if (mode !== 'comparison') {
      setSpeechState('running')
      setStatus('Checking the recognized words…')

      try {
        setTranscription(await transcribeRecording(userId!, label))
        setSpeechState('done')
      } catch (err) {
        setSpeechState('error')
        errors.push(
          `Speech check: ${
            err instanceof Error ? err.message : 'Could not complete.'
          }`,
        )
      }
    }

    if (mode !== 'transcription') {
      setMouthState('running')
      setStatus('Comparing mouth movement…')

      try {
        setComparison(
          await compareRecordings(userId!, referenceId!, label),
        )
        setPlotVersion(Date.now())
        setMouthState('done')
      } catch (err) {
        setMouthState('error')
        errors.push(
          `Mouth comparison: ${
            err instanceof Error ? err.message : 'Could not complete.'
          }`,
        )
      }
    }

    setError(errors.join(' '))
    setStatus(
      errors.length
        ? 'Review finished with errors. Check the analysis below.'
        : 'Your results are ready.',
    )
    setBusy(false)
  }

  return {
    word,
    example,
    recording,
    transcription,
    comparison,
    busy,
    capturing,
    status,
    error,
    plotVersion,
    uploadState,
    speechState,
    mouthState,
    changeWord,
    changeExample,
    changeRecording,
    setCapturing,
    analyze,
  }
}

export type PronunciationPracticeState =
  ReturnType<typeof usePronunciationPractice>