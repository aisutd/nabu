import { useEffect, useRef, useState } from 'react'

type Props = {
  file: File | null
  label: string
}

export default function VideoPreview({ file, label }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const video = ref.current
    if (!file || !video) return

    const url = URL.createObjectURL(file)
    video.src = url
    video.load()

    return () => {
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
    }
  }, [file])

  if (!file) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-[#d7c5ad] bg-[#f4ecdf] px-6 text-center">
        <div>
          <span aria-hidden="true" className="text-3xl text-[#a2876c]">
            ▷
          </span>
          <p className="mt-2 text-sm text-[#756354]">{label}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <video
        ref={ref}
        controls
        playsInline
        preload="metadata"
        onLoadStart={() => setError('')}
        onError={() => {
          const code = ref.current?.error?.code
          setError(
            code === 3 || code === 4
              ? 'This browser cannot decode this clip. Try an MP4 encoded with H.264 video and AAC audio.'
              : 'Could not load this clip. Try selecting the file again.',
          )
        }}
        aria-label={label}
        className="aspect-video w-full rounded-xl bg-[#251b17] object-contain"
      />
      {error && <p role="alert" className="mt-2 text-sm text-[#923d2c]">{error}</p>}
    </div>
  )
}
