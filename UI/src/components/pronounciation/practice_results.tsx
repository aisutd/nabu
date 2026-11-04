import { mediaUrl } from '../../api/pronounciation'
import type {
  Comparison,
  Transcription,
} from '../../api/pronounciation'

type Props = {
  status: string
  error: string
  transcription: Transcription | null
  comparison: Comparison | null
  plotVersion: number
}

export default function PracticeResults({
  status,
  error,
  transcription,
  comparison,
  plotVersion,
}: Props) {
  return (
    <>
      <p className="my-4" role="status" aria-live="polite">
        {status}
      </p>

      {error && (
        <p role="alert" className="my-4 text-[#b42318]">
          {error}
        </p>
      )}

      {transcription && (
        <section className="mb-5 rounded-xl border border-[#dce1eb] bg-white p-5">
          <h2 className="mb-[0.83em] text-[1.5em] leading-normal font-bold">
            Speech recognition
          </h2>

          <p className="my-4">
            Expected: {transcription.expected}
          </p>

          <p className="my-4">
            Heard: {transcription.heard || '(No speech detected)'}
          </p>

          <p className="my-4">
            {transcription.match
              ? 'The recognized words match.'
              : 'The recognized words do not match.'}
          </p>
        </section>
      )}

      {comparison && (
        <section className="mb-5 rounded-xl border border-[#dce1eb] bg-white p-5">
          <h2 className="mb-[0.83em] text-[1.5em] leading-normal font-bold">
            Mouth movement results
          </h2>

          <p className="my-4">
            Your duration: {comparison.user_ms} ms.
            Example duration: {comparison.example_ms} ms.
          </p>

          <ul className="my-4 list-disc pl-10">
            {comparison.feedback.map((item) => (
              <li className="mb-2.5" key={item.stage}>
                <strong>{item.stage}:</strong>{' '}
                {item.notes.join('; ')}
              </li>
            ))}
          </ul>

          <img
            className="mt-5 block w-full"
            src={`${mediaUrl(comparison.png_url)}?v=${plotVersion}`}
            alt="Graphs comparing mouth opening, width, and shape"
          />
        </section>
      )}
    </>
  )
}