import { mediaUrl } from '../../api/pronounciation'
import type { SpeakingResult } from '../../api/speaking'
import NeuralResultPanel from '../pronounciation/neural_result'

export default function SpeakingResults({ result, showAnalysis, onRetry }: {
  result: SpeakingResult; showAnalysis: boolean; onRetry: () => void
}) {
  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-xl bg-card p-5 shadow-card" aria-label="Your review">
        <h2 className="text-xl font-semibold">{result.feedback.title}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {result.feedback.observations.map((text) => <li key={text}>{text}</li>)}
        </ul>
        <p className="mt-4 font-medium">{result.feedback.next_action}</p>
        {Object.entries(result.errors).map(([check, error]) => <p role="alert" key={check} className="mt-3 text-sm text-destructive">{error}</p>)}
        <button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-primary px-5 py-3 text-primary-foreground hover:bg-primary/90">Try again</button>
      </section>
      {showAnalysis && (
        <details open className="rounded-xl border bg-secondary p-5">
          <summary className="cursor-pointer font-heading text-lg">Analysis workspace</summary>
          <dl className="mt-4 space-y-3 text-sm">
            {Object.entries(result.checks).map(([name, check]) => (
              <div key={name}><dt className="font-semibold capitalize">{name}: {check.status}</dt><dd className="text-muted-foreground">{check.reason}</dd></div>
            ))}
          </dl>
          {result.transcription && <p className="mt-4 text-sm">Recognized: {result.transcription.heard || 'No speech detected'} · Expected: {result.transcription.expected ?? 'Open response'}</p>}
          {result.comparison && (
            <>
              <p className="mt-4 text-sm">Your duration: {result.comparison.user_ms} ms · Reference: {result.comparison.example_ms} ms</p>
              <ul className="mt-3 space-y-2 text-sm">{result.comparison.feedback.map((item) => <li key={item.stage}><strong>{item.stage}: </strong>{item.notes.join('; ')}</li>)}</ul>
              <img src={`${mediaUrl(result.comparison.png_url)}?v=${result.recording_id}`} className="mt-4 w-full rounded-lg" alt="Mouth movement comparison graphs" />
            </>
          )}
          {result.comparison && <NeuralResultPanel result={result.comparison.neural} hasComparison processing={false} />}
        </details>
      )}
    </div>
  )
}
