type Props = { picture: 'apple' | 'back' | 'calendar' }

export default function LessonPicture({ picture }: Props) {
  const labels = { apple: 'An apple with brown spots and a wilted leaf', back: 'A person viewed from behind', calendar: 'A calendar page marked with the number six' }
  return (
    <div className="mb-6 flex justify-center rounded-xl bg-secondary p-5">
      <svg viewBox="0 0 240 160" role="img" aria-label={labels[picture]} className="h-40 w-60 max-w-full text-foreground">
        {picture === 'apple' && <>
          <path d="M120 52c-58-35-91 26-59 70 18 26 38 23 59 18 22 5 42 8 60-18 32-44-1-105-60-70Z" className="fill-primary/70 stroke-foreground" strokeWidth="3" />
          <path d="M120 53c-3-16 4-26 10-32" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <path d="M123 36c10-17 28-13 35-9-8 15-23 18-35 9Z" className="fill-success/60 stroke-foreground" strokeWidth="2" />
          <ellipse cx="91" cy="85" rx="15" ry="11" className="fill-secondary-foreground/70" /><ellipse cx="140" cy="115" rx="12" ry="15" className="fill-secondary-foreground/70" />
        </>}
        {picture === 'back' && <>
          <path d="M100 66v15h40V66" className="fill-accent stroke-foreground" strokeWidth="3" />
          <circle cx="120" cy="43" r="27" className="fill-secondary-foreground" />
          <path d="M101 79c-22 0-41 15-44 37l-4 29h134l-4-29c-3-22-22-37-44-37" className="fill-info/30 stroke-foreground" strokeWidth="3" />
          <path d="M120 84v53M82 108l-4 36m80-36 4 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>}
        {picture === 'calendar' && <>
          <rect x="48" y="23" width="144" height="122" rx="12" className="fill-card stroke-foreground" strokeWidth="3" />
          <path d="M49 56h142V35c0-7-5-12-12-12H61c-7 0-12 5-12 12Z" className="fill-primary" />
          <path d="M82 15v19m76-19v19" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <text x="120" y="119" textAnchor="middle" className="fill-foreground font-heading text-6xl">6</text>
        </>}
      </svg>
    </div>
  )
}
