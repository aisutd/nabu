import type { ReactNode } from 'react'
import type { Lesson } from '../../data/lessons'

export default function LessonShell({ lesson, cursor, busy, children }: { lesson: Lesson; cursor: number; busy: boolean; children: ReactNode }) {
  return <div>
    <header className="mb-7">
      {busy ? <span className="inline-flex min-h-11 items-center text-sm text-muted-foreground">Finish recording or reviewing before leaving.</span> : <a href="#/lesson" className="inline-flex min-h-11 items-center text-sm font-bold text-muted-foreground hover:text-foreground">← Back to lessons</a>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">English · {lesson.category}</p><h1 className="mt-2 text-3xl">{lesson.title}</h1></div><span className="text-sm font-bold text-muted-foreground">Question {cursor + 1} of {lesson.questions.length}</span></div>
      <progress value={cursor} max={lesson.questions.length} aria-label="Questions completed" className="lesson-progress mt-5 h-2 w-full" />
    </header>
    {children}
  </div>
}
