import { useEffect, useRef, useState } from 'react'
import { submitSpeakingAttempt } from '../api/speaking'
import type { CaptureMode, SpeakingResult } from '../api/speaking'

export type SpeakingOptions = {
  expectedText?: string
  exerciseId?: string
  capture: CaptureMode
}

export default function useSpeakingActivity(options: SpeakingOptions) {
  const [recording, setRecording] = useState<File | null>(null)
  const [previous, setPrevious] = useState<File | null>(null)
  const [result, setResult] = useState<SpeakingResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => { request.current?.abort() }, [])

  function changeRecording(file: File | null) {
    setRecording(file)
    setResult(null)
    setError('')
  }

  function retry() {
    if (busy || capturing) return
    setPrevious(recording)
    changeRecording(null)
  }

  async function review() {
    if (!recording || busy || capturing || request.current) return null
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await submitSpeakingAttempt(recording, options.capture, options, controller.signal)
      if (controller.signal.aborted) return null
      setResult(response)
      return response
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Review failed.')
      return null
    } finally {
      if (!controller.signal.aborted) setBusy(false)
      if (request.current === controller) request.current = null
    }
  }

  return { recording, previous, result, busy, capturing, error, changeRecording, setCapturing, retry, review }
}
