export const pronunciationProgressKey = 'nabu.pronunciation.practice.v1'

export type PracticeHistory = Record<string, string[]>

export function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function readPracticeHistory(): PracticeHistory {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(pronunciationProgressKey) ?? '{}')
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}
    return Object.fromEntries(Object.entries(saved).filter(([date, words]) =>
      /^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(words) && words.every((word) => typeof word === 'string'),
    ))
  } catch {
    return {}
  }
}

export function practiceStreak(history: PracticeHistory, today: Date) {
  const date = new Date(today)
  // Yesterday's streak stays active until the end of today.
  if (!Object.hasOwn(history, dayKey(date))) date.setDate(date.getDate() - 1)
  let days = 0
  while (Object.hasOwn(history, dayKey(date))) {
    days += 1
    date.setDate(date.getDate() - 1)
  }
  return days
}
