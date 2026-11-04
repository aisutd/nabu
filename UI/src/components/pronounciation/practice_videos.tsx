import VideoRecorder from '../VideoRecorder'
import VideoPreview from './video_preview'

type Props = {
  example: File | null
  recording: File | null
  busy: boolean
  capturing: boolean
  onExampleChange: (file: File | null) => void
  onRecordingChange: (file: File | null) => void
  onCapturingChange: (capturing: boolean) => void
}

export default function PracticeVideos({
  example,
  recording,
  busy,
  capturing,
  onExampleChange,
  onRecordingChange,
  onCapturingChange,
}: Props) {
  return (
    <div className="my-6 grid grid-cols-1 gap-5 min-[651px]:grid-cols-2">
      <section className="mb-5 rounded-xl border border-[#dce1eb] bg-white p-5">
        <h2 className="mb-[0.83em] text-[1.5em] leading-normal font-bold">
          Example
        </h2>

        <label className="mb-4 grid gap-2">
          Upload a reference video
          <input
            className="w-full rounded-lg border border-[#cbd2df] p-2.5"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.m4v"
            onChange={(event) => {
              onExampleChange(event.target.files?.[0] ?? null)
            }}
          />
        </label>

        <VideoPreview file={example} />
      </section>

      <section className="mb-5 rounded-xl border border-[#dce1eb] bg-white p-5">
        <h2 className="mb-[0.83em] text-[1.5em] leading-normal font-bold">
          Your recording
        </h2>

        <VideoRecorder
          disabled={busy}
          onRecordingChange={onCapturingChange}
          onRecording={onRecordingChange}
        />

        <label className="mb-4 grid gap-2">
          Or select a video
          <input
            className="w-full rounded-lg border border-[#cbd2df] p-2.5"
            type="file"
            accept="video/*"
            disabled={capturing}
            onChange={(event) => {
              onRecordingChange(event.target.files?.[0] ?? null)
            }}
          />
        </label>

        <p className="my-4">
          Keep your mouth visible and include audio.
        </p>

        {recording && (
          <p className="my-4">
            Selected recording: {recording.name}
          </p>
        )}

        <VideoPreview file={recording} />
      </section>
    </div>
  )
}