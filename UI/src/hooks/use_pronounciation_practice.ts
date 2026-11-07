import { useEffect, useRef, useState } from 'react'
import {
  listPracticeWords,
  loadPracticeReference,
  reviewRecordings,
  compareRecordings,
  transcribeRecording,
  uploadVideo,
} from '../api/pronounciation'
import type {
  PracticeWord,
  LearnerFeedback,
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

  const [lessons, setLessons] = useState<PracticeWord[]>([])
  const [lesson, setLesson] = useState<PracticeWord | null>(null)
  const [loadingReference, setLoadingReference] = useState(false)
  const [libraryError, setLibraryError] = useState('')
  const [feedback, setFeedback] = useState<LearnerFeedback | null>(null)
  const [previousAttempt, setPreviousAttempt] = useState<File | null>(null)
  const referenceRequest = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listPracticeWords(controller.signal).then(setLessons).catch(() => {
      if (!controller.signal.aborted) setLibraryError('Could not load practice words. Check the backend, then reload the page.')
    })
    return () => { controller.abort(); referenceRequest.current?.abort() }
  }, [])

  async function selectLesson(id: string) {
    referenceRequest.current?.abort()
    const selected = lessons.find((item) => item.id === id)
    setLesson(selected ?? null)
    changeWord(selected?.word ?? '')
    changeExample(null)
    changeRecording(null)
    setPreviousAttempt(null)
    if (!selected) { setLoadingReference(false); return }
    const controller = new AbortController()
    referenceRequest.current = controller
    setLoadingReference(true)
    try {
      const file = await loadPracticeReference(selected, controller.signal)
      if (!controller.signal.aborted) changeExample(file)
    } catch {
      if (!controller.signal.aborted) setError('Could not load the reference. Select the word again to retry.')
    } finally {
      if (!controller.signal.aborted) setLoadingReference(false)
    }
  }

  function retry() {
    if (recording) setPreviousAttempt(recording)
    changeRecording(null)
  }

  function clearResults() {
    setFeedback(null)
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
    if (busy || capturing || loadingReference) return

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

    if (mode === 'all') {
      setSpeechState('running')
      setMouthState('running')
      setStatus('Reviewing words and mouth movement…')
      try {
        const result = await reviewRecordings(userId!, referenceId!, label)
        setTranscription(result.transcription)
        setComparison(result.comparison)
        setFeedback(result.feedback)
        setPlotVersion(Date.now())
        setSpeechState(result.transcription ? 'done' : 'error')
        setMouthState(result.comparison ? 'done' : 'error')
        setError(Object.values(result.errors).join(' '))
        setStatus(Object.keys(result.errors).length ? 'Some checks could not complete.' : 'Your review is ready.')
      } catch (err) {
        setSpeechState('error')
        setMouthState('error')
        setError(err instanceof Error ? err.message : 'Review failed.')
        setStatus('Review could not complete.')
      } finally {
        setBusy(false)
      }
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
    lessons, lesson, loadingReference, libraryError, feedback, previousAttempt, selectLesson, retry,
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