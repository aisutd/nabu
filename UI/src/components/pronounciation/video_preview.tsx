import { useEffect, useRef } from 'react'

type Props = {
  file: File | null
}

export default function VideoPreview({ file }: Props) {
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

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className="mt-4 block max-h-80 w-full rounded-lg bg-[#111]"
    />
  )
}