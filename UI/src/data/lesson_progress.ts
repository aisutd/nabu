import { lessons } from './lessons'
import type { Lesson } from './lessons'
import type { SpeakingResult } from '../api/speaking'
import type { NeuralResult } from '../api/pronounciation'

export type Attempt = {
  questionId: string
  answerIds: string[]
  answer: string
  correct: boolean | null
  skipped: boolean
  createdAt: string
  speaking?: {
    recordingId: string
    heard: string | null
    expected: string | null
    match: boolean | null
    hasResult: boolean
    checks: SpeakingResult['checks']
    neural?: NeuralResult
  }
}
export type LessonProgress = { cursor: number; completed: boolean; attempts: Attempt[] }
export type ProgressMap = Record<string, LessonProgress>
export const progressKey = 'nabu.english-lessons.v1'
export const emptyProgress = (): LessonProgress => ({ cursor: 0, completed: false, attempts: [] })

export function parseProgress(raw: string | null): ProgressMap {
  try {
    const value: unknown = JSON.parse(raw ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    const output: ProgressMap = {}
    for (const lesson of lessons.filter((item) => item.status === 'ready')) {
      const item = (value as Record<string, unknown>)[lesson.id] as LessonProgress | undefined
      if (!item || !Number.isInteger(item.cursor) || item.cursor < 0 || item.cursor > lesson.questions.length || typeof item.completed !== 'boolean' || !Array.isArray(item.attempts)) continue
      if (item.completed !== (item.cursor === lesson.questions.length)) continue
      const attempts = item.attempts.filter((attempt) => attempt && lesson.questions.some((question) => question.id === attempt.questionId) && Array.isArray(attempt.answerIds) && attempt.answerIds.every((id) => typeof id === 'string') && typeof attempt.answer === 'string' && (attempt.correct === null || typeof attempt.correct === 'boolean') && typeof attempt.skipped === 'boolean' && typeof attempt.createdAt === 'string')
      output[lesson.id] = { cursor: item.cursor, completed: item.completed, attempts }
    }
    return output
  } catch { return {} }
}

export function advanceProgress(progress: LessonProgress, lesson: Lesson): LessonProgress {
  const cursor = Math.min(progress.cursor + 1, lesson.questions.length)
  return { ...progress, cursor, completed: cursor === lesson.questions.length }
}

export function lessonSummary(progress: LessonProgress, lesson: Lesson) {
  const latest = lesson.questions.map((question) => progress.attempts.filter((attempt) => attempt.questionId === question.id).at(-1))
  return {
    attempts: progress.attempts.filter((attempt) => !attempt.skipped).length,
    reviewed: latest.filter((attempt) => attempt && !attempt.skipped).length,
    skipped: latest.filter((attempt) => attempt?.skipped).length,
  }
}
