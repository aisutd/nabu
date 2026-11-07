import { useEffect, useState } from 'react'
import AppLayout from './components/layout/AppLayout'
import { sidebarItems } from './components/sidebar/sidebar_items'
import type { PageId } from './components/sidebar/sidebar_items'
import HomePage from './pages/home/HomePage'
import LessonPage from './pages/lesson/LessonPage'
import PronunciationPage from './pages/pronunciation/PronunciationPage'
import ASLPage from './pages/asl/ASLPage'
import HandwritingPage from './pages/handwriting/HandwritingPage'
import ProfilePage from './pages/profile/ProfilePage'
import SettingsPage from './pages/settings/SettingsPage'

function currentPage(): PageId {
  const path = window.location.hash.slice(1)
  return sidebarItems.find((item) => item.href.slice(1) === path)?.id ?? 'home'
}

const pages = {
  home: HomePage,
  lesson: LessonPage,
  pronunciation: PronunciationPage,
  asl: ASLPage,
  handwriting: HandwritingPage,
  profile: ProfilePage,
  settings: SettingsPage,
}

export default function App() {
  const [page, setPage] = useState<PageId>(currentPage)
  useEffect(() => {
    const navigate = () => { setPage(currentPage()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => {
    document.title = `Nabu · ${sidebarItems.find((item) => item.id === page)?.label ?? 'Learn'}`
  }, [page])
  const Page = pages[page]
  return <AppLayout currentPage={page}><Page /></AppLayout>
}
