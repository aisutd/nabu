import { useState } from 'react'
import type { Lesson } from '../../data/lessons'
import { emptyProgress } from '../../data/lesson_progress'
import type { LessonProgressStore } from '../../hooks/use_lesson_progress'
import LessonShell from './LessonShell'
import LessonSummary from './LessonSummary'
import QuestionActivity from './QuestionActivity'

export default function LessonRunner({ lesson, store }: { lesson: Lesson; store: LessonProgressStore }) {
  const [busy, setBusy] = useState(false)
  const progress = store.progress[lesson.id] ?? emptyProgress()
  if (progress.completed) return <LessonSummary lesson={lesson} progress={progress} onRestart={() => store.restart(lesson)} />
  const question = lesson.questions[progress.cursor]
  const previous = progress.attempts.filter((attempt) => attempt.questionId === question.id).at(-1)

  return <LessonShell lesson={lesson} cursor={progress.cursor} busy={busy}>
    <QuestionActivity key={`${lesson.id}:${question.id}`} question={question} previous={previous}
      onAttempt={(attempt) => store.record(lesson, attempt)}
      onAdvance={() => { store.advance(lesson); window.scrollTo({ top: 0, behavior: 'instant' }) }}
      onSkip={(attempt) => { store.skip(lesson, attempt); window.scrollTo({ top: 0, behavior: 'instant' }) }}
      onBusyChange={setBusy} />
  </LessonShell>
}
