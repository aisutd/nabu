import { useEffect, useRef, useState } from 'react'

type Props = {
  disabled: boolean
  onRecording: (file: File) => void
  onRecordingChange: (recording: boolean) => void
}

export default function VideoRecorder({ disabled, onRecording, onRecordingChange }: Props) {
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
      setError('Camera recording is unavailable. Use localhost or HTTPS in a supported browser, or upload a video.')
      return
    }

    setOpening(true)
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
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
      const mimeType = [
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('This browser cannot record MP4 or WebM. Upload a video instead.')

      const capture = new MediaRecorder(stream.current, { mimeType })
      const chunks: Blob[] = []
      let failed = false
      capture.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      capture.onerror = () => {
        failed = true
        if (!mounted.current) return
        setError('Recording failed. Please try again.')
        setRecording(false)
        setFinishing(false)
        onRecordingChange(false)
        closeCamera()
      }
      capture.onstop = () => {
        if (!mounted.current) return
        setRecording(false)
        setFinishing(false)
        onRecordingChange(false)
        closeCamera()
        if (failed) return
        if (!chunks.length) {
          setError('No video was captured. Please try again.')
          return
        }
        const type = capture.mimeType || mimeType
        const extension = type.includes('mp4') ? 'mp4' : 'webm'
        onRecording(new File(chunks, `practice-${Date.now()}.${extension}`, { type }))
      }
      recorder.current = capture
      capture.start()
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
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#251b17]">
        <video
          ref={preview}
          autoPlay
          muted
          playsInline
          className={`h-full w-full object-contain ${cameraReady ? 'block' : 'hidden'}`}
          aria-label="Live camera preview"
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[#e7d9c7]">
            Enable your camera when you’re ready.
          </div>
        )}
        {recording && (
          <span className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">
            <span aria-hidden="true" className="size-2 rounded-full bg-red-400" />
            Recording
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {!cameraReady ? (
          <button className="cursor-pointer rounded-xl border-0 bg-[#513529] px-5 py-3 text-sm font-semibold text-[#fffaf2] hover:bg-[#38231b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99633e] disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={disabled || opening} onClick={() => void openCamera()}>
            {opening ? 'Opening camera...' : 'Enable camera'}
          </button>
        ) : recording ? (
          <button className="cursor-pointer rounded-xl border-0 bg-[#513529] px-5 py-3 text-sm font-semibold text-[#fffaf2] hover:bg-[#38231b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99633e] disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={finishing} onClick={stopRecording}>
            {finishing ? 'Saving recording...' : 'Stop recording'}
          </button>
        ) : (
          <>
            <button className="cursor-pointer rounded-xl border-0 bg-[#513529] px-5 py-3 text-sm font-semibold text-[#fffaf2] hover:bg-[#38231b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99633e] disabled:cursor-not-allowed disabled:opacity-40" type="button" disabled={disabled} onClick={startRecording}>Start recording</button>
            <button className="cursor-pointer rounded-xl border-0 bg-[#513529] px-5 py-3 text-sm font-semibold text-[#fffaf2] hover:bg-[#38231b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99633e] disabled:cursor-not-allowed disabled:opacity-40" type="button" onClick={closeCamera}>Close camera</button>
          </>
        )}
      </div>
      <p className="mt-2 min-h-5 text-xs text-[#756354]" role="status">{recording && !finishing ? 'Recording camera and microphone...' : ''}</p>
      {error && <p role="alert" className="my-4 text-[#b42318]">{error}</p>}
    </div>
  )
}
