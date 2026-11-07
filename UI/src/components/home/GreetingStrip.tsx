const greetings = [
  { text: 'Hola', language: 'Spanish', lang: 'es' },
  { text: 'Bonjour', language: 'French', lang: 'fr' },
  { text: 'こんにちは', language: 'Japanese', lang: 'ja' },
  { text: '你好', language: 'Mandarin', lang: 'zh' },
  { text: '안녕하세요', language: 'Korean', lang: 'ko' },
  { text: 'مرحبا', language: 'Arabic', lang: 'ar' },
  { text: 'नमस्ते', language: 'Hindi', lang: 'hi' },
  { text: 'שלום', language: 'Hebrew', lang: 'he' },
  { text: 'Hallo', language: 'German', lang: 'de' },
  { text: 'Ciao', language: 'Italian', lang: 'it' },
]

export default function GreetingStrip() {
  return (
    <section aria-label="Greetings around the world" className="min-w-0 overflow-hidden rounded-xl border-y bg-secondary py-6">
      <h2 className="mb-5 text-center font-sans text-xs font-extrabold tracking-[0.2em] text-muted-foreground uppercase">Say hello in every script</h2>
      <div className="greeting-window overflow-hidden">
        <div className="greeting-track flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 ? true : undefined} className="greeting-group flex shrink-0 items-center gap-3 pr-3">
              {greetings.map(({ text, language, lang }) => (
                <li key={lang} className="flex min-h-16 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl border-2 bg-card px-5 py-3 shadow-card">
                  <span lang={lang} dir="auto" className="font-heading text-2xl font-medium">{text}</span>
                  <span className="text-xs font-bold text-muted-foreground">{language}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  )
}
