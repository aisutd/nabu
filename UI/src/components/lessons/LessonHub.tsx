import { lessons, unitWords } from '../../data/lessons'
import type { ProgressMap } from '../../data/lesson_progress'

export default function LessonHub({ progress }: { progress: ProgressMap }) {
  const ready = lessons.filter((lesson) => lesson.status === 'ready')
  const finished = ready.filter((lesson) => progress[lesson.id]?.completed).length
  const next = ready.find((lesson) => progress[lesson.id] && !progress[lesson.id].completed) ?? ready.find((lesson) => !progress[lesson.id]?.completed)
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-extrabold tracking-widest text-muted-foreground uppercase">English · Unit 1</p><h1 className="mt-2 text-3xl font-medium sm:text-4xl">A few words. A new beginning.</h1><p className="mt-3 text-muted-foreground">Meet the words, put them together, and make them your own.</p></div>
        <a href="#/pronunciation" className="min-h-11 rounded-lg border bg-card px-4 py-3 text-sm font-bold hover:bg-secondary">Practice lab ↗</a>
      </header>
      <section className="rounded-xl border bg-card p-5 shadow-card sm:p-7" aria-label="Continue learning">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div><p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{next ? 'Your next step' : 'Unit reviewed'}</p><h2 className="mt-2 text-2xl">{next?.title ?? 'Make the words your own'}</h2><p className="mt-2 text-sm text-muted-foreground">{next?.description ?? 'All four available lessons are complete. Revisit any lesson below.'}</p></div>
          <a href={`#/lesson/${next?.id ?? ready[0].id}`} className="inline-flex min-h-12 items-center rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90">{next ? (progress[next.id] ? 'Continue lesson' : 'Start learning') : 'Review a lesson'} →</a>
        </div>
        <div className="mt-6 flex items-center gap-4"><progress value={finished} max={ready.length} aria-label="Lessons completed" className="lesson-progress h-2 w-full" /><span className="shrink-0 text-xs font-semibold text-muted-foreground">{finished} of {ready.length} complete</span></div>
      </section>
      <section aria-label="Unit vocabulary" className="flex flex-wrap items-center gap-2"><span className="mr-2 text-sm font-bold text-muted-foreground">Your words</span>{unitWords.map((word) => <span key={word} className="rounded-full border bg-secondary px-3 py-1.5 text-sm">{word}</span>)}</section>
      <section aria-labelledby="lesson-path"><h2 id="lesson-path" className="mb-5 text-2xl">Your learning path</h2>
        <ol className="space-y-4">
          {lessons.map((lesson) => {
            const state = progress[lesson.id]
            const comingSoon = lesson.status === 'coming-soon'
            return <li key={lesson.id}>
              <a href={`#/lesson/${lesson.id}`} className={`group flex min-w-0 items-center gap-4 rounded-xl border p-4 sm:gap-6 sm:p-6 ${comingSoon ? 'bg-secondary' : 'bg-card shadow-card hover:bg-secondary'}`}>
                <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-full font-heading text-xl sm:size-14 ${state?.completed ? 'bg-success/20 text-foreground' : comingSoon ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'}`}>{state?.completed ? '✓' : lesson.symbol}</span>
                <div className="min-w-0 flex-1"><p className="text-xs font-bold text-muted-foreground">{lesson.category} · {lesson.duration}</p><h3 className="mt-1 text-xl">{lesson.title}</h3><p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>
                  <p className="mt-2 text-xs font-bold text-primary">{comingSoon ? 'Coming soon · View preview' : state?.completed ? 'Completed · Review' : state ? `${state.cursor} of ${lesson.questions.length} questions complete · Resume` : 'Ready to start'}</p>
                </div><span aria-hidden="true" className="text-xl text-muted-foreground">→</span>
              </a>
            </li>
          })}
        </ol>
      </section>
      <p className="text-xs text-muted-foreground">Progress stays in this browser. No account or cross-device sync yet.</p>
    </div>
  )
}
