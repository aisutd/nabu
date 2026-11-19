import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { learningDashboard, lessonHref } from '../../data/learner_dashboard'
import { updatePreferences } from '../../data/learner_preferences'
import type { LearnerPreferences } from '../../data/learner_preferences'
import { unitWords } from '../../data/lessons'
import useLearnerPreferences from '../../hooks/use_learner_preferences'
import useLessonProgress from '../../hooks/use_lesson_progress'
import PracticeCalendar from './PracticeCalendar'

const card = 'rounded-xl border bg-card p-5 shadow-card sm:p-6'
const field = 'mt-2 min-h-11 w-full rounded-lg border border-input bg-background/30 px-3 py-2 font-normal'
const primary = 'min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90'

function AccountDetails({ preferences }: { preferences: LearnerPreferences }) {
  const [notice, setNotice] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function save(change: Partial<LearnerPreferences>, message: string) {
    try {
      updatePreferences(change)
      setNotice(message)
    } catch {
      setNotice('Browser storage is unavailable. Changes could not be saved.')
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    save({ name: String(form.get('name')).trim(), email: String(form.get('email')).trim() }, 'Profile details saved on this device.')
  }

  return (
    <section aria-label="Account details" className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
      <div className={`${card} text-center`}>
        <span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-info font-heading text-2xl font-semibold text-primary-foreground">
          {preferences.name.split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'N'}
        </span>
        <h2 className="mt-3 text-xl font-semibold">{preferences.name || 'Nabu learner'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Local demo profile</p>
        <p className="mt-4 border-t pt-4 text-left text-sm text-muted-foreground">Profile details and practice progress are saved in this browser.</p>
      </div>
      <div className="space-y-4">
        {preferences.demoSignedOut ? (
          <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
            <div><h2 className="text-xl font-semibold">Demo session ended</h2><p className="mt-1 text-sm text-muted-foreground">Your practice progress is still available on this device.</p></div>
            <button type="button" className={primary} onClick={() => save({ demoSignedOut: false }, 'Demo session started.')}>Open demo profile</button>
          </div>
        ) : <>
          <form onSubmit={saveProfile} className={card}>
            <h2 className="text-xl font-semibold">Profile details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Display name<input name="name" autoComplete="nickname" maxLength={60} defaultValue={preferences.name} placeholder="Nabu learner" className={field} /></label>
              <label className="text-sm font-bold">Email address<input name="email" type="email" autoComplete="email" maxLength={254} defaultValue={preferences.email} placeholder="you@example.com" className={field} /></label>
            </div>
            <div className="mt-4 flex justify-end"><button type="submit" className={primary}>Save profile</button></div>
          </form>
          <form onSubmit={(event) => {
            event.preventDefault()
            event.currentTarget.reset()
            setShowPassword(false)
            setNotice('Password update preview complete. No password was stored.')
          }} className={card}>
            <h2 className="text-xl font-semibold">Change password</h2>
            <p className="mt-1 text-sm text-muted-foreground">Demo only. Use fictional values for this preview.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Current password<input required type="password" autoComplete="off" className={field} /></label>
              <label className="text-sm font-bold">New password<input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="off" className={field} /></label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="size-4 accent-primary" /> Show new password</label>
              <button type="submit" className={primary}>Preview password update</button>
            </div>
          </form>
          <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
            <div><h2 className="text-xl font-semibold">Log out</h2><p className="mt-1 text-sm text-muted-foreground">End the demo session on this device.</p></div>
            <button type="button" onClick={() => save({ demoSignedOut: true }, 'Logged out of the demo profile.')} className="min-h-11 rounded-lg border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10">Log out</button>
          </div>
        </>}
        {notice && <p role="status" className="rounded-lg bg-secondary p-3 text-sm">{notice}</p>}
      </div>
    </section>
  )
}

export default function ProfilePage() {
  const [showAccount, setShowAccount] = useState(false)
  const accountPanel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showAccount) accountPanel.current?.scrollIntoView({ block: 'start' })
  }, [showAccount])
  const preferences = useLearnerPreferences()
  const { progress } = useLessonProgress()
  const { activity, today, streak, completed, next, practicedWords } = learningDashboard(progress)
  const practiced = practicedWords
  const counts = [
    { label: 'Current streak', value: `${streak} ${streak === 1 ? 'day' : 'days'}` },
    { label: 'Lessons completed', value: completed.length },
    { label: 'Words practiced', value: practiced.size },
  ]
  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Profile</h1><p className="mt-2 text-muted-foreground">See your practice progress and manage your profile on this device.</p></div>
        <button type="button" aria-expanded={showAccount} aria-controls="profile-account" onClick={() => setShowAccount((open) => !open)}
          className="min-h-11 rounded-lg border bg-card px-4 text-sm font-bold hover:bg-secondary">Manage profile</button>
      </header>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {counts.map(({ label, value }) => <div key={label} className={card}><dt className="text-xs font-bold text-muted-foreground sm:text-sm">{label}</dt><dd className="mt-1 font-heading text-3xl text-primary">{value}</dd></div>)}
      </dl>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          <section className={card}>
            <h2 className="text-xl font-semibold">Your next lesson</h2>
            {next ? <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-bold">{next.title}</p><p className="text-sm text-muted-foreground">{progress[next.id]?.cursor ?? 0} of {next.questions.length} questions complete</p></div>
              <a href={lessonHref(next.id)} className={`${primary} inline-flex items-center`}>{progress[next.id]?.cursor ? 'Resume lesson' : 'Start lesson'}</a>
            </div> : <a href="#/lesson" className="mt-3 inline-block font-bold text-primary">Review your lessons →</a>}
            {next && <progress value={progress[next.id]?.cursor ?? 0} max={next.questions.length} aria-label="Next lesson progress" className="lesson-progress mt-4 block h-2 w-full" />}
          </section>
          <section className={card}>
            <h2 className="text-xl font-semibold">Completed lessons</h2>
            {completed.length ? <ul className="mt-2 divide-y">{completed.map((lesson) => <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm font-bold">{lesson.title}</span><a href={lessonHref(lesson.id)} className="text-sm font-bold text-primary">Review <span className="sr-only">{lesson.title}</span>→</a></li>)}</ul>
              : <p className="mt-2 text-sm text-muted-foreground">Completed lessons will appear here.</p>}
          </section>
          <section className={card}>
            <h2 className="text-xl font-semibold">Words you’ve practiced</h2>
            {practiced.size ? <ul className="mt-3 flex flex-wrap gap-2">
              {[...practiced].map((word) => <li key={word} className="rounded-lg border bg-secondary px-3 py-2 text-sm font-bold">{unitWords.find((item) => item.toLowerCase() === word) ?? word}</li>)}
            </ul> : <p className="mt-2 text-sm text-muted-foreground">Practice a speaking lesson or record a word in the <a href="#/pronunciation" className="font-bold text-primary underline">Pronunciation Studio</a> to add it here.</p>}
          </section>
        </div>
        <PracticeCalendar activity={activity} today={today} />
      </div>
      <div ref={accountPanel} id="profile-account" hidden={!showAccount}>
        <AccountDetails preferences={preferences} />
      </div>
    </div>
  )
}
