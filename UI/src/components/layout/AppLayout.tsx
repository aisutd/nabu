import { useState } from 'react'
import type { ReactNode } from 'react'
import nabuLogo from '../../assets/NABU_Logo.png'
import Sidebar from '../sidebar/Sidebar'
import GreetingStrip from '../home/GreetingStrip'
import useLearnerPreferences from '../../hooks/use_learner_preferences'
import type { PageId } from '../sidebar/sidebar_items'

type Props = { currentPage: PageId; children: ReactNode }

export default function AppLayout({ currentPage, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { largerText, reducedMotion } = useLearnerPreferences()
  const isLearn = currentPage === 'home'
  const respectsPreferences = isLearn || currentPage === 'lesson' || currentPage === 'profile' || currentPage === 'settings'
  const preferenceClasses = `${respectsPreferences && largerText ? ' learner-larger-text' : ''}${respectsPreferences && reducedMotion ? ' learner-reduced-motion' : ''}`
  const contentPadding = 'px-4 py-8 sm:px-6 md:p-10'
  return (
    <div className={`min-h-dvh bg-background text-foreground md:flex ${isLearn ? 'flex flex-col md:flex-row' : ''}`}>
      <a href="#page-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">Skip to content</a>
      <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
        <a href="#/home" onClick={() => setMenuOpen(false)} className="rounded-lg">
          <img src={nabuLogo} alt="Nabu home" width={132} height={44} />
        </a>
        <button type="button" aria-expanded={menuOpen} aria-controls="app-sidebar" onClick={() => setMenuOpen(!menuOpen)}
          className="min-h-11 rounded-lg border px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>
      </header>
      <Sidebar currentPage={currentPage} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main id="page-content" tabIndex={-1} className={`min-w-0 flex-1 [overflow-wrap:anywhere] ${isLearn ? 'flex flex-col' : contentPadding}`}>
        <div className={`mx-auto ${isLearn ? `w-full ${contentPadding}` : currentPage === 'handwriting' ? 'max-w-7xl' : 'max-w-5xl'}${preferenceClasses}`}>
          {isLearn ? <div className="mx-auto max-w-5xl">{children}</div> : children}
        </div>
        {isLearn && <GreetingStrip className={preferenceClasses} />}
      </main>
    </div>
  )
}
