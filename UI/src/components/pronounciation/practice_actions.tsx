import type { AnalysisMode } from '../../hooks/use_pronounciation_practice'

type Props = {
  word: string
  hasRecording: boolean
  hasExample: boolean
  capturing: boolean
  onAnalyze: (mode: AnalysisMode) => Promise<void>
}

const buttonClass =
  'cursor-pointer rounded-lg border-0 bg-[#5545d9] px-[18px] py-3 text-white disabled:cursor-default disabled:opacity-60'

export default function PracticeActions({
  word,
  hasRecording,
  hasExample,
  capturing,
  onAnalyze,
}: Props) {
  const cannotTranscribe =
    capturing || !word.trim() || !hasRecording

  return (
    <div className="flex flex-wrap gap-3">
      <button
        className={buttonClass}
        type="button"
        disabled={cannotTranscribe}
        onClick={() => void onAnalyze('transcription')}
      >
        Check pronunciation
      </button>

      <button
        className={buttonClass}
        type="button"
        disabled={cannotTranscribe || !hasExample}
        onClick={() => void onAnalyze('comparison')}
      >
        Compare mouth movement
      </button>
    </div>
  )
}