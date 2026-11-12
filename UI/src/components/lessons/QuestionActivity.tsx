import { useCallback, useState } from 'react'
import type { Question } from '../../data/lessons'
import type { Attempt } from '../../data/lesson_progress'
import type { SpeakingResult } from '../../api/speaking'
import SpeakingActivity from '../speaking/SpeakingActivity'
import LessonPicture from './LessonPicture'

const primary = 'min-h-12 rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40'
const secondary = 'min-h-11 rounded-lg border bg-card px-4 py-2 text-sm font-bold hover:bg-secondary disabled:opacity-40'

type Props = {
  question: Question
  previous?: Attempt
  onAttempt: (attempt: Attempt) => void
  onAdvance: () => void
  onSkip: (attempt: Attempt) => void
  onBusyChange: (busy: boolean) => void
}

export default function QuestionActivity({ question, previous, onAttempt, onAdvance, onSkip, onBusyChange }: Props) {
  const [selected, setSelected] = useState<string[]>(previous?.answerIds ?? [])
  const [attempt, setAttempt] = useState<Attempt | null>(previous ?? null)
  const [busy, setBusy] = useState(false)
  const checked = question.kind !== 'speaking' && attempt !== null && !attempt.skipped
  const ready = question.kind === 'speaking' ? attempt?.speaking?.hasResult === true : attempt?.correct === true

  const reportBusy = useCallback((value: boolean) => {
    setBusy(value)
    onBusyChange(value)
  }, [onBusyChange])

  function makeAttempt(answerIds: string[], answer: string, correct: boolean | null, skipped = false): Attempt {
    return { questionId: question.id, answerIds, answer, correct, skipped, createdAt: new Date().toISOString() }
  }

  function checkAnswer() {
    if (question.kind === 'speaking' || checked) return
    const correct = question.kind === 'choice' ? selected[0] === question.answer : selected.join('|') === question.order.join('|')
    const options = question.kind === 'choice' ? question.options : question.tokens
    const text = selected.map((id) => options.find((option) => option.id === id)?.text ?? '').join(' ').replace(/\s+([.,!?])/g, '$1')
    const next = makeAttempt(selected, text, correct)
    setAttempt(next)
    onAttempt(next)
  }

  function speakingComplete(result: SpeakingResult) {
    const next = makeAttempt([], result.transcription?.heard ?? '', null)
    next.speaking = {
      recordingId: result.recording_id, heard: result.transcription?.heard ?? null,
      expected: result.expected_text, match: result.transcription?.match ?? null,
      hasResult: Boolean(result.transcription || result.comparison),
      checks: result.checks, neural: result.comparison?.neural,
    }
    setAttempt(next)
    onAttempt(next)
  }

  return (
    <div>
      {question.kind === 'speaking' ? (
        <>
          <p className="mb-5 text-muted-foreground">{question.prompt}</p>
          <SpeakingActivity exerciseId={question.exerciseId} capture="video" showReference={question.showReference}
            onComplete={speakingComplete} onAttemptReset={() => setAttempt(null)} onBusyChange={reportBusy} />
          {previous?.speaking?.hasResult && !busy && attempt === previous && <p className="mt-4 text-sm text-muted-foreground">A reviewed attempt is saved for this question. Continue or record a new one.</p>}
        </>
      ) : (
        <section className="rounded-xl border bg-card p-5 shadow-card sm:p-8">
          {question.kind === 'choice' && question.picture && <LessonPicture picture={question.picture} />}
          <h2 className="text-2xl">{question.prompt}</h2>
          {question.kind === 'choice' && question.context && <p className="mt-4 rounded-lg bg-secondary p-4 text-lg">{question.context}</p>}
          {question.kind === 'choice' ? (
            <fieldset disabled={checked} className="mt-6 space-y-3">
              <legend className="sr-only">Choose one answer</legend>
              {question.options.map((option) => <label key={option.id} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-4 ${selected[0] === option.id ? 'border-primary bg-primary/10' : 'bg-card hover:bg-secondary'}`}>
                <input type="radio" name={question.id} value={option.id} checked={selected[0] === option.id} onChange={() => setSelected([option.id])} className="size-4 accent-primary" />
                <span>{option.text}</span>
              </label>)}
            </fieldset>
          ) : (
            <div className="mt-6">
              <div aria-label="Your sentence" className="flex min-h-20 flex-wrap items-center gap-2 rounded-lg border border-dashed bg-secondary p-4">
                {selected.length === 0 && <p className="text-sm text-muted-foreground">Choose tiles below. Tap a chosen tile to remove it.</p>}
                {selected.map((id, index) => <button key={id} type="button" disabled={checked} onClick={() => setSelected(selected.filter((_, position) => position !== index))} aria-label={`Remove ${question.tokens.find((token) => token.id === id)?.text}`} className={secondary}>{question.tokens.find((token) => token.id === id)?.text}</button>)}
              </div>
              <div aria-label="Available words" className="mt-4 flex flex-wrap gap-2">{question.tokens.map((token) => <button key={token.id} type="button" disabled={checked || selected.includes(token.id)} onClick={() => setSelected([...selected, token.id])} aria-label={`Add ${token.text}`} className={secondary}>{token.text}</button>)}</div>
              <button type="button" disabled={checked || selected.length === 0} onClick={() => setSelected([])} className="mt-4 min-h-11 text-sm font-bold text-muted-foreground disabled:opacity-40">Clear sentence</button>
            </div>
          )}
          {checked && attempt && <div role="status" className={`mt-5 rounded-lg p-4 ${attempt.correct ? 'bg-success/15' : 'bg-warning/20'}`}>
            <p className="font-bold">{attempt.correct ? 'That’s right.' : 'Not quite. Try another answer.'}</p>
            <p className="mt-2 text-sm">{attempt.correct ? question.explanation : 'You can try again before continuing.'}</p>
          </div>}
        </section>
      )}
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {question.kind === 'speaking' ? <button type="button" disabled={busy} onClick={() => onSkip(makeAttempt([], '', null, true))} className="min-h-11 px-2 text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-40">Skip this question</button> : <span className="text-xs text-muted-foreground">Take your time. Retries are welcome.</span>}
        {ready ? <button type="button" disabled={busy} onClick={onAdvance} className={primary}>Continue →</button>
          : question.kind === 'speaking' ? <span className="text-xs text-muted-foreground">Review an attempt to continue, or choose skip.</span>
          : checked ? <button type="button" onClick={() => { setAttempt(null); setSelected([]) }} className={primary}>Try again</button>
          : <button type="button" onClick={checkAnswer} disabled={selected.length === 0 || (question.kind === 'sentence' && selected.length !== question.tokens.length)} className={primary}>Check answer</button>}
      </footer>
    </div>
  )
}
