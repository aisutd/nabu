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

export type AnalysisMode = 'transcription' | 'comparison'

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

  function clearResults() {
    setTranscription(null)
    setComparison(null)
    setStatus('')
    setError('')
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
      setError(
        err instanceof Error ? err.message : 'Something went wrong.',
      )
      setStatus('')
    } finally {
      setBusy(false)
    }
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
    changeWord,
    changeExample,
    changeRecording,
    setCapturing,
    analyze,
  }
}