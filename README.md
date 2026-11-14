# Nabu web

React + Vite + Tailwind v4 frontend for Nabu, built from the Figma Make "Handwriting Page mockup".

```bash
npm install
npm run dev
```

## Structure

```
src/
  App.tsx                 app shell: sidebar + hash routing (#/learn, #/handwriting, ...)
  types.ts                Page type and list of routes
  index.css               fonts, theme, sidebar + handwriting canvas styles
  components/
    Sidebar.tsx           shared sidebar (Learn / Practice tools / Account) + Wordmark
    Toast.tsx             useToast hook + status toast
  pages/
    LearnPage.tsx
    LessonsPage.tsx
    HandwritingPage.tsx   upload, reference glyph, find errors, grade (mocked — see TODOs)
    ProfilePage.tsx       dummy profile
    SettingsPage.tsx      About & support / Accessibility / Notifications tabs
    AslPage.tsx           dummy (ComingSoon)
    PronunciationPage.tsx dummy (ComingSoon)
    ComingSoon.tsx        shared placeholder for unbuilt tools
```

To add a page: create `src/pages/XPage.tsx`, add its id to `types.ts`, add a `case` in
`App.tsx`, and add a nav item in `Sidebar.tsx`.
