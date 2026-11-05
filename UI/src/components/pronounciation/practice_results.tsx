import { mediaUrl } from '../../api/pronounciation'
import type {
  PronunciationPracticeState,
  Stage,
} from '../../hooks/use_pronounciation_practice'

type Props = {
  practice: PronunciationPracticeState
}

const secondaryButton =
  'rounded-lg border border-[#d7c5ad] px-3 py-2 text-sm font-medium text-[#513529] hover:bg-[#eee1cc] disabled:cursor-not-allowed disabled:opacity-40'

function StatusLabel({ state }: { state: Stage }) {
  const labels = {
    idle: 'Waiting',
    running: 'Processing',
    done: 'Complete',
    error: 'Failed',
  }

  const colors = {
    idle: 'bg-[#eee7dc] text-[#756354]',
    running: 'bg-[#f3dfb9] text-[#775021]',
    done: 'bg-[#e0e8d8] text-[#415834]',
    error: 'bg-[#f5ded6] text-[#923d2c]',
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
        className="mt-4 min-h-6 text-sm text-[#756354]"
      >
        {status}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-[#e3b9a9] bg-[#faeae2] p-3 text-sm text-[#923d2c]"
        >
          {error}
        </p>
      )}

      <section className="mt-8 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          Your feedback
        </h2>

        {!transcription && !comparison ? (
          <p className="mt-3 text-[#756354]">
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
                  <p className="mt-2 text-sm text-[#756354]">
                    {transcription.match
                      ? 'The recognized words match your phrase.'
                      : `Expected: “${transcription.expected}”. Listen to your attempt and try again.`}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-[#756354]">
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
                <p className="mt-2 text-sm text-[#756354]">
                  No mouth-comparison result for this run.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <details
        open
        className="mt-10 rounded-2xl border border-[#d7c5ad] bg-[#f1e8da]"
      >
        <summary className="cursor-pointer px-5 py-5 text-lg font-semibold">
          Analysis workspace
        </summary>

        <div className="p-5">
          <p className="text-sm text-[#756354]">
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fffcf7] p-4"
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
              <p className="mt-3 text-xs leading-relaxed text-[#756354]">
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

          <section className="mt-6 pt-5">
            <h3 className="font-semibold">Movement comparison plot</h3>

            {comparison ? (
              <img
                className="mt-4 block w-full rounded-xl bg-white"
                src={`${mediaUrl(comparison.png_url)}?v=${plotVersion}`}
                alt="Graphs comparing mouth opening, width, and shape"
              />
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[#c8b394] px-5 py-10 text-center text-sm text-[#756354]">
                Run a mouth comparison to see the generated graphs.
              </div>
            )}
          </section>
        </div>
      </details>
    </>
  )
}