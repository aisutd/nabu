# Frontend theme

Use the shared Nabu theme in `src/index.css` for current and future UI work.

- Use semantic Tailwind colors (`bg-background`, `bg-card`, `bg-primary`,
  `text-foreground`, `text-muted-foreground`, `border-border`, `border-input`,
  `outline-ring`) instead of hardcoded hex colors or component-specific palettes.
- Nunito is the body font. Fredoka is the heading/brand font (`font-heading`).
  Font stylesheets are loaded in `index.html`; system fallbacks work offline.
- Primary actions use jam red (`bg-primary text-primary-foreground`).
  Secondary controls use secondary/accent tokens. Errors use destructive tokens;
  status accents use success/info/warning with readable foreground text.
- Use the shared radius scale. Main cards use `rounded-xl`; smaller controls use
  `rounded-lg`. Use `shadow-card` for subtle card elevation, not heavy shadows.
- Keep the cookie-colored theme without adding a cookie icon to the Nabu title.
- Preserve the user's existing layout and copy choices unless asked to change them.
