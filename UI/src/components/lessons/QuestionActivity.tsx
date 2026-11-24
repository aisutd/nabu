import { useCallback, useState } from 'react'
import type { Question } from '../../data/lessons'
import { canContinueQuestion, handwritingPassScore } from '../../data/lesson_progress'
import type { Attempt } from '../../data/lesson_progress'
import type { SpeakingResult } from '../../api/speaking'
import SpeakingActivity from '../speaking/SpeakingActivity'
import LessonPicture from './LessonPicture'
import { HandwritingPractice, SigningPractice } from './LetterPractice'
import NabuFailAnimation from '../feedback/NabuFailAnimation'

const primary = 'min-h-12 rounded-lg bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40'
const secondary = 'min-h-11 rounded-lg border bg-card px-4 py-2 text-sm font-bold hover:bg-secondary disabled:opacity-40'
function resultMessage(question: Question, attempt: Attempt, passed: boolean) {
  switch (question.kind) {
    case 'signing':
      return passed ? `The recognizer matched ${question.letter}.` : `The recognizer saw ${attempt.answer}. Try ${question.letter} again.`
    case 'handwriting':
      return `${attempt.handwriting?.similarity ?? '—'}% shape similarity. ${passed ? 'Your writing meets the shape goal.' : `Try a new sample to reach ${handwritingPassScore}%.`}`
    case 'speaking':
      return passed ? `The recognizer heard “${question.word}”.`
        : attempt.speaking?.heard ? `The recognizer heard “${attempt.speaking.heard}”. Try saying “${question.word}” again.`
        : `The review couldn’t confirm “${question.word}”. Try a new recording.`
    case 'text':
      return passed ? question.explanation : question.retryHint
    default:
      return passed ? question.explanation : 'Try another answer to continue.'
  }
}

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
  const [written, setWritten] = useState(previous?.answer ?? '')
  const [attempt, setAttempt] = useState<Attempt | null>(previous ?? null)
  const [busy, setBusy] = useState(false)
  const [failPlay, setFailPlay] = useState<number | null>(null)
  const knowledgeQuestion = question.kind === 'choice' || question.kind === 'sentence' || question.kind === 'text'
  const checked = knowledgeQuestion && attempt !== null && !attempt.skipped
  const ready = canContinueQuestion(question, attempt)

  const reportBusy = useCallback((value: boolean) => {
    setBusy(value)
    onBusyChange(value)
  }, [onBusyChange])

  function makeAttempt(answerIds: string[], answer: string, correct: boolean | null, skipped = false): Attempt {
    return { questionId: question.id, answerIds, answer, correct, skipped, createdAt: new Date().toISOString() }
  }

  function checkAnswer() {
    if (checked) return
    let next: Attempt
    if (question.kind === 'text') {
      const answer = written.toLowerCase().replace(/[‘’]/g, "'").replace(/[.,!?]/g, ' ').trim().replace(/\s+/g, ' ')
      const response = answer.replace(/^(hello|hi|hey|good morning) /, '')
      next = makeAttempt([], written.trim(), question.answers.some((accepted) => accepted.toLowerCase() === response))
    } else if (question.kind === 'choice' || question.kind === 'sentence') {
      const correct = question.kind === 'choice' ? selected[0] === question.answer : selected.join('|') === question.order.join('|')
      const options = question.kind === 'choice' ? question.options : question.tokens
      const text = selected.map((id) => options.find((option) => option.id === id)?.text ?? '').join(' ').replace(/\s+([.,!?])/g, '$1')
      next = makeAttempt(selected, text, correct)
    } else {
      return
    }
    setAttempt(next)
    onAttempt(next)
    if (!next.correct) setFailPlay(Date.now())
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

  function checkSign(letter: string) {
    if (question.kind !== 'signing') return
    const next = makeAttempt([], letter, letter === question.letter)
    setAttempt(next)
    onAttempt(next)
    if (!next.correct) setFailPlay(Date.now())
  }

  function reviewHandwriting(similarity: number) {
    if (question.kind !== 'handwriting') return
    const next = { ...makeAttempt([], question.letter, null), handwriting: { similarity } }
    setAttempt(next)
    onAttempt(next)
    if (!canContinueQuestion(question, next)) setFailPlay(Date.now())
  }

  const showFeedback = attempt && !attempt.skipped && !busy
  const handwriting = question.kind === 'handwriting'
  const unconfirmedSpeech = question.kind === 'speaking' && !attempt?.speaking?.heard && attempt?.speaking?.match !== false
  const feedbackTitle = ready ? (handwriting ? 'Shape goal met!' : 'Correct!')
    : handwriting ? 'Try writing it again' : unconfirmedSpeech ? 'Try another recording' : 'Not quite'
  const continueHint = question.kind === 'speaking' ? `The recognized speech must match “${question.word}” to enable Continue.`
    : question.kind === 'signing' ? `Check a recognized ${question.letter} to continue.`
    : `Reach ${handwritingPassScore}% shape similarity to continue.`

  return (
    <div>
      {failPlay !== null && <NabuFailAnimation key={failPlay} onDone={() => setFailPlay(null)} />}
      {question.kind === 'speaking' ? (
        <>
          <p className="mb-5 text-muted-foreground">{question.prompt}</p>
          <SpeakingActivity exerciseId={question.exerciseId} showReference={question.showReference}
            onComplete={speakingComplete} onAttemptReset={() => setAttempt(null)} onBusyChange={reportBusy} />
        </>
      ) : question.kind === 'signing' ? (
        <SigningPractice question={question} onCheck={checkSign} />
      ) : question.kind === 'handwriting' ? (
        <HandwritingPractice question={question} onReview={reviewHandwriting} onReset={() => setAttempt(null)} onBusyChange={reportBusy} />
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
          ) : question.kind === 'text' ? (
            <label className="mt-6 block font-bold">
              Your reply
              <input type="text" value={written} onChange={(event) => setWritten(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing && written.trim()) checkAnswer()
                }}
                disabled={checked} maxLength={200}
                className="mt-2 block min-h-12 w-full rounded-lg border border-input bg-background px-4 py-2 font-normal" />
            </label>
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
        </section>
      )}
      {showFeedback && <div role="status" className={`mt-6 flex items-start gap-4 rounded-xl border p-5 shadow-card ${ready ? 'border-success bg-success/15' : 'border-warning bg-warning/15'}`}>
        <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full text-xl font-extrabold ${ready ? 'bg-success/25' : 'bg-warning/30'}`}>{ready ? '✓' : '!'}</span>
        <div>
          <p className="font-heading text-2xl font-semibold leading-tight">{feedbackTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{resultMessage(question, attempt, ready)}</p>
        </div>
      </div>}
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {!knowledgeQuestion ? (
          <div>
            <button type="button" disabled={busy} onClick={() => onSkip(makeAttempt([], '', null, true))} className="min-h-11 px-2 text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-40">Skip this question</button>
            {!ready && !showFeedback && <p className="text-xs text-muted-foreground">{continueHint}</p>}
          </div>
        ) : !ready && (checked
          ? <button type="button" onClick={() => { setAttempt(null); setSelected([]) }} className={secondary}>Try again</button>
          : <button type="button" onClick={checkAnswer} disabled={question.kind === 'text' ? !written.trim() : selected.length === 0 || (question.kind === 'sentence' && selected.length !== question.tokens.length)} className={primary}>Check answer</button>)}
        <button type="button" disabled={busy || !ready} onClick={onAdvance} className={`ml-auto ${primary}`}>Continue →</button>
      </footer>
    </div>
  )
}
