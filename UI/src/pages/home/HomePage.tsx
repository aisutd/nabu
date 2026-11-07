import { sidebarItems } from '../../components/sidebar/sidebar_items'

export default function HomePage() {
  return (
    <section aria-label="Learn">
      <p className="mb-2 text-sm font-semibold text-muted-foreground">Your learning space</p>
      <h1 className="font-heading text-3xl sm:text-4xl">Learn</h1>
      <p className="mt-3 text-muted-foreground">Explore a page to get started.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sidebarItems.filter((item) => item.id !== 'home').map((item) => (
          <a key={item.id} href={item.href} className="rounded-xl border bg-card p-6 shadow-card transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2">
            <h2 className="text-xl font-semibold">{item.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Open {item.label.toLowerCase()} →</p>
          </a>
        ))}
      </div>
    </section>
  )
}
