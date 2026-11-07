export const sidebarItems = [
  { id: 'home', label: 'Learn', href: '#/home' },
  { id: 'lesson', label: 'Lesson', href: '#/lesson' },
  { id: 'asl', label: 'ASL', href: '#/asl' },
  { id: 'pronunciation', label: 'Pronunciation', href: '#/pronunciation' },
  { id: 'settings', label: 'Settings', href: '#/settings' },
  { id: 'profile', label: 'Profile', href: '#/profile' },
  { id: 'handwriting', label: 'Handwriting', href: '#/handwriting' },
] as const

export type PageId = typeof sidebarItems[number]['id']
