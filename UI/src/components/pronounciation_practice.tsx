import { useEffect, useState } from 'react'
import { listPracticeWords } from '../api/pronounciation'
import type { PracticeWord } from '../api/pronounciation'
import SpeakingActivity from './speaking/SpeakingActivity'

type Mode = 'guided' | 'independent' | 'read-aloud' | 'free'

export default function PronunciationPractice() {
  const [lessons, setLessons] = useState<PracticeWord[]>([])
  const [word, setWord] = useState('')
  const [mode, setMode] = useState<Mode>('guided')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listPracticeWords(controller.signal).then((items) => {
      if (!controller.signal.aborted) setLessons(items)
    }).catch(() => {
      if (!controller.signal.aborted) setError('Could not load practice words. Check the backend and reload.')
    })
    return () => controller.abort()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-6xl px-5 py-5"><span className="font-heading text-2xl font-medium tracking-tight">nabu</span></header>
      <main className="mx-auto max-w-6xl px-5 pt-10 pb-[max(40px,env(safe-area-inset-bottom))]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <h1 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Speaking practice</h1>
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-2 text-sm">Activity
              <select value={mode} disabled={busy} onChange={(event) => setMode(event.target.value as Mode)} className="rounded-lg border border-input bg-card px-4 py-3">
                <option value="guided">With visual reference</option>
                <option value="independent">Try without watching</option>
                <option value="read-aloud">Say the word · microphone only</option>
                <option value="free">Free response · microphone only</option>
              </select>
            </label>
            {mode !== 'free' && <label className="grid gap-2 text-sm">Practice word
              <select value={word} disabled={busy} onChange={(event) => setWord(event.target.value)} className="rounded-lg border border-input bg-card px-4 py-3">
                <option value="">Select a word</option>
                {lessons.map((lesson) => <option key={lesson.id} value={lesson.word}>{lesson.word}</option>)}
              </select>
            </label>}
          </div>
        </div>
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        {mode === 'free' || word ? (
          <SpeakingActivity
            key={`${mode}:${word}`}
            expectedText={mode === 'free' ? undefined : word}
            capture={mode === 'guided' || mode === 'independent' ? 'video' : 'audio'}
            showReference={mode === 'guided'}
            showAnalysis
            onBusyChange={setBusy}
          />
        ) : <p className="text-sm text-muted-foreground">Choose a word to start.</p>}
      </main>
    </div>
  )
}
