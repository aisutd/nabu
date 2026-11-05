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
        <p className="text-sm text-muted-foreground sm:mr-auto">
          {busy
            ? 'Taking a closer look at your attempt…'
            : 'Both clips are ready. Let’s take a closer look.'}
        </p>
      )}

      <button
        type="button"
        disabled={!ready || busy}
        onClick={onReview}
        className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Reviewing…' : 'Review my attempt'}
      </button>
    </div>
  )
}