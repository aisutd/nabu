import { useEffect, useState } from 'react'
import { getSpeakingExercise } from '../../api/speaking'
import type { PracticeWord } from '../../api/pronounciation'
import type { CaptureMode, SpeakingExercise, SpeakingResult } from '../../api/speaking'
import { listPracticeWords, mediaUrl } from '../../api/pronounciation'
import useSpeakingActivity from '../../hooks/use_speaking_activity'
import VideoRecorder from '../VideoRecorder'
import RecordingPreview from './recording_preview'
import SpeakingResults from './speaking_results'

export type SpeakingActivityProps = {
  exerciseId?: string
  expectedText?: string
  capture?: CaptureMode
  showReference?: boolean
  showExpectedText?: boolean
  showAnalysis?: boolean
  maxDurationMs?: number
  onComplete?: (result: SpeakingResult) => void
  onAttemptReset?: () => void
  onBusyChange?: (busy: boolean) => void
}

type SessionProps = SpeakingActivityProps & { referenceWord?: string | null }

function SpeakingSession({
  exerciseId, expectedText, capture = 'video', referenceWord,
  showReference = false, showExpectedText = true, showAnalysis = false, maxDurationMs, onComplete, onAttemptReset, onBusyChange,
}: SessionProps) {
  const activity = useSpeakingActivity({ exerciseId, expectedText, capture })
  const word = referenceWord ?? (expectedText?.trim().split(/\s+/).length === 1 ? expectedText.trim().toLowerCase() : null)
  const [reference, setReference] = useState<PracticeWord | null>(null)
  const [referenceError, setReferenceError] = useState('')
  useEffect(() => {
    if (!showReference || !word) return
    const controller = new AbortController()
    listPracticeWords(controller.signal).then((items) => {
      if (!controller.signal.aborted) setReference(items.find((item) => item.id === word) ?? null)
    }).catch(() => {
      if (!controller.signal.aborted) setReferenceError('Reference preview unavailable. You can still record an attempt.')
    })
    return () => controller.abort()
  }, [showReference, word])

  useEffect(() => {
    onBusyChange?.(activity.busy || activity.capturing)
    return () => onBusyChange?.(false)
  }, [activity.busy, activity.capturing, onBusyChange])

  const duration = maxDurationMs ?? (capture === 'video' && expectedText?.trim().split(/\s+/).length === 1 ? 4500 : 30000)

  function changeRecording(file: File | null) {
    activity.changeRecording(file)
    onAttemptReset?.()
  }

  function retry() {
    activity.retry()
    onAttemptReset?.()
  }

  async function review() {
    const result = await activity.review()
    if (result) onComplete?.(result)
  }

  return (
    <section aria-label="Speaking activity" className="min-w-0 [overflow-wrap:anywhere]">
      <h2 className="mb-5 text-2xl font-medium">{expectedText && showExpectedText ? `Say “${expectedText}”` : 'Your response'}</h2>
      {referenceError && <p className="mb-4 text-sm text-muted-foreground">{referenceError}</p>}
      <div className={`grid min-w-0 grid-cols-1 gap-4 md:gap-6 ${showReference && reference ? 'md:grid-cols-2' : ''}`}>
        {showReference && reference && (
          <section className="min-w-0 rounded-xl border bg-card p-4 shadow-card sm:p-5">
            <h3 className="mb-4 text-lg font-semibold">Watch the example</h3>
            <video key={word} controls playsInline preload="metadata" src={mediaUrl(reference.video_url)}
              className="aspect-video w-full rounded-xl bg-foreground object-contain" aria-label={`Reference for ${word}`} />
            <p className="mt-3 text-xs text-muted-foreground">{reference.has_audio ? 'Reference example' : 'Visual demo reference · no audio'}</p>
          </section>
        )}
        <section className="min-w-0 rounded-xl border bg-card p-4 shadow-card sm:p-5">
          <h3 className="mb-4 text-lg font-semibold">Your turn</h3>
          {activity.recording ? <RecordingPreview file={activity.recording} capture={capture} /> : (
            <VideoRecorder capture={capture} maxDurationMs={duration} disabled={activity.busy}
              onRecording={changeRecording} onRecordingChange={activity.setCapturing} />
          )}
          <p className="mt-3 text-xs text-muted-foreground">{expectedText ? 'Record the expected text.' : 'Speak freely; there is no fixed correct answer.'} Recording stops after {duration / 1000} seconds.</p>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-muted-foreground">Upload a recording instead</summary>
            <label className="mt-3 grid gap-2 text-sm">{capture === 'audio' ? 'Audio file' : 'Video file'}
              <input type="file" disabled={activity.busy || activity.capturing}
                accept={capture === 'audio' ? 'audio/*,.webm,.m4a,.mp4' : 'video/mp4,video/quicktime,video/webm,.m4v'}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  event.currentTarget.value = ''
                  changeRecording(file)
                }}
                className="min-h-11 w-full min-w-0 max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground" />
            </label>
          </details>
        </section>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" disabled={!activity.recording || activity.busy || activity.capturing} onClick={() => void review()}
          className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40">{activity.busy ? 'Reviewing…' : 'Review my attempt'}</button>
        {activity.recording && <button type="button" disabled={activity.busy} onClick={retry}
          className="rounded-lg border px-4 py-3 text-sm disabled:opacity-40">Record another attempt</button>}
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{activity.busy ? 'Processing your recording…' : activity.result ? 'Your review is ready.' : ''}</p>
      {activity.error && <p role="alert" className="mt-3 text-sm text-destructive">{activity.error}</p>}
      {activity.result && <SpeakingResults result={activity.result} showAnalysis={showAnalysis} onRetry={retry} />}
      {showAnalysis && !activity.result && <p className="mt-5 text-sm text-muted-foreground">Analysis results will appear after review.</p>}
      {activity.previous && <details className="mt-5"><summary className="cursor-pointer text-sm text-muted-foreground">Replay previous attempt</summary>
        <div className="mt-3 max-w-md"><RecordingPreview file={activity.previous} capture={capture} /></div>
      </details>}
    </section>
  )
}

function ExerciseActivity(props: SpeakingActivityProps & { exerciseId: string }) {
  const [exercise, setExercise] = useState<SpeakingExercise | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getSpeakingExercise(props.exerciseId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setExercise(result)
    }).catch((err) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Could not load this exercise.')
    })
    return () => controller.abort()
  }, [props.exerciseId])
  if (error) return <p role="alert" className="text-destructive">{error}</p>
  if (!exercise) return <p role="status">Loading speaking exercise…</p>
  return <SpeakingSession {...props} expectedText={exercise.expected_text} referenceWord={exercise.reference_word} capture={props.capture ?? exercise.capture} />
}

export default function SpeakingActivity(props: SpeakingActivityProps) {
  // A different task gets a fresh recording session; unmounting releases media tracks and aborts requests.
  const key = JSON.stringify([props.exerciseId, props.expectedText, props.capture, props.maxDurationMs])
  return props.exerciseId
    ? <ExerciseActivity key={key} {...props} exerciseId={props.exerciseId} />
    : <SpeakingSession key={key} {...props} />
}
