import { request } from './pronounciation'
import type { Comparison, LearnerFeedback } from './pronounciation'

export type CaptureMode = 'audio' | 'video'
export type SpeakingResult = {
  recording_id: string
  exercise_id: string | null
  expected_text: string | null
  transcription: { heard: string; expected: string | null; match: boolean | null } | null
  comparison: Comparison | null
  feedback: LearnerFeedback
  checks: Record<'speech' | 'mouth' | 'neural', {
    status: 'complete' | 'skipped' | 'failed'
    reason?: string
  }>
  errors: Record<string, string>
}

export type SpeakingExercise = {
  id: string
  expected_text: string
  capture: CaptureMode
  reference_word: string | null
}

export function getSpeakingExercise(id: string, signal: AbortSignal) {
  return request<SpeakingExercise>(`/speaking/exercises/${encodeURIComponent(id)}`, { method: 'GET', signal })
}

export async function submitSpeakingAttempt(
  file: File,
  capture: CaptureMode,
  config: { exerciseId?: string; expectedText?: string },
  signal: AbortSignal,
) {
  const form = new FormData()
  form.append('media', file)
  form.append('capture', capture)
  const uploaded = await request<{ id: string }>('/speaking/recordings', { method: 'POST', body: form, signal })
  return request<SpeakingResult>('/speaking/review', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recording_id: uploaded.id, exercise_id: config.exerciseId, expected_text: config.expectedText }),
  })
}
