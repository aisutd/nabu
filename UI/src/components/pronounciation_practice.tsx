import usePronunciationPractice from '../hooks/use_pronounciation_practice'
import PracticeVideos from './pronounciation/practice_videos'
import PracticeActions from './pronounciation/practice_actions'
import PracticeResults from './pronounciation/practice_results'

export default function PronunciationPractice() {
  const practice = usePronunciationPractice()

  const ready = Boolean(
    practice.word.trim() &&
      practice.example &&
      practice.recording &&
      !practice.capturing,
  )

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#38271f]">
      <header className="border-b border-[#e4d8c7]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <span className="text-xl font-bold tracking-tight">nabu</span>
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
            Practice word or phrase
            <input
              value={practice.word}
              disabled={practice.busy || practice.capturing}
              placeholder="For example: June"
              onChange={(event) => {
                practice.changeWord(event.target.value)
              }}
              className="w-full rounded-xl border border-[#d7c5ad] bg-[#fffcf7] px-4 py-3 text-base outline-none focus:border-[#99633e] focus:ring-2 focus:ring-[#99633e]/20 disabled:opacity-60"
            />
          </label>
        </div>

        <PracticeVideos
          example={practice.example}
          recording={practice.recording}
          busy={practice.busy}
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

        <PracticeResults practice={practice} />
      </main>
    </div>
  )
}
