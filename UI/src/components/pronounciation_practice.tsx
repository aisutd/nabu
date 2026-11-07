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
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5"><span className="font-heading text-2xl font-medium tracking-tight">nabu</span></header>
      <main className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-10 pb-[max(40px,env(safe-area-inset-bottom))]">
        <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <h1 className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">Speaking practice</h1>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:flex sm:flex-wrap">
            <label className="grid min-w-0 gap-2 text-sm">Activity
              <select value={mode} disabled={busy} onChange={(event) => setMode(event.target.value as Mode)} className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-input bg-card px-3 py-3 text-base sm:px-4 sm:text-sm">
                <option value="guided">With visual reference</option>
                <option value="independent">Try without watching</option>
                <option value="read-aloud">Say the word · microphone only</option>
                <option value="free">Free response · microphone only</option>
              </select>
            </label>
            {mode !== 'free' && <label className="grid min-w-0 gap-2 text-sm">Practice word
              <select value={word} disabled={busy} onChange={(event) => setWord(event.target.value)} className="min-h-12 w-full min-w-0 max-w-full rounded-lg border border-input bg-card px-3 py-3 text-base sm:px-4 sm:text-sm">
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
