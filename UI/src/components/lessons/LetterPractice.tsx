import { useEffect, useRef, useState } from 'react'
import { apiUrl } from '../../api/backend'
import { request } from '../../api/pronounciation'
import type { Question } from '../../data/lessons'

const card = 'rounded-xl border bg-card p-5 shadow-card sm:p-6'
const button = 'min-h-11 rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-40'

type SigningQuestion = Extract<Question, { kind: 'signing' }>
type HandwritingQuestion = Extract<Question, { kind: 'handwriting' }>
type SigningState = { letter: string | null; error: string | null }

export function SigningPractice({ question, onCheck }: {
  question: SigningQuestion; onCheck: (letter: string) => void
}) {
  const [state, setState] = useState<SigningState>()
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let delay = 250
    let timer: number | undefined
    async function poll() {
      try {
        const result = await request<SigningState>('/asl-api/state', { signal: controller.signal, cache: 'no-store' })
        if (controller.signal.aborted) return
        setState(result)
        setOffline(false)
        delay = 250
      } catch {
        if (controller.signal.aborted) return
        setOffline(true)
        delay = Math.min(10_000, Math.max(1000, delay * 2))
      }
      timer = window.setTimeout(poll, delay)
    }
    void poll()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  const detected = offline || state?.error ? null : state?.letter
  return (
    <section className={card}>
      <h2 className="text-2xl">{question.prompt}</h2>
      <p className="mt-2 text-muted-foreground">{question.cue}</p>
      <div className="mt-4 grid aspect-video max-h-80 place-items-center overflow-hidden rounded-lg bg-secondary">
        {state && !offline && !state.error
          ? <img src={apiUrl('/asl-api/stream')} alt="Live ASL camera preview" className="size-full min-h-0 object-contain" />
          : <p role="status" className="p-4 text-center text-sm text-muted-foreground">{offline ? 'The ASL backend is unavailable.' : state?.error ?? 'Connecting to the ASL camera…'}</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-lg bg-secondary px-4 py-2 text-sm font-bold">Current letter: {detected || '—'}</span>
        <button type="button" className={button} disabled={!detected} onClick={() => { if (detected) onCheck(detected.toUpperCase()) }}>
          Check my sign
        </button>
      </div>
    </section>
  )
}

export function HandwritingPractice({ question, onReview, onReset, onBusyChange }: {
  question: HandwritingQuestion; onReview: (similarity: number) => void; onReset: () => void; onBusyChange: (busy: boolean) => void
}) {
  const [sample, setSample] = useState<{ file: File; url: string }>()
  const [pending, setPending] = useState(false)
  const [referenceFailed, setReferenceFailed] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => () => { requestRef.current?.abort() }, [])
  useEffect(() => () => { if (sample) URL.revokeObjectURL(sample.url) }, [sample])

  async function review() {
    if (!sample || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setPending(true)
    onBusyChange(true)
    setError('')
    const body = new FormData()
    body.append('file', sample.file)
    body.append('expected', question.letter)
    try {
      const result = await request<{ similarity: number }>('/ocr/errorfinder/grade', { method: 'POST', body, signal: controller.signal })
      if (!Number.isFinite(result.similarity) || result.similarity < 0 || result.similarity > 100) throw new Error('The backend did not return a valid review.')
      if (!controller.signal.aborted) onReview(result.similarity)
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not review this sample.')
    } finally {
      requestRef.current = null
      if (!controller.signal.aborted) {
        setPending(false)
        onBusyChange(false)
      }
    }
  }

  return (
    <section className={card}>
      <h2 className="text-2xl">{question.prompt}</h2>
      <p className="mt-2 text-muted-foreground">Write one letter on plain paper and upload a clear PNG.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-lg">Reference</h3>
          <div className="relative grid aspect-video place-items-center rounded-lg bg-secondary font-heading text-7xl">
            {referenceFailed ? question.letter : <img src={apiUrl(`/ocr/reference?expected=${encodeURIComponent(question.letter)}`)}
              alt={`Reference glyph ${question.letter}`} onError={() => setReferenceFailed(true)}
              className="absolute inset-0 m-auto size-1/3 object-contain" />}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-lg">Your handwriting</h3>
          <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-secondary">
            {sample ? <img src={sample.url} alt="Your handwriting sample" className="absolute inset-0 size-full object-contain"
              onError={() => { setSample(undefined); setError('This PNG could not be opened.') }} />
              : <p className="p-4 text-center text-sm text-muted-foreground">Your sample will appear here.</p>}
          </div>
        </div>
      </div>
      <label className="mt-4 block text-sm font-bold">Upload PNG
        <input type="file" disabled={pending} accept="image/png,.png" className="mt-2 block max-w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            onReset()
            if (!/\.png$/i.test(file.name) && file.type !== 'image/png') {
              setSample(undefined)
              setError('Choose a PNG file.')
              return
            }
            setSample({ file, url: URL.createObjectURL(file) })
            setError('')
          }} />
      </label>
      <button type="button" className={`${button} mt-4`} disabled={!sample || pending} onClick={() => void review()}>
        {pending ? 'Reviewing…' : 'Review my handwriting'}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  )
}
