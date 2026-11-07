import { useEffect, useRef } from 'react'
import VideoPreview from '../pronounciation/video_preview'
import type { CaptureMode } from '../../api/speaking'

function AudioPreview({ file }: { file: File }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    const player = ref.current
    if (!player) return
    const url = URL.createObjectURL(file)
    player.src = url
    return () => { player.removeAttribute('src'); player.load(); URL.revokeObjectURL(url) }
  }, [file])
  return <audio ref={ref} controls className="w-full min-w-0 max-w-full" aria-label="Your audio recording" />
}

export default function RecordingPreview({ file, capture }: { file: File; capture: CaptureMode }) {
  return capture === 'audio' ? <AudioPreview file={file} /> : <VideoPreview file={file} label="Your attempt" />
}
