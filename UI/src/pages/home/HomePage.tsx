import ContinueLesson from '../../components/learner/ContinueLesson'
import WeeklyProgress from '../../components/learner/WeeklyProgress'
import { learningDashboard } from '../../data/learner_dashboard'
import useLearnerPreferences from '../../hooks/use_learner_preferences'
import useLessonProgress from '../../hooks/use_lesson_progress'

const practices = [
  { title: 'ASL', href: '#/asl', symbol: '✋', description: 'Practice fingerspelling with live feedback.', accent: 'bg-success/15' },
  { title: 'Pronunciation', href: '#/pronunciation', symbol: 'Aa', description: 'Listen, repeat, and play back your take.', accent: 'bg-info/15 text-info' },
  { title: 'Handwriting', href: '#/handwriting', symbol: '✎', description: 'Compare your handwriting with a reference glyph.', accent: 'bg-primary/10 text-primary' },
]

export default function HomePage() {
  const { progress } = useLessonProgress()
  const { name, demoSignedOut, dailyReminder } = useLearnerPreferences()
  const dashboard = learningDashboard(progress)
  const { next, streak } = dashboard
  const firstName = !demoSignedOut && name.trim().split(/\s+/)[0]

  return (
    <div className="space-y-7 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Keep learning{firstName ? `, ${firstName}` : ''}</h1>
          <p className="mt-2 text-muted-foreground">Pick up where you left off or choose a skill to practice.</p>
        </div>
        <a href="#/profile" className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-card hover:bg-secondary">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-warning/25">✦</span>
          <span><strong className="block font-heading text-lg">{streak} {streak === 1 ? 'day' : 'days'}</strong><span className="block text-xs font-bold text-muted-foreground">Current streak</span></span>
        </a>
      </header>
      {dailyReminder && !dashboard.activity[dashboard.today] && <p className="rounded-lg border bg-warning/15 p-3 text-sm">Your daily practice is ready. A lesson question or recorded take counts toward today.</p>}
      <ContinueLesson lesson={next} cursor={next ? progress[next.id]?.cursor : 0} />
      <section aria-labelledby="practice-heading">
        <h2 id="practice-heading" className="mb-3 text-2xl font-semibold">Practice a skill</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {practices.map(({ title, href, symbol, description, accent }) => (
            <a key={href} href={href} className="flex flex-col rounded-xl border bg-card p-5 shadow-card hover:bg-secondary">
              <span aria-hidden="true" className={`mb-4 grid size-10 place-items-center rounded-lg font-heading text-xl ${accent}`}>{symbol}</span>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{description}</p>
              <span className="mt-4 text-sm font-extrabold text-primary">Start practice <span aria-hidden="true">→</span></span>
            </a>
          ))}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <WeeklyProgress week={dashboard.week} activity={dashboard.activity} count={dashboard.weekDays} today={dashboard.today} />
        <a href="#/lesson" className="flex flex-col justify-center rounded-xl border bg-primary/10 p-5 hover:bg-primary/15 sm:p-6">
          <strong className="font-heading text-2xl">Explore lessons <span aria-hidden="true">→</span></strong>
          <span className="mt-2 text-sm text-muted-foreground">Browse the full learning path.</span>
        </a>
      </div>
    </div>
  )
}
