import SidebarItem from './SidebarItem'
import { sidebarItems } from './sidebar_items'
import type { PageId } from './sidebar_items'

type Props = { currentPage: PageId; open: boolean; onNavigate: () => void }

export default function Sidebar({ currentPage, open, onNavigate }: Props) {
  return (
    <aside id="app-sidebar" className={`${open ? 'block' : 'hidden'} border-b border-sidebar-border bg-sidebar p-4 md:sticky md:top-0 md:block md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0 md:p-6`}>
      <a href="#/home" onClick={onNavigate} className="mb-8 hidden font-heading text-3xl text-sidebar-foreground md:block">nabu</a>
      <nav aria-label="Main navigation" className="grid gap-2">
        {sidebarItems.map((item) => <SidebarItem key={item.id} item={item} active={currentPage === item.id} onNavigate={onNavigate} />)}
      </nav>
    </aside>
  )
}
