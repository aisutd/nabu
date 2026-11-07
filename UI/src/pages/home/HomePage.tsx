import GreetingStrip from '../../components/home/GreetingStrip'

const practices = [
  { title: 'Say it out loud', label: 'Pronunciation', href: '#/pronunciation', symbol: 'Aa', description: 'Watch an example, record your voice, and review your attempt.', accent: 'bg-primary/10 text-primary' },
  { title: 'Make your mark', label: 'Handwriting', href: '#/handwriting', symbol: 'あ', description: 'Make space for new letters, new scripts, and a little practice.', accent: 'bg-info/10 text-info' },
  { title: 'A new way to say hello', label: 'ASL', href: '#/asl', symbol: '✦', description: 'Explore a language of movement, expression, and connection.', accent: 'bg-success/10 text-success' },
]

export default function HomePage() {
  return (
    <div className="min-w-0 space-y-8 sm:space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted-foreground">A little practice. A world of possibility.</p>
        <a href="#/profile" className="rounded-full border bg-card px-4 py-2 text-sm font-bold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2">Your profile ↗</a>
      </header>

      <section aria-labelledby="welcome-heading" className="grid items-center gap-8 rounded-xl border bg-card p-6 shadow-card sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:p-10">
        <div>
          <p className="mb-4 text-xs font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Welcome to your learning space</p>
          <h1 id="welcome-heading" className="text-4xl leading-[1.1] font-semibold sm:text-5xl">Small steps.<br /><span className="text-primary">Real conversations.</span></h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">A word spoken. A letter written. A new way to connect. Choose where you’d like to begin today.</p>
          <a href="#/lesson" className="mt-7 inline-flex min-h-12 items-center justify-center gap-6 rounded-lg bg-primary px-6 py-3 font-extrabold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4">Explore lessons <span aria-hidden="true">→</span></a>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">Your pace. Your next step.</p>
        </div>
        <div className="relative rounded-xl bg-background p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3"><span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-card text-xl">✦</span><p className="font-heading text-lg">Every conversation starts here.</p></div>
          <p className="w-fit rounded-xl rounded-bl-sm border bg-card px-5 py-3 font-heading text-3xl" lang="es">¡Hola!</p>
          <p className="mt-4 ml-auto w-fit rounded-xl rounded-br-sm bg-primary px-5 py-3 font-heading text-3xl text-primary-foreground" lang="fr">Bonjour !</p>
          <p className="mt-4 w-fit rounded-xl rounded-bl-sm border bg-card px-5 py-3 font-heading text-3xl" lang="ja">こんにちは</p>
          <p className="mt-6 text-center text-xs font-bold text-muted-foreground">Different words. The same connection.</p>
        </div>
      </section>

      <GreetingStrip />

      <section aria-labelledby="practice-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="mb-2 text-xs font-extrabold tracking-[0.18em] text-muted-foreground uppercase">Find your next step</p><h2 id="practice-heading" className="text-2xl font-medium sm:text-3xl">How will you practice today?</h2></div>
          <a href="#/lesson" className="py-2 text-sm font-extrabold text-primary underline-offset-4 hover:underline">Go to lessons →</a>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {practices.map((practice) => (
            <a key={practice.href} href={practice.href} className="group flex flex-col rounded-xl border bg-card p-6 shadow-card transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4">
              <span aria-hidden="true" className={`mb-6 flex size-12 items-center justify-center rounded-lg font-heading text-2xl ${practice.accent}`}>{practice.symbol}</span>
              <p className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">{practice.label}</p>
              <h3 className="mt-2 text-xl font-medium">{practice.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{practice.description}</p>
              <span className="mt-6 text-sm font-extrabold text-primary">Explore <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span></span>
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-5 rounded-xl border bg-accent/50 p-6 sm:flex-row sm:items-center sm:p-8" aria-label="Start a lesson">
        <div><h2 className="text-2xl font-medium">Ready when you are.</h2><p className="mt-2 text-sm text-muted-foreground">Make a little room for something new today.</p></div>
        <a href="#/lesson" className="inline-flex min-h-12 shrink-0 items-center rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4">Find a lesson →</a>
      </section>
    </div>
  )
}
