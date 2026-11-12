import { useSyncExternalStore } from 'react'
import { lessons } from '../../data/lessons'
import useLessonProgress from '../../hooks/use_lesson_progress'
import LessonHub from '../../components/lessons/LessonHub'
import LessonRunner from '../../components/lessons/LessonRunner'
import LessonPreview from '../../components/lessons/LessonPreview'

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}
function getHash() { return window.location.hash }

export default function LessonPage() {
  const hash = useSyncExternalStore(subscribe, getHash)
  const store = useLessonProgress()
  const id = hash.startsWith('#/lesson/') ? hash.slice('#/lesson/'.length) : ''
  const lesson = lessons.find((item) => item.id === id)

  return <>
    {store.storageError && <p role="status" className="mb-5 rounded-lg bg-warning/20 p-4 text-sm">Browser storage is unavailable. You can keep learning, but this session’s progress may not survive a reload.</p>}
    {!id ? <LessonHub progress={store.progress} /> : !lesson ? (
      <section><h1 className="text-3xl">Lesson not found</h1><a href="#/lesson" className="mt-5 inline-block py-3 font-bold text-primary">Back to lessons</a></section>
    ) : lesson.status === 'coming-soon' ? <LessonPreview lesson={lesson} /> : <LessonRunner key={lesson.id} lesson={lesson} store={store} />}
  </>
}
