import type { Lesson } from '../../data/lessons'

export default function LessonPreview({ lesson }: { lesson: Lesson }) {
  return <section className="rounded-xl border bg-card p-6 shadow-card sm:p-10">
    <a href="#/lesson" className="inline-flex min-h-11 items-center text-sm font-bold text-muted-foreground">← Back to lessons</a>
    <p className="mt-6 text-xs font-bold tracking-widest text-muted-foreground uppercase">{lesson.category} · Coming soon</p>
    <h1 className="mt-3 text-3xl">{lesson.title}</h1><p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">{lesson.preview}</p>
    <div className="mt-7 rounded-lg bg-secondary p-5"><p className="font-heading text-lg">{lesson.id === 'write-it-down' ? 'Your future writing space' : 'Your future signing space'}</p><p className="mt-2 text-sm text-muted-foreground">Preview only. No recording, analysis, or completion is available here yet.</p></div>
    <a href="#/lesson" className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground">Explore available lessons</a>
  </section>
}
