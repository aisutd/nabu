import { useEffect, useRef, useState } from 'react'
import { submitSpeakingAttempt } from '../api/speaking'
import type { CaptureMode, SpeakingResult } from '../api/speaking'

export type SpeakingOptions = {
  expectedText?: string
  exerciseId?: string
  capture: CaptureMode
  prepareReview?: boolean
}

export default function useSpeakingActivity(options: SpeakingOptions) {
  const [recording, setRecording] = useState<File | null>(null)
  const [previous, setPrevious] = useState<File | null>(null)
  const [result, setResult] = useState<SpeakingResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState('')
  const [preparation, setPreparation] = useState<'idle' | 'preparing' | 'ready'>('idle')
  const request = useRef<{ controller: AbortController; result: Promise<SpeakingResult> } | null>(null)

  useEffect(() => () => {
    request.current?.controller.abort()
    request.current = null
  }, [])

  function prepare(file: File) {
    const controller = new AbortController()
    const attempt = {
      controller,
      result: submitSpeakingAttempt(file, options.capture, options, controller.signal),
    }
    request.current = attempt
    setPreparation('preparing')
    void attempt.result.then(
      () => {
        if (request.current === attempt) setPreparation('ready')
      },
      () => {
        if (request.current !== attempt) return
        request.current = null
        setPreparation('idle')
      },
    )
    return attempt
  }

  function changeRecording(file: File | null) {
    request.current?.controller.abort()
    request.current = null
    setPreparation('idle')
    setRecording(file)
    setResult(null)
    setError('')
    if (file && options.prepareReview) prepare(file)
  }

  function retry() {
    if (busy || capturing) return
    setPrevious(recording)
    changeRecording(null)
  }

  async function review() {
    if (!recording || busy || capturing) return null
    const attempt = request.current ?? prepare(recording)
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await attempt.result
      if (attempt.controller.signal.aborted) return null
      setResult(response)
      return response
    } catch (err) {
      if (!attempt.controller.signal.aborted) setError(err instanceof Error ? err.message : 'Review failed.')
      return null
    } finally {
      if (!attempt.controller.signal.aborted) setBusy(false)
    }
  }

  return { recording, previous, result, busy, preparation, capturing, error, changeRecording, setCapturing, retry, review }
}
