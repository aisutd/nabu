import type { sidebarItems } from './sidebar_items'

type Props = {
  item: typeof sidebarItems[number]
  active: boolean
  onNavigate: () => void
}

export default function SidebarItem({ item, active, onNavigate }: Props) {
  return (
    <a href={item.href} aria-current={active ? 'page' : undefined} onClick={onNavigate}
      className={`flex min-h-12 items-center rounded-lg px-4 py-3 font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${active
        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
        : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}>
      {item.label}
    </a>
  )
}
