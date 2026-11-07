import { useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from '../sidebar/Sidebar'
import type { PageId } from '../sidebar/sidebar_items'

type Props = { currentPage: PageId; children: ReactNode }

export default function AppLayout({ currentPage, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="min-h-dvh bg-background text-foreground md:flex">
      <a href="#page-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3">Skip to content</a>
      <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
        <a href="#/home" onClick={() => setMenuOpen(false)} className="font-heading text-2xl">nabu</a>
        <button type="button" aria-expanded={menuOpen} aria-controls="app-sidebar" onClick={() => setMenuOpen(!menuOpen)}
          className="min-h-11 rounded-lg border px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>
      </header>
      <Sidebar currentPage={currentPage} open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <main id="page-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 [overflow-wrap:anywhere] sm:px-6 md:p-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
