import { useState } from 'react'
import { lessons, unitWords } from '../../data/lessons'
import type { ProgressMap } from '../../data/lesson_progress'
import { availableLessons, learningDashboard, lessonHref } from '../../data/learner_dashboard'
import ContinueLesson from '../learner/ContinueLesson'

export default function LessonHub({ progress }: { progress: ProgressMap }) {
  const [search, setSearch] = useState('')
  const { completed, completedThisWeek, next } = learningDashboard(progress)
  const completion = Math.round(completed.length / availableLessons.length * 100)
  const result = lessons.filter((lesson) =>
    `${lesson.title} ${lesson.description} ${lesson.category}`.toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Lessons</h1><p className="mt-2 text-muted-foreground">Meet the words, put them together, and make them your own.</p></div>
        <input aria-label="Search lessons" type="search" placeholder="Search lessons" value={search} onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 w-full rounded-lg border bg-card px-4 py-2 text-sm sm:w-56" />
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2.5fr)_minmax(14rem,1fr)]">
        <section className="overflow-hidden rounded-xl border bg-card shadow-card">
          <header className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div><h2 className="text-xl font-semibold">Foundations</h2><p className="mt-1 text-xs font-bold text-muted-foreground">English · Unit 1 · {availableLessons.length} available lessons</p></div>
            <span className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-extrabold">{completion}% complete</span>
          </header>
          {result.length ? <ol className="divide-y border-t">{result.map((lesson) => {
            const state = progress[lesson.id]
            const preview = lesson.status === 'coming-soon'
            const status = preview ? 'Coming soon · View preview' : state?.completed ? 'Completed · Review' : state?.cursor ? `${state.cursor} of ${lesson.questions.length} complete · Resume` : lesson.category
            const style = state?.completed ? 'bg-success/20' : preview ? 'bg-secondary text-muted-foreground' : 'bg-primary/10 text-primary'
            return <li key={lesson.id}>
              <a href={lessonHref(lesson.id)} className="flex items-center gap-3 px-4 py-4 hover:bg-secondary sm:gap-4 sm:px-5">
                <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-lg font-heading ${style}`}>{state?.completed ? '✓' : lesson.symbol}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold leading-tight">{lesson.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{lesson.description}</p>
                  <p className="mt-1 text-xs font-bold text-primary">{status}</p>
                </div>
                {!preview && <span className="hidden shrink-0 text-xs font-bold text-muted-foreground sm:block">{lesson.duration}</span>}
                <span aria-hidden="true" className="text-primary">›</span>
              </a>
            </li>
          })}</ol> : <p role="status" className="border-t p-5 text-sm text-muted-foreground">No lessons match your search.</p>}
        </section>
        <aside className="grid gap-4">
          <ContinueLesson lesson={next} cursor={next ? progress[next.id]?.cursor : 0} compact />
          <section className="rounded-xl border bg-card p-5 shadow-card">
            <h2 className="text-xl font-semibold">Lesson goal</h2>
            <p className="mt-1 text-sm text-muted-foreground">Complete 3 lessons this week.</p>
            <progress value={Math.min(completedThisWeek, 3)} max={3} aria-label="Weekly lesson goal" className="lesson-progress mt-4 block h-2 w-full" />
            <p className="mt-2 text-right text-xs font-bold text-muted-foreground">{completedThisWeek >= 3 ? `Goal reached · ${completedThisWeek} completed` : `${completedThisWeek} of 3`}</p>
          </section>
        </aside>
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Unit vocabulary">
        <span className="mr-1 text-sm font-bold text-muted-foreground">Your words</span>
        {unitWords.map((word) => <span key={word} className="rounded-full border bg-card px-3 py-1 text-sm">{word}</span>)}
      </div>
    </div>
  )
}
