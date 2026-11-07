type Props = { title: string; description: string }

export default function PagePlaceholder({ title, description }: Props) {
  return (
    <section aria-label={title}>
      <p className="mb-2 text-sm font-semibold text-muted-foreground">Page preview</p>
      <h1 className="font-heading text-3xl sm:text-4xl">{title}</h1>
      <div className="mt-6 rounded-xl border bg-card p-6 shadow-card">
        <p>{description}</p>
        <p className="mt-3 text-sm text-muted-foreground">This is a placeholder. More content will be added here.</p>
      </div>
    </section>
  )
}
