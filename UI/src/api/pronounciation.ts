const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/$/, '')

export type Transcription = {
  heard: string
  expected: string
  match: boolean
}

export type Comparison = {
  user_ms: number
  example_ms: number
  shape_error: number[]
  user_features: number[][]
  example_features: number[][]
  png_url: string
  feedback: {
    stage: string
    shape_error: number
    notes: string[]
  }[]
}

async function request<T>(
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