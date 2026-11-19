export const sidebarItems = [
  { id: 'home', label: 'Learn', href: '#/home' },
  { id: 'lesson', label: 'Lessons', href: '#/lesson' },
  { id: 'asl', label: 'ASL', href: '#/asl' },
  { id: 'handwriting', label: 'Handwriting', href: '#/handwriting' },
  { id: 'pronunciation', label: 'Pronunciation', href: '#/pronunciation' },
  { id: 'profile', label: 'Profile', href: '#/profile' },
] as const

export type PageId = typeof sidebarItems[number]['id'] | 'settings'
