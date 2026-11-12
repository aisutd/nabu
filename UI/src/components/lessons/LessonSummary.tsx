import type { Lesson } from '../../data/lessons'
import { lessons } from '../../data/lessons'
import { lessonSummary } from '../../data/lesson_progress'
import type { LessonProgress } from '../../data/lesson_progress'

export default function LessonSummary({ lesson, progress, onRestart }: { lesson: Lesson; progress: LessonProgress; onRestart: () => void }) {
  const summary = lessonSummary(progress, lesson)
  const next = lessons.slice(lessons.findIndex((item) => item.id === lesson.id) + 1).find((item) => item.status === 'ready')
  return <section className="rounded-xl border bg-card p-6 shadow-card sm:p-10">
    <span aria-hidden="true" className="inline-flex size-14 items-center justify-center rounded-full bg-success/20 text-2xl">✓</span>
    <p className="mt-5 text-xs font-bold tracking-widest text-muted-foreground uppercase">English · Lesson complete</p>
    <h1 className="mt-2 text-3xl">A little practice, a step forward.</h1><p className="mt-3 text-muted-foreground">You finished “{lesson.title}”.</p>
    <dl className="mt-7 grid gap-3 sm:grid-cols-3">
      {[['Questions reviewed', summary.reviewed], ['Attempts made', summary.attempts], ['Questions skipped', summary.skipped]].map(([label, value]) => <div key={label} className="rounded-lg bg-secondary p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 font-heading text-3xl">{value}</dd></div>)}
    </dl>
    <p className="mt-4 text-xs text-muted-foreground">Completion records participation, not a pronunciation accuracy score.</p>
    <div className="mt-7 flex flex-wrap gap-3">
      {next && <a href={`#/lesson/${next.id}`} className="inline-flex min-h-12 items-center rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">Next lesson →</a>}
      <a href="#/lesson" className="inline-flex min-h-12 items-center rounded-lg border px-5 py-3 font-bold hover:bg-secondary">Back to lessons</a>
      <button type="button" onClick={onRestart} className="min-h-12 rounded-lg px-4 py-3 text-sm font-bold text-muted-foreground underline underline-offset-4">Practice again</button>
    </div>
    <p className="mt-4 text-xs text-muted-foreground">Practicing again replaces this lesson’s saved run.</p>
  </section>
}
