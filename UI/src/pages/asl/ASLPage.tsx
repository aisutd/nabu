import { useEffect, useState } from 'react'
import { apiUrl } from '../../api/backend'

type Prediction = { label: string; chance: number }
type DemoState = {
  mode: 'letter' | 'moving' | 'no_hand'
  text: string
  letter: string | null
  speed: number
  guesses: Prediction[]
  last_sign: Prediction | null
  signs_enabled: boolean
  error: string | null
}

const endpoint = apiUrl('/asl-api')
const modeLabels = { letter: 'Reading letter', moving: 'Reading motion', no_hand: 'No hand' }
const commands = [['space', 'Space'], ['backspace', 'Delete'], ['clear', 'Clear']] as const
const card = 'rounded-xl border bg-card p-5 shadow-card'

function confidence(chance: number) {
  return `${Math.round(chance * 100)}%`
}

export default function ASLPage() {
  const [state, setState] = useState<DemoState>()
  const [connected, setConnected] = useState<boolean>()
  const [editError, setEditError] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined
    let pollDelay = 250

    async function poll() {
      try {
        const response = await fetch(`${endpoint}/state`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('ASL service unavailable')
        const data: DemoState = await response.json()
        pollDelay = 250
        if (!controller.signal.aborted) {
          setState(data)
          setConnected(true)
        }
      } catch {
        pollDelay = Math.min(10_000, Math.max(1_000, pollDelay * 2))
        if (!controller.signal.aborted) setConnected(false)
      }
      if (!controller.signal.aborted) timer = window.setTimeout(poll, pollDelay)
    }

    void poll()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  async function edit(command: typeof commands[number][0]) {
    setEditing(true)
    setEditError('')
    try {
      const response = await fetch(`${endpoint}/text/${command}`, { method: 'POST' })
      if (!response.ok) throw new Error('Edit failed')
    } catch {
      setEditError('Could not update the transcript. Try again when the service is connected.')
    } finally {
      setEditing(false)
    }
  }

  const cameraError = connected === false
    ? 'ASL service unavailable. Start the Nabu backend on port 8000.'
    : state?.error

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl font-semibold">Live ASL recognition</h1>
          <p className="mt-2 text-muted-foreground">Use the webcam on the computer running the ASL service.</p>
        </div>
        <span className="rounded-full bg-muted px-4 py-1.5 text-sm font-bold text-muted-foreground">
          {connected === false ? 'Disconnected' : state ? modeLabels[state.mode] : 'Connecting…'}
        </span>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <section aria-label="Camera preview" className="overflow-hidden rounded-xl border bg-card shadow-card">
          <div className="relative grid aspect-video place-items-center bg-foreground/90">
            {connected && !cameraError && (
              <img className="absolute inset-0 size-full object-contain" src={`${endpoint}/stream`} alt="Live webcam with detected hand landmarks" />
            )}
            {cameraError && <p role="status" className="m-4 rounded-lg bg-card px-4 py-2 text-center text-sm">{cameraError}</p>}
          </div>
          <div className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm text-muted-foreground">
            <span>{state?.signs_enabled ? 'Hold still for a letter. Move to sign a word.' : 'Hold still to fingerspell a letter.'}</span>
            {connected && state && <span className="tabular-nums">Speed {state.speed.toFixed(2)}</span>}
          </div>
        </section>
        <div className="grid gap-4">
          <section className={card}>
            <h2 className="font-heading text-xl font-semibold">Transcript</h2>
            <p className="min-h-20 whitespace-pre-wrap py-2 font-heading text-3xl">{state?.text}</p>
            <div className="flex flex-wrap gap-2">
              {commands.map(([command, label]) => (
                <button key={command} type="button" disabled={!connected || editing || Boolean(cameraError)} onClick={() => void edit(command)}
                  className={`rounded-lg px-4 py-2 font-bold disabled:opacity-50 ${command === 'clear' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                  {label}
                </button>
              ))}
            </div>
            {editError && <p role="alert" className="mt-2 text-sm text-destructive">{editError}</p>}
          </section>
          <section className={card}>
            <h2 className="font-heading text-xl font-semibold">Current letter</h2>
            <div className="mt-3 flex items-center gap-4">
              <span className="grid size-20 shrink-0 place-items-center rounded-xl bg-accent font-heading text-5xl text-accent-foreground">{connected && state?.letter || '·'}</span>
              <ul className="flex-1 space-y-2 text-sm">
                {connected && state?.guesses.map((guess) => (
                  <li key={guess.label} className="flex items-center gap-2">
                    <span className="w-5 font-bold">{guess.label}</span>
                    <span aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary" style={{ width: confidence(guess.chance) }} />
                    </span>
                    <span className="w-10 text-right tabular-nums text-muted-foreground">{confidence(guess.chance)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          {connected && state && (
            <section className={card}>
              <h2 className="font-heading text-xl font-semibold">Last sign</h2>
              <p className="mt-2 text-muted-foreground">
                {state.signs_enabled
                  ? state.last_sign ? `${state.last_sign.label} · ${confidence(state.last_sign.chance)} confidence` : 'Waiting for a sign.'
                  : 'Letter recognition is active. Word recognition requires the sign model.'}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
