import usePronunciationPractice from '../hooks/use_pronounciation_practice'
import PracticeVideos from './pronounciation/practice_videos'
import PracticeActions from './pronounciation/practice_actions'
import PracticeResults from './pronounciation/practice_results'

export default function PronunciationPractice() {
  const practice = usePronunciationPractice()

  return (
    <main className="mx-auto max-w-262.5 px-5 pt-[max(24px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <h1 className="mb-3 text-[2em] leading-normal font-bold">
        Pronunciation practice
      </h1>

      <p className="my-4">
        Compare your mouth movement with an example saying the same word.
      </p>

      <fieldset
        className="my-6 min-w-0 border-0 p-0"
        disabled={practice.busy}
      >
        <label className="mb-4 grid gap-2">
          Word or phrase
          <input
            className="w-full rounded-lg border border-[#cbd2df] p-2.5"
            value={practice.word}
            placeholder="For example: hello"
            onChange={(event) => {
              practice.changeWord(event.target.value)
            }}
          />
        </label>

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
          word={practice.word}
          hasRecording={Boolean(practice.recording)}
          hasExample={Boolean(practice.example)}
          capturing={practice.capturing}
          onAnalyze={practice.analyze}
        />
      </fieldset>

      <PracticeResults
        status={practice.status}
        error={practice.error}
        transcription={practice.transcription}
        comparison={practice.comparison}
        plotVersion={practice.plotVersion}
      />
    </main>
  )
}