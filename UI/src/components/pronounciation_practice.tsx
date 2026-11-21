import { useEffect, useRef, useState } from 'react'
import { listPracticeWords } from '../api/pronounciation'
import type { PracticeWord } from '../api/pronounciation'
import { dayKey, practiceStreak, pronunciationProgressKey, readPracticeHistory } from '../data/pronunciation_progress'
import SpeakingActivity from './speaking/SpeakingActivity'

type Mode = 'guided' | 'independent' | 'read-aloud' | 'free'

const starterWords = [
  { id: 'bad', word: 'bad', ipa: '/bæd/', cue: 'Open your jaw for “aa” and finish with a soft D.' },
  { id: 'back', word: 'back', ipa: '/bæk/', cue: 'Keep the same vowel as “bad” and finish with a K sound.' },
  { id: 'bail', word: 'bail', ipa: '/beɪl/', cue: 'Glide through the vowel in “day,” then touch your tongue just behind your upper teeth for L.' },
  { id: 'june', word: 'June', ipa: '/dʒuːn/', cue: 'Round your lips for “oo,” then finish with your tongue behind your upper teeth.' },
  { id: 'kent', word: 'Kent', ipa: '/kɛnt/', cue: 'Use the vowel in “bed,” then move from N to T.' },
]

const playbackBars = [22, 42, 65, 38, 78, 100, 54, 74, 42, 62, 33, 18]

function ListenControls({ word }: { word: string }) {
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const currentSpeech = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => () => {
    if (currentSpeech.current) {
      currentSpeech.current = null
      window.speechSynthesis.cancel()
    }
  }, [])

  function listen() {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setError('Audio playback is unavailable in this browser.')
      return
    }
    const synth = window.speechSynthesis
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    utterance.rate = slow ? 0.65 : 1
    const voices = synth.getVoices().filter((voice) => voice.lang.toLowerCase() === 'en-us')
    utterance.voice = voices.find((voice) => voice.localService) ?? voices[0] ?? null
    function finish() {
      if (currentSpeech.current !== utterance) return false
      currentSpeech.current = null
      setPlaying(false)
      return true
    }
    utterance.onend = finish
    utterance.onerror = () => {
      if (finish()) setError('Could not play the word. Check that an English voice is available on this device.')
    }
    currentSpeech.current = utterance
    synth.cancel()
    setError('')
    setPlaying(true)
    synth.speak(utterance)
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={listen}
          className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90">
          <span aria-hidden="true" className="text-xs">▶</span>{playing ? 'Play again' : 'Listen'}
        </button>
        <button type="button" aria-pressed={slow} onClick={() => setSlow(!slow)}
          className="min-h-12 rounded-lg border bg-card px-4 text-sm font-bold text-secondary-foreground aria-pressed:border-primary aria-pressed:text-primary">
          Slow
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive" role="status">{error}</p>}
    </div>
  )
}

export default function PronunciationPractice() {
  const [references, setReferences] = useState<PracticeWord[]>([])
  const [referenceStatus, setReferenceStatus] = useState<'loading' | 'ready' | 'offline'>('loading')
  const [selected, setSelected] = useState(starterWords[0].id)
  const [mode, setMode] = useState<Mode>('guided')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState(readPracticeHistory)
  const [today, setToday] = useState(() => new Date())
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const free = mode === 'free'

  useEffect(() => {
    const controller = new AbortController()
    listPracticeWords(controller.signal).then((items) => {
      if (!controller.signal.aborted) {
        setReferences(items)
        setReferenceStatus('ready')
      }
    }).catch(() => {
      if (!controller.signal.aborted) setReferenceStatus('offline')
    })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    function refreshDay() {
      setToday(new Date())
    }
    function syncHistory(event: StorageEvent) {
      if (event.key === pronunciationProgressKey || event.key === null) setHistory(readPracticeHistory())
    }
    const timer = window.setInterval(refreshDay, 30_000)
    window.addEventListener('focus', refreshDay)
    window.addEventListener('storage', syncHistory)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshDay)
      window.removeEventListener('storage', syncHistory)
    }
  }, [])

  const words = [
    ...starterWords,
    ...references.filter((item) => !starterWords.some((word) => word.id === item.id))
      .map((item) => ({ id: item.id, word: item.word, ipa: '', cue: 'Listen to the word, then say it at a comfortable pace.' })),
  ]
  const active = words.find((word) => word.id === selected) ?? words[0]
  const reference = references.find((item) => item.id === active.id) ?? null
  const practiced = new Set(Object.values(history).flat())
  const practicedCount = words.filter((word) => practiced.has(word.id)).length
  const completedToday = Object.hasOwn(history, dayKey(today))
  const streak = practiceStreak(history, today)
  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(date.getDate() - (6 - index))
    return date
  })

  function markPractice() {
    const date = new Date()
    const key = dayKey(date)
    const latest = { ...history, ...readPracticeHistory() }
    const wordsToday = new Set(latest[key] ?? [])
    if (!free) wordsToday.add(active.id)
    const updated = { ...latest, [key]: [...wordsToday] }
    setToday(date)
    setHistory(updated)
    try {
      localStorage.setItem(pronunciationProgressKey, JSON.stringify(updated))
      setStorageUnavailable(false)
    } catch {
      setStorageUnavailable(true)
    }
  }

  const referencePlaceholder = referenceStatus === 'loading' ? 'Looking for a video example…'
    : referenceStatus === 'offline' ? 'The video is offline. You can still listen and record.'
    : 'No video example is installed for this word.'

  return (
    <div className="space-y-6 pb-10">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Pronunciation studio</h1>
        <p className="mt-2 text-muted-foreground">Listen to a word, record your take, and play it back.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2.3fr)_minmax(15rem,1fr)]">
        <section aria-label="Practice prompt" className="relative isolate flex min-h-56 flex-col justify-between gap-6 overflow-hidden rounded-xl border bg-secondary p-5 shadow-card sm:p-7">
          {!free && <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-1/3 items-center justify-center gap-1.5 text-primary/15 sm:flex">
            {playbackBars.map((height, index) => <span key={index} style={{ height: `${height * 0.9}px` }} className="w-1.5 rounded-full bg-current" />)}
          </div>}
          <div className="max-w-sm">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="font-heading text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">{free ? 'Free response' : active.word}</h2>
              {!free && active.ipa && <span aria-label="Phonetic spelling" className="text-lg font-semibold text-primary">{active.ipa}</span>}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{free ? 'Say whatever you like, then replay your recording.' : active.cue}</p>
          </div>
          {!free && <ListenControls key={active.id} word={active.word} />}
        </section>
        <aside aria-label="Practice streak" className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 shadow-card">
          <div>
            <h2 className="text-xl font-semibold">Daily streak</h2>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-heading text-5xl font-semibold leading-none text-primary">{streak}</span>
              <span className="font-bold text-muted-foreground">{streak === 1 ? 'day' : 'days'}</span>
            </div>
          </div>
          <ol aria-label="Last seven days" className="grid grid-cols-7 gap-1">
            {recentDays.map((date) => {
              const key = dayKey(date)
              const done = Object.hasOwn(history, key)
              const isToday = key === dayKey(today)
              const weekday = date.toLocaleDateString(undefined, { weekday: 'short' })
              return (
                <li key={key} aria-current={isToday ? 'date' : undefined} className="flex flex-col items-center gap-1">
                  <span className="text-[0.65rem] font-bold text-muted-foreground">{weekday.slice(0, 2)}</span>
                  <span className={`grid size-6 place-items-center rounded-full text-xs font-bold sm:size-7 ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${isToday ? 'ring-1 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                    <span aria-hidden="true">{done ? '✓' : '·'}</span>
                    <span className="sr-only">{weekday}, {date.toLocaleDateString()}, {done ? 'practiced' : 'no practice'}</span>
                  </span>
                </li>
              )
            })}
          </ol>
          <p role="status" className="text-xs text-muted-foreground">
            {storageUnavailable ? 'Progress could not be saved in this browser.'
              : completedToday ? 'Today’s practice is complete.' : 'Record a take to count today.'}
          </p>
        </aside>
      </div>
      <section aria-labelledby="practice-words-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="practice-words-heading" className="text-xl font-semibold">Practice words</h2>
            <p className="text-xs text-muted-foreground">{practicedCount} of {words.length} practiced</p>
          </div>
          <label className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold">Activity
            <select value={mode} disabled={busy} onChange={(event) => setMode(event.target.value as Mode)}
              className="min-h-11 max-w-full rounded-lg border bg-card px-3 text-sm font-semibold disabled:opacity-50">
              <option value="guided">With visual reference</option>
              <option value="independent">Try without watching</option>
              <option value="read-aloud">Microphone only</option>
              <option value="free">Free response</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Choose a practice word">
          {words.map((word) => {
            const done = practiced.has(word.id)
            return (
              <button key={word.id} type="button" aria-pressed={!free && active.id === word.id} disabled={busy}
                onClick={() => {
                  setSelected(word.id)
                  if (free) setMode('guided')
                }}
                className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border bg-card px-3 text-left font-heading text-xl font-medium shadow-card hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary disabled:opacity-50">
                {word.word}
                {done && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success/20 text-xs text-foreground"><span aria-hidden="true">✓</span><span className="sr-only">Practiced</span></span>}
              </button>
            )
          })}
        </div>
      </section>
      <SpeakingActivity
        key={`${mode}:${active.id}`}
        expectedText={free ? undefined : active.word}
        capture={mode === 'guided' || mode === 'independent' ? 'video' : 'audio'}
        showReference={mode === 'guided'}
        reference={reference}
        referencePlaceholder={referencePlaceholder}
        showHeading={false}
        showAnalysis
        prepareReview={mode === 'guided'}
        onRecordingSaved={markPractice}
        onBusyChange={setBusy}
      />
    </div>
  )
}
