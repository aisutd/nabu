const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '')

export type Transcription = {
  heard: string
  expected: string
  match: boolean
}

export type NeuralResult =
  | {
      available: true
      checkpoint: string
      cosine_similarity: number
      embedding_dimension: number
      metric: string
      note: string
    }
  | {
      available: false
      reason: string
    }

export type Comparison = {
  user_ms: number
  example_ms: number
  shape_error: number[]
  user_features: number[][]
  example_features: number[][]
  png_url: string
  neural?: NeuralResult
  feedback: {
    stage: string
    shape_error: number
    notes: string[]
  }[]
}

export async function request<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options)

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const detail = body?.detail

    throw new Error(
      typeof detail === 'string'
        ? detail
        : `Request failed (${response.status})`,
    )
  }

  return response.json() as Promise<T>
}

export function mediaUrl(path: string) {
  return `${API_BASE}${path}`
}

export async function uploadVideo(file: File) {
  const form = new FormData()
  form.append('video', file)

  return request<{ id: string; video_url: string }>('/recordings', {
    method: 'POST',
    body: form,
  })
}

export function transcribeRecording(id: string, word: string) {
  const query = new URLSearchParams({ label: word })

  return request<Transcription>(
    `/recordings/${id}/transcription?${query}`,
    { method: 'POST' },
  )
}

export function compareRecordings(
  userId: string,
  exampleId: string,
  word: string,
) {
  const query = new URLSearchParams({
    user_id: userId,
    example_id: exampleId,
    label: word,
  })

  return request<Comparison>(`/comparisons?${query}`, {
    method: 'POST',
  })
}

export type PracticeWord = {
  id: string
  word: string
  has_audio: boolean
  video_url: string
}

export type LearnerFeedback = {
  title: string
  observations: string[]
  next_action: string
  neural_status: 'available' | 'unavailable'
  neural_note: string
}

export type Review = {
  transcription: Transcription | null
  comparison: Comparison | null
  feedback: LearnerFeedback
  errors: Partial<Record<'transcription' | 'comparison', string>>
}

export function listPracticeWords(signal: AbortSignal) {
  return request<PracticeWord[]>('/practice', { method: 'GET', signal })
}

export async function loadPracticeReference(lesson: PracticeWord, signal: AbortSignal) {
  const response = await fetch(mediaUrl(lesson.video_url), { signal })
  if (!response.ok) throw new Error('Could not load the reference clip.')
  return new File([await response.blob()], `${lesson.id}.mp4`, { type: 'video/mp4' })
}

export function reviewRecordings(userId: string, exampleId: string, word: string) {
  const query = new URLSearchParams({ user_id: userId, example_id: exampleId, label: word })
  return request<Review>(`/practice/review?${query}`, { method: 'POST' })
}
