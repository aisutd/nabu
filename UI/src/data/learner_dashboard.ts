import { lessons } from './lessons'
import type { ProgressMap } from './lesson_progress'
import { dayKey, practiceStreak, readPracticeHistory } from './pronunciation_progress'

export const availableLessons = lessons.filter((lesson) => lesson.status === 'ready')

export function lessonHref(id: string) {
  return `#/lesson/${id}`
}

export function learningDashboard(progress: ProgressMap, today = new Date()) {
  const recordedWords = readPracticeHistory()
  const practicedWords = new Set(Object.values(recordedWords).flat())
  const activity: Record<string, number> = Object.fromEntries(
    Object.entries(recordedWords).map(([day, words]) => [day, Math.max(words.length, 1)]),
  )
  const completed = availableLessons.filter(({ id }) => progress[id]?.completed)
  const next = availableLessons.find(({ id }) => progress[id] && !progress[id].completed)
    ?? availableLessons.find(({ id }) => !progress[id]?.completed)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7)
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return date
  })
  const firstDay = dayKey(weekStart)
  const currentDay = dayKey(today)
  let completedThisWeek = 0
  for (const [id, state] of Object.entries(progress)) {
    const lesson = availableLessons.find((item) => item.id === id)
    const counted = new Set<string>()
    for (const attempt of state.attempts) {
      const date = new Date(attempt.createdAt)
      if (attempt.skipped || !Number.isFinite(date.getTime())) continue
      const day = dayKey(date)
      const key = `${day}:${attempt.questionId}`
      if (counted.has(key)) continue
      counted.add(key)
      activity[day] = (activity[day] ?? 0) + 1
      const question = lesson?.questions.find((item) => item.id === attempt.questionId)
      if (question?.kind === 'speaking') practicedWords.add(question.word.toLowerCase())
    }
    const lastAttempt = state.attempts.at(-1)
    if (completed.some((lesson) => lesson.id === id) && lastAttempt) {
      const day = dayKey(new Date(lastAttempt.createdAt))
      if (day >= firstDay && day <= currentDay) completedThisWeek += 1
    }
  }
  const activeDays = Object.fromEntries(Object.keys(activity).map((day) => [day, []]))
  return {
    today: currentDay, activity, practicedWords, completed, next, week, completedThisWeek,
    streak: practiceStreak(activeDays, today),
    weekDays: week.filter((date) => dayKey(date) <= currentDay && activity[dayKey(date)]).length,
  }
}
