import usePronunciationPractice from '../hooks/use_pronounciation_practice'
import PracticeVideos from './pronounciation/practice_videos'
import PracticeActions from './pronounciation/practice_actions'
import PracticeResults from './pronounciation/practice_results'
import VideoPreview from './pronounciation/video_preview'

export default function PronunciationPractice() {
  const practice = usePronunciationPractice()

  const ready = Boolean(
    practice.word.trim() &&
      practice.example &&
      practice.recording &&
      !practice.capturing &&
      !practice.loadingReference,
  )

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#38271f]">
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <span className="text-2xl font-bold tracking-tight">nabu</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pt-10 pb-[max(40px,env(safe-area-inset-bottom))]">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-xs font-semibold tracking-[0.16em] text-[#8a6547] uppercase">
              Speaking practice
            </h1>
          </div>

          <label className="grid gap-2 text-sm font-medium md:w-64 md:shrink-0">
            Choose a practice word
            <select
              value={practice.lesson?.id ?? ''}
              disabled={practice.busy || practice.capturing}
              onChange={(event) => void practice.selectLesson(event.target.value)}
              className="w-full rounded-xl border border-[#d7c5ad] bg-[#fffcf7] px-4 py-3"
            >
              <option value="">Select a word</option>
              {practice.lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.word}</option>)}
            </select>
          </label>
        </div>

        <ol aria-label="Practice steps" className="mb-6 flex flex-wrap gap-5 text-sm text-[#756354]">
          <li>1. Watch</li><li>2. Record one word</li><li>3. Review & retry</li>
        </ol>
        {practice.libraryError && <p role="alert" className="mb-4 text-sm text-[#923d2c]">{practice.libraryError}</p>}
        {!practice.libraryError && practice.lessons.length === 0 && <p className="mb-4 text-sm text-[#756354]">No reference words loaded. Start the backend and ensure reference clips are installed.</p>}
        {practice.loadingReference && <p role="status" className="mb-4 text-sm">Loading reference…</p>}

        <PracticeVideos
          lesson={practice.lesson}
          example={practice.example}
          recording={practice.recording}
          busy={practice.busy || practice.loadingReference}
          capturing={practice.capturing}
          onExampleChange={practice.changeExample}
          onRecordingChange={practice.changeRecording}
          onCapturingChange={practice.setCapturing}
        />

        <PracticeActions
          ready={ready}
          busy={practice.busy}
          onReview={() => void practice.analyze('all')}
        />

        {practice.recording && (
          <button type="button" disabled={practice.busy || practice.capturing} onClick={practice.retry}
            className="mt-4 rounded-lg border border-[#d7c5ad] px-4 py-2 text-sm disabled:opacity-40">
            Record another attempt
          </button>
        )}
        {practice.previousAttempt && (
          <details className="mt-5">
            <summary className="cursor-pointer text-sm text-[#756354]">Replay previous attempt</summary>
            <div className="mt-3 max-w-md"><VideoPreview file={practice.previousAttempt} label="Previous attempt" /></div>
          </details>
        )}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-[#756354]">Demo setup: custom word</summary>
          <label className="mt-3 grid max-w-sm gap-2 text-sm">Expected word
            <input value={practice.word} disabled={practice.busy || practice.capturing || practice.loadingReference}
              onChange={(event) => practice.changeWord(event.target.value)}
              className="rounded-lg border border-[#d7c5ad] bg-[#fffcf7] p-3" />
          </label>
        </details>
        <PracticeResults practice={practice} />
      </main>
    </div>
  )
}
