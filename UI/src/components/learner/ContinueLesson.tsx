import type { Lesson } from '../../data/lessons'
import { lessonHref } from '../../data/learner_dashboard'

export default function ContinueLesson({ lesson, cursor = 0, compact = false }: { lesson?: Lesson; cursor?: number; compact?: boolean }) {
  return (
    <section aria-label="Continue learning" className={`relative isolate overflow-hidden rounded-xl bg-info text-primary-foreground shadow-card ${compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'}`}>
      {!compact && <span aria-hidden="true" className="absolute -top-16 -right-10 -z-10 size-52 rounded-full bg-white/10" />}
      <p className="mb-3 text-xs font-extrabold tracking-wider uppercase">{cursor ? 'Continue learning' : lesson ? 'Your next lesson' : 'Unit complete'}</p>
      <h2 className={compact ? 'text-2xl font-semibold' : 'text-3xl font-semibold sm:text-4xl'}>{lesson?.title ?? 'Make the words your own'}</h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed">{lesson?.description ?? 'You’ve finished all the available lessons. Revisit any lesson to keep practicing.'}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a href={lesson ? lessonHref(lesson.id) : '#/lesson'} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-card px-4 py-2 font-extrabold text-foreground hover:bg-secondary focus-visible:outline-primary-foreground">
          <span aria-hidden="true">▶</span> {cursor ? 'Resume lesson' : lesson ? 'Start lesson' : 'Review lessons'}
        </a>
        {lesson && <span className="text-xs font-bold">{cursor ? `${cursor} of ${lesson.questions.length} questions complete` : lesson.duration}</span>}
      </div>
    </section>
  )
}
