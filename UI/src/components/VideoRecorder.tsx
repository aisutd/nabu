import { useEffect, useRef, useState } from 'react'

type Props = {
  capture?: 'audio' | 'video'
  maxDurationMs?: number
  disabled: boolean
  onRecording: (file: File) => void
  onRecordingChange: (recording: boolean) => void
}

export default function VideoRecorder({ disabled, onRecording, onRecordingChange, capture = 'video', maxDurationMs = 4500 }: Props) {
  const preview = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const mounted = useRef(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [opening, setOpening] = useState(false)
  const [recording, setRecording] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!recording) return
    // Leave a small margin for media-container timing under the five-second limit.
    const timer = window.setTimeout(() => {
      if (recorder.current?.state === 'recording') {
        setFinishing(true)
        recorder.current.stop()
      }
    }, maxDurationMs)
    return () => window.clearTimeout(timer)
  }, [recording, maxDurationMs])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (recorder.current) {
        recorder.current.ondataavailable = null
        recorder.current.onstop = null
        recorder.current.onerror = null
        if (recorder.current.state !== 'inactive') recorder.current.stop()
      }
      stream.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function closeCamera() {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (preview.current) preview.current.srcObject = null
    setCameraReady(false)
  }

  async function openCamera() {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is unavailable. Use localhost or HTTPS in a supported browser, or upload a recording.')
      return
    }

    setOpening(true)
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: capture === 'video' ? { facingMode: 'user' } : false,
        audio: true,
      })
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop())
        return
      }
      stream.current = media
      if (preview.current) {
        preview.current.srcObject = media
        await preview.current.play()
      }
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop())
        return
      }
      setCameraReady(true)
    } catch (err) {
      if (mounted.current) {
        closeCamera()
        setError(err instanceof Error ? err.message : 'Could not access the camera and microphone.')
      }
    } finally {
      if (mounted.current) setOpening(false)
    }
  }

  function startRecording() {
    if (!stream.current) return
    setError('')
    try {
      const mimeType = (capture === 'audio'
        ? ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
        : ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']).find((type) => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('This browser cannot record a supported format. Upload a recording instead.')

      const mediaRecorder = new MediaRecorder(stream.current, { mimeType })
      const chunks: Blob[] = []
      let failed = false
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      mediaRecorder.onerror = () => {
        failed = true
        if (!mounted.current) return
        setError('Recording failed. Please try again.')
        setRecording(false)
        setFinishing(false)
        onRecordingChange(false)
        closeCamera()
      }
      mediaRecorder.onstop = () => {
        if (!mounted.current) return
        setRecording(false)
        setFinishing(false)
        onRecordingChange(false)
        closeCamera()
        if (failed) return
        if (!chunks.length) {
          setError('No media was captured. Please try again.')
          return
        }
        const type = mediaRecorder.mimeType || mimeType
        const extension = type.includes('mp4') ? (capture === 'audio' ? 'm4a' : 'mp4') : type.includes('ogg') ? 'ogg' : 'webm'
        onRecording(new File(chunks, `practice-${Date.now()}.${extension}`, { type }))
      }
      recorder.current = mediaRecorder
      mediaRecorder.start()
      setRecording(true)
      onRecordingChange(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording.')
    }
  }

  function stopRecording() {
    if (recorder.current?.state !== 'recording') return
    setFinishing(true)
    recorder.current.stop()
  }

  return (
    <div>
      <div className={`relative overflow-hidden rounded-xl bg-foreground ${capture === 'video' ? 'aspect-video' : 'min-h-32'}`}>
        {capture === 'video' && <video
          ref={preview}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-contain ${cameraReady ? 'block' : 'hidden'}`}
          aria-label="Live camera preview"
        />}
        {(!cameraReady || capture === 'audio') && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-background">
            {capture === 'audio' ? (cameraReady ? 'Microphone ready' : 'Enable your microphone when you’re ready.') : 'Enable your camera when you’re ready.'}
          </div>
        )}
        {recording && (
          <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-foreground/80 px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
            Recording
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {!cameraReady ? (
          <button className="cursor-pointer rounded-xl border-0 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={disabled || opening} onClick={() => void openCamera()}>
            {opening ? 'Opening…' : capture === 'audio' ? 'Enable microphone' : 'Enable camera'}
          </button>
        ) : recording ? (
          <button className="cursor-pointer rounded-xl border-0 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={finishing} onClick={stopRecording}>
            {finishing ? 'Saving recording...' : 'Stop recording'}
          </button>
        ) : (
          <>
            <button className="cursor-pointer rounded-xl border-0 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={disabled} onClick={startRecording}>Start recording</button>
            <button className="cursor-pointer rounded-xl border-0 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={closeCamera}>{capture === 'audio' ? 'Close microphone' : 'Close camera'}</button>
          </>
        )}
      </div>
      <p className="mt-2 min-h-5 text-xs text-muted-foreground" role="status">{recording && !finishing ? (capture === 'audio' ? 'Recording microphone…' : 'Recording camera and microphone…') : ''}</p>
      {error && <p role="alert" className="my-4 text-destructive">{error}</p>}
    </div>
  )
}
