import { useRef, useState } from 'react'
import { advanceProgress, emptyProgress, parseProgress, progressKey } from '../data/lesson_progress'
import type { Attempt, ProgressMap } from '../data/lesson_progress'
import type { Lesson } from '../data/lessons'

export default function useLessonProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => {
    try { return parseProgress(localStorage.getItem(progressKey)) } catch { return {} }
  })
  const current = useRef(progress)
  const [storageError, setStorageError] = useState(false)

  function update(lesson: Lesson, transform: (value: ReturnType<typeof emptyProgress>) => ReturnType<typeof emptyProgress>) {
    const next = { ...current.current, [lesson.id]: transform(current.current[lesson.id] ?? emptyProgress()) }
    current.current = next
    setProgress(next)
    try { localStorage.setItem(progressKey, JSON.stringify(next)); setStorageError(false) }
    catch { setStorageError(true) }
  }

  return {
    progress, storageError,
    record: (lesson: Lesson, attempt: Attempt) => update(lesson, (value) => ({ ...value, attempts: [...value.attempts, attempt] })),
    advance: (lesson: Lesson) => update(lesson, (value) => advanceProgress(value, lesson)),
    skip: (lesson: Lesson, attempt: Attempt) => update(lesson, (value) => advanceProgress({ ...value, attempts: [...value.attempts, attempt] }, lesson)),
    restart: (lesson: Lesson) => update(lesson, emptyProgress),
  }
}
export type LessonProgressStore = ReturnType<typeof useLessonProgress>
