import { dayKey } from '../../data/pronunciation_progress'

export default function WeeklyProgress({ week, activity, count, today }: {
  week: Date[]; activity: Record<string, number>; count: number; today: string
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
      <h2 className="text-xl font-semibold">Weekly progress</h2>
      <p className="mt-1 text-sm text-muted-foreground">{count >= 5 ? `Goal reached · ${count} practice days this week` : `${count} of 5 practice days this week`}</p>
      <ol className="mt-5 grid grid-cols-7 gap-1" aria-label="Practice this week">
        {week.map((date) => {
          const day = dayKey(date)
          const label = date.toLocaleDateString(undefined, { weekday: 'long' })
          const done = Boolean(activity[day])
          return <li key={day} aria-current={day === today ? 'date' : undefined} className="grid justify-items-center gap-1 text-xs font-bold">
            <span className={`grid size-8 place-items-center rounded-full sm:size-9 ${done ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'} ${day === today ? 'ring-1 ring-primary ring-offset-2 ring-offset-card' : ''}`} aria-hidden="true">{done ? '✓' : '·'}</span>
            <span aria-hidden="true" className="text-muted-foreground">{label.slice(0, 2)}</span>
            <span className="sr-only">{label}, {done ? 'practiced' : 'no practice'}</span>
          </li>
        })}
      </ol>
    </section>
  )
}
