type Props = {
  ready: boolean
  busy: boolean
  onReview: () => void
}

export default function PracticeActions({
  ready,
  busy,
  onReview,
}: Props) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      {(busy || ready) && (
        <p className="text-sm text-[#756354] sm:mr-auto">
          {busy
            ? 'Taking a closer look at your attempt…'
            : 'Both clips are ready. Let’s take a closer look.'}
        </p>
      )}

      <button
        type="button"
        disabled={!ready || busy}
        onClick={onReview}
        className="rounded-xl bg-[#513529] px-5 py-3 text-sm font-semibold text-[#fffaf2] transition hover:bg-[#38231b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#99633e] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Reviewing…' : 'Review my attempt'}
      </button>
    </div>
  )
}