import { useState } from 'react'
import { dayKey } from '../../data/pronunciation_progress'

const months = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function PracticeCalendar({ activity, today }: { activity: Record<string, number>; today: string }) {
  const [offset, setOffset] = useState(0)
  const now = new Date()
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leading = (month.getDay() + 6) % 7
  const entries = Array.from({ length: days }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))
  const active = entries.filter((date) => activity[dayKey(date)]).length
  const monthly = Object.keys(activity).filter((day) => day <= today).reduce<Record<string, number>>((totals, day) => {
    const key = day.slice(0, 7)
    if (!Number.isFinite(new Date(`${key}-01T12:00:00`).getTime())) return totals
    totals[key] = (totals[key] ?? 0) + 1
    return totals
  }, {})

  return (
    <section className="rounded-xl border bg-card p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-semibold">Your practice rhythm</h2><p role="status" className="mt-1 text-sm text-muted-foreground">{months.format(month)} · {active} {active === 1 ? 'active day' : 'active days'}</p></div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous month" onClick={() => setOffset(offset - 1)} className="grid size-11 place-items-center rounded-lg border bg-secondary hover:bg-accent">←</button>
          <button type="button" aria-label="Next month" disabled={offset === 0} onClick={() => setOffset(offset + 1)} className="grid size-11 place-items-center rounded-lg border bg-secondary hover:bg-accent disabled:opacity-40">→</button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center sm:gap-2" aria-label={months.format(month)}>
        {weekdays.map((day) => <span key={day} className="py-1 text-xs font-bold text-muted-foreground">{day}</span>)}
        {Array.from({ length: leading }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
        {entries.map((date) => {
          const key = dayKey(date)
          const count = activity[key] ?? 0
          return <span key={key} aria-current={key === today ? 'date' : undefined}
            className={`grid min-h-9 place-items-center rounded-md text-sm font-bold sm:min-h-12 ${count ? 'bg-success/20 text-foreground' : 'bg-secondary text-muted-foreground'} ${key === today ? 'ring-1 ring-primary' : ''}`}>
            <span aria-hidden="true">{date.getDate()}{count > 0 && <span className="ml-0.5 text-primary">·</span>}</span>
            <span className="sr-only">{date.toLocaleDateString()}, {count ? `${count} ${count === 1 ? 'activity' : 'activities'}` : 'no practice'}</span>
          </span>
        })}
      </div>
      <details className="mt-4 border-t pt-3">
        <summary className="cursor-pointer py-2 text-sm font-bold text-primary">Monthly history</summary>
        {Object.keys(monthly).length ? <ul className="divide-y">{Object.entries(monthly).sort(([a], [b]) => b.localeCompare(a)).map(([key, count]) => {
          const date = new Date(`${key}-01T12:00:00`)
          return <li key={key} className="flex flex-wrap justify-between gap-1 py-3 text-sm"><span>{months.format(date)}</span><span className="font-bold text-muted-foreground">{count} {count === 1 ? 'active day' : 'active days'}</span></li>
        })}</ul> : <p className="py-2 text-sm text-muted-foreground">Your practice days will appear here.</p>}
      </details>
    </section>
  )
}
