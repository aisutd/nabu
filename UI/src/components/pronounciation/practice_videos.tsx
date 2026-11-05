import type { PracticeWord } from '../../api/pronounciation'
import VideoRecorder from '../VideoRecorder'
import VideoPreview from './video_preview'

type Props = {
  lesson: PracticeWord | null
  example: File | null
  recording: File | null
  busy: boolean
  capturing: boolean
  onExampleChange: (file: File | null) => void
  onRecordingChange: (file: File | null) => void
  onCapturingChange: (value: boolean) => void
}

const uploadClass =
  'block w-full min-w-0 text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:font-medium file:text-secondary-foreground disabled:opacity-50'

export default function PracticeVideos({
  lesson,
  example,
  recording,
  busy,
  capturing,
  onExampleChange,
  onRecordingChange,
  onCapturingChange,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="min-w-0 rounded-xl border border-border bg-card shadow-card p-5">
        <div className="mb-4 flex items-baseline gap-3">
          <span className="text-sm font-semibold text-muted-foreground">01</span>
          <h2 className="text-lg font-semibold">Watch the example</h2>
        </div>

        <VideoPreview
          file={example}
          label="Add a reference clip to watch the example"
        />

        {lesson && <p className="mt-3 text-sm text-muted-foreground">{lesson.word}{!lesson.has_audio && ' · Visual reference (no audio)'}</p>}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-muted-foreground">Demo setup: replace reference</summary>
        <label className="mt-5 grid gap-2 text-sm">
          {example ? 'Replace reference clip' : 'Add reference clip'}
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.m4v"
            disabled={busy || capturing}
            className={uploadClass}
            onChange={(event) => {
              onExampleChange(event.target.files?.[0] ?? null)
            }}
          />
        </label>
        </details>

      </section>

      <section className="min-w-0 rounded-xl border border-border bg-card shadow-card p-5">
        <div className="mb-4 flex items-baseline gap-3">
          <span className="text-sm font-semibold text-muted-foreground">02</span>
          <h2 className="text-lg font-semibold">Your turn</h2>
        </div>

        {recording && (
          <div className="mb-5">
            <p className="mb-2 truncate text-xs text-muted-foreground">
              Saved attempt: {recording.name}
            </p>
            <VideoPreview file={recording} label="Your saved attempt" />
          </div>
        )}

        {!recording && (
          <VideoRecorder
            disabled={busy || !example}
            onRecordingChange={onCapturingChange}
            onRecording={onRecordingChange}
          />
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-muted-foreground">Upload an attempt instead</summary>
        <label className="mt-3 grid gap-2 text-sm">
          Video file
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.m4v"
            disabled={busy || capturing}
            className={uploadClass}
            onChange={(event) => {
              onRecordingChange(event.target.files?.[0] ?? null)
            }}
          />
        </label>
        </details>
        <p className="mt-3 text-xs text-muted-foreground">One word, up to five seconds. Keep your mouth visible.</p>
      </section>
    </div>
  )
}