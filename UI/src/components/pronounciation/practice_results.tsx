import { mediaUrl } from '../../api/pronounciation'
import NeuralResultPanel from './neural_result'
import type {
  PronunciationPracticeState,
  Stage,
} from '../../hooks/use_pronounciation_practice'

type Props = {
  practice: PronunciationPracticeState
}

const secondaryButton =
  'rounded-lg border border-border px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40'

function StatusLabel({ state }: { state: Stage }) {
  const labels = {
    idle: 'Waiting',
    running: 'Processing',
    done: 'Complete',
    error: 'Failed',
  }

  const colors = {
    idle: 'bg-muted text-muted-foreground',
    running: 'bg-warning/20 text-foreground',
    done: 'bg-success/20 text-foreground',
    error: 'bg-destructive/10 text-destructive',
  }

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs ${colors[state]}`}>
      {labels[state]}
    </span>
  )
}

export default function PracticeResults({ practice }: Props) {
  const {
    transcription,
    comparison,
    status,
    error,
    plotVersion,
    busy,
    capturing,
    word,
    recording,
    example,
    uploadState,
    speechState,
    mouthState,
    analyze,
  } = practice

  const canCheckSpeech =
    !busy && !capturing && Boolean(word.trim() && recording)

  return (
    <>
      <p
        role="status"
        aria-live="polite"
        className="mt-4 min-h-6 text-sm text-muted-foreground"
      >
        {status}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {practice.feedback && (
        <section aria-label="Your review" className="mt-8 rounded-xl bg-card p-5 shadow-card">
          <h2 className="text-xl font-semibold">{practice.feedback.title}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {practice.feedback.observations.map((text) => <li key={text}>{text}</li>)}
          </ul>
          <p className="mt-4 font-medium">{practice.feedback.next_action}</p>
          <button type="button" onClick={practice.retry} disabled={busy || capturing}
            className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">Try again</button>
        </section>
      )}

      <details
        open
        className="mt-10 rounded-xl border border-border bg-secondary"
      >
        <summary className="cursor-pointer px-5 py-5 font-heading text-lg font-semibold">
          Analysis workspace
        </summary>

        <div className="p-5">
          <section className="mt-8 pt-8">
            <h2 className="text-2xl font-semibold tracking-tight">
              Your feedback
            </h2>

            {!transcription && !comparison ? (
              <p className="mt-3 text-muted-foreground">
                Your recognized words and mouth-movement feedback will appear
                here after review.
              </p>
            ) : (
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">What we heard</h3>
                  {transcription ? (
                    <>
                      <p className="mt-2 text-xl">
                        “{transcription.heard || 'No speech detected'}”
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {transcription.match
                          ? 'The recognized words match your phrase.'
                          : `Expected: “${transcription.expected}”. Listen to your attempt and try again.`}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No speech result for this run.
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold">Mouth movement</h3>
                  {comparison ? (
                    <ul className="mt-2 space-y-3 text-sm leading-relaxed">
                      {comparison.feedback.map((item) => (
                        <li key={item.stage}>
                          <strong>{item.stage}: </strong>
                          {item.notes.join('; ')}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No mouth-comparison result for this run.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>

          <p className="text-sm text-muted-foreground">
            Inspect the processing stages or run each check separately.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { name: 'Video preparation', state: uploadState },
              { name: 'Speech recognition', state: speechState },
              { name: 'Mouth comparison', state: mouthState },
            ].map((item) => (
              <div
                key={item.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4"
              >
                <span className="text-sm font-medium">{item.name}</span>
                <StatusLabel state={item.state} />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className={secondaryButton}
              disabled={!canCheckSpeech}
              onClick={() => void analyze('transcription')}
            >
              Run speech check
            </button>
            <button
              type="button"
              className={secondaryButton}
              disabled={!canCheckSpeech || !example}
              onClick={() => void analyze('comparison')}
            >
              Run mouth comparison
            </button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <section>
              <h3 className="font-semibold">Transcript details</h3>
              <p className="mt-3 text-sm">
                Expected: {transcription?.expected || 'Awaiting analysis'}
              </p>
              <p className="mt-2 text-sm">
                Recognized:{' '}
                {transcription
                  ? transcription.heard || 'No speech detected'
                  : 'Awaiting analysis'}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                This checks recognized words against the phrase. It is
                not a pronunciation-quality score.
              </p>
            </section>

            <section>
              <h3 className="font-semibold">Timing details</h3>
              <p className="mt-3 text-sm">
                Your attempt:{' '}
                {comparison
                  ? `${comparison.user_ms} ms`
                  : 'Awaiting analysis'}
              </p>
              <p className="mt-2 text-sm">
                Reference:{' '}
                {comparison
                  ? `${comparison.example_ms} ms`
                  : 'Awaiting analysis'}
              </p>
            </section>
          </div>

          {practice.feedback && <p className="mt-4 text-xs text-muted-foreground">{practice.feedback.neural_note}</p>}
          <NeuralResultPanel
            result={comparison?.neural}
            hasComparison={Boolean(comparison)}
            processing={mouthState === 'running'}
          />

          <section className="mt-6 pt-5">
            <h3 className="font-semibold">Movement comparison plot</h3>

            {comparison ? (
              <img
                className="mt-4 block w-full rounded-xl bg-card"
                src={`${mediaUrl(comparison.png_url)}?v=${plotVersion}`}
                alt="Graphs comparing mouth opening, width, and shape"
              />
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
                Run a mouth comparison to see the generated graphs.
              </div>
            )}
          </section>
        </div>
      </details>
    </>
  )
}
