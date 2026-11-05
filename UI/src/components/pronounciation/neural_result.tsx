import type { NeuralResult } from '../../api/pronounciation'

type Props = {
  result?: NeuralResult
  hasComparison: boolean
  processing: boolean
}

export default function NeuralResultPanel({ result, hasComparison, processing }: Props) {
  return (
    <section className="mt-6 rounded-xl bg-[#fffcf7] p-4">
      <h3 className="font-semibold">Neural mouth comparison</h3>

      {processing ? (
        <p className="mt-2 text-sm text-[#756354]">Waiting for the mouth comparison result…</p>
      ) : !hasComparison ? (
        <p className="mt-2 text-sm text-[#756354]">Run a mouth comparison to see the model result.</p>
      ) : !result ? (
        <p className="mt-2 text-sm text-[#756354]">The backend did not return a neural result.</p>
      ) : result.available ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>Embedding cosine similarity: <strong className="tabular-nums">{result.cosine_similarity.toFixed(3)}</strong></p>
          <p className="break-all">Checkpoint: {result.checkpoint}</p>
          <p>Embedding dimensions: {result.embedding_dimension}</p>
          <p className="text-[#756354]">{result.note}</p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#923d2c]">Neural comparison unavailable: {result.reason}</p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-[#756354]">
        Experimental mouth-motion similarity, not pronunciation accuracy or a percentage.
        Use one isolated word per clip, no longer than five seconds, with the mouth visible throughout.
      </p>
    </section>
  )
}
