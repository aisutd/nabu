import { useState } from 'react'
import { updatePreferences } from '../../data/learner_preferences'
import useLearnerPreferences from '../../hooks/use_learner_preferences'

const sections = [
  { id: 'support', title: 'About & support', symbol: '?' },
  { id: 'accessibility', title: 'Accessibility', symbol: 'Aa' },
  { id: 'notifications', title: 'Notifications', symbol: '◷' },
] as const

type Preference = 'largerText' | 'reducedMotion' | 'dailyReminder'
const issues = 'https://github.com/aisutd/nabu/issues'

function Toggle({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-lg border p-4 hover:bg-secondary">
      <span><strong className="block text-sm">{title}</strong><span className="mt-1 block text-sm text-muted-foreground">{detail}</span></span>
      <span className="relative flex shrink-0 items-center">
        <input type="checkbox" role="switch" aria-label={title} checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
        <span aria-hidden="true" className="pointer-events-none flex h-7 w-12 items-center rounded-full bg-accent p-1 transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
          <span className={`size-5 rounded-full bg-card transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </span>
      </span>
    </label>
  )
}

function SupportPanel() {
  const [topic, setTopic] = useState<'help' | 'privacy' | null>(null)
  const tile = 'block rounded-lg border p-4 text-left hover:bg-secondary'
  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">Learn about Nabu or get help with a learning activity.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setTopic(topic === 'help' ? null : 'help')} aria-expanded={topic === 'help'} className={tile}>
          <strong className="block">Help center</strong><span className="mt-1 block text-sm text-muted-foreground">Browse common questions</span>
        </button>
        <a href={issues} target="_blank" rel="noreferrer" className={tile}>
          <strong className="block">Contact support <span aria-hidden="true" className="text-primary">↗</span></strong><span className="mt-1 block text-sm text-muted-foreground">Ask for help on GitHub</span>
        </a>
        <button type="button" onClick={() => setTopic(topic === 'privacy' ? null : 'privacy')} aria-expanded={topic === 'privacy'} className={tile}>
          <strong className="block">Data & privacy</strong><span className="mt-1 block text-sm text-muted-foreground">See how practice data is handled</span>
        </button>
        <a href={`${issues}/new?title=Nabu%20feedback`} target="_blank" rel="noreferrer" className={tile}>
          <strong className="block">Send feedback <span aria-hidden="true" className="text-primary">↗</span></strong><span className="mt-1 block text-sm text-muted-foreground">Draft a GitHub issue</span>
        </a>
      </div>
      {topic === 'help' && <section className="mt-4 rounded-lg bg-secondary p-4 text-sm">
        <h3 className="mb-2 text-lg font-semibold">Common questions</h3>
        <details className="border-b py-2"><summary className="cursor-pointer font-bold">Where is my lesson progress saved?</summary><p className="mt-2 text-muted-foreground">In this browser. Return to Learn or Lessons to pick up where you left off.</p></details>
        <details className="py-2"><summary className="cursor-pointer font-bold">Why won’t my camera open?</summary><p className="mt-2 text-muted-foreground">Check the camera permission in your browser. Browser recording requires localhost or HTTPS. The ASL camera runs on the machine hosting the backend.</p></details>
      </section>}
      {topic === 'privacy' && <section className="mt-4 rounded-lg bg-secondary p-4 text-sm">
        <h3 className="mb-2 text-lg font-semibold">What is saved?</h3>
        <p>Profile details, preferences, and progress are stored in this browser. Handwriting samples are sent to the backend for comparison. Pronunciation recordings submitted for review are uploaded to the backend. The ASL service streams the camera attached to the server.</p>
      </section>}
      <p className="mt-5 rounded-lg bg-secondary px-4 py-3 text-sm font-bold text-muted-foreground">Nabu learning</p>
    </>
  )
}

export default function SettingsPage() {
  const [selected, setSelected] = useState<typeof sections[number]['id']>('support')
  const [notice, setNotice] = useState('')
  const preferences = useLearnerPreferences()
  const section = sections.find((item) => item.id === selected)!

  function save(key: Preference, checked: boolean) {
    try {
      updatePreferences({ [key]: checked })
      setNotice('Preference saved.')
    } catch {
      setNotice('Browser storage is unavailable. The preference could not be saved.')
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <header><h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Settings</h1><p className="mt-2 text-muted-foreground">Manage your preferences and find help.</p></header>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,3fr)]">
        <nav aria-label="Settings sections" className="grid gap-1 rounded-xl border bg-card p-2 shadow-card sm:grid-cols-3 lg:grid-cols-1">
          {sections.map(({ id, title, symbol }) => <button key={id} type="button" aria-current={selected === id ? 'true' : undefined}
            onClick={() => { setSelected(id); setNotice('') }}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-extrabold ${selected === id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}>
            <span aria-hidden="true" className="grid w-6 shrink-0 place-items-center font-heading text-lg">{symbol}</span>{title}
          </button>)}
        </nav>
        <section aria-labelledby="settings-section" className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
          <h2 id="settings-section" className="text-2xl font-semibold">{section.title}</h2>
          {selected === 'support' && <SupportPanel />}
          {selected === 'accessibility' && <div className="mt-4 grid gap-3">
            <Toggle title="Larger text" detail="Enlarge the content in Learn, Lessons, Profile, and Settings." checked={preferences.largerText} onChange={(value) => save('largerText', value)} />
            <Toggle title="Reduce motion" detail="Keep moving content still on learning and account screens." checked={preferences.reducedMotion} onChange={(value) => save('reducedMotion', value)} />
          </div>}
          {selected === 'notifications' && <div className="mt-4 grid gap-3">
            <Toggle title="Daily practice reminder" detail="Show a reminder on Learn until you practice that day." checked={preferences.dailyReminder} onChange={(value) => save('dailyReminder', value)} />
          </div>}
          {notice && <p role="status" className="mt-4 text-sm text-muted-foreground">{notice}</p>}
        </section>
      </div>
    </div>
  )
}
