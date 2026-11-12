# Shared speaking activities

Use `SpeakingActivity` anywhere a learner needs to speak. It captures media,
uploads it to `/speaking/recordings`, and calls `/speaking/review` in the
pronunciation backend. Each instance owns its recordings, feedback, retry state,
and previous-attempt replay. A changed task/capture mode remounts the session,
releasing media tracks and aborting pending frontend requests.

```tsx
import SpeakingActivity from './components/speaking/SpeakingActivity'

// Word supplied by an exercise, with the reference hidden from the learner.
<SpeakingActivity
  expectedText="june"
  capture="video"
  showReference={false}
  onComplete={(result) => {
    // Let the parent exercise decide whether to save/continue/retry.
    // Inspect result.errors and result.checks: completion can be partial.
    console.log(result)
  }}
/>

// Server-owned expected answer. Client expectedText cannot override it.
<SpeakingActivity exerciseId="say-june" showReference={false} />

// Read aloud without requesting camera permission.
<SpeakingActivity expectedText="Hello there" capture="audio" />

// Picture prompt: render your picture outside the component; keep its answer
// in a server-owned exercise when grading matters. No reference need be shown.
<SpeakingActivity exerciseId="say-june" capture="audio" showExpectedText={false} />

// Open conversation: no expected answer, so no correctness judgment.
<SpeakingActivity capture="audio" onComplete={(result) => {
  console.log(result.transcription?.heard)
}} />
```

Options:

- `expectedText`: optional expected word/sentence for standalone practice.
- `exerciseId`: resolves the expected answer from `EXERCISES` in
  `pronounciation/speaking.py`. Unknown exercise IDs fail rather than falling
  back to a browser-provided answer. Replace this registry with a lesson DB later.
- `capture`: `audio` or `video`; defaults to video unless an exercise specifies it.
- `showReference`: controls visibility only. The server still selects a reference
  for video analysis even when the preview is hidden. Defaults to false.
- `showExpectedText`: hides the expected-answer heading for picture/recall tasks
  without disabling expected-answer analysis. Defaults to true.
- `showAnalysis`: exposes raw checks, geometry plots, and neural results for demos.
- `maxDurationMs`: capture limit. Default 4.5 seconds for isolated-word video;
  otherwise 30 seconds. Increasing it does not extend the neural model's limit.
- `onComplete`: receives the structured result after review; it does not indicate
  pronunciation success. Failed/skipped checks are explicit in the result.
- `onAttemptReset`: tells a parent lesson to clear its reviewed/continue state
  when the learner retries or selects another recording.
- `onBusyChange`: allows a parent to disable task changes during recording/review.

Analysis capabilities:

- Audio, word: transcription and expected-word matching.
- Audio, phrase: transcription and expected-text matching.
- Audio/video, free response: transcription, with `match: null`.
- Video, known single word: speech plus geometric and neural mouth comparison.
- Sentence, missing reference, or audio-only: mouth analysis is explicitly skipped.
- Neural inference is currently limited to trimmed single-word clips under five
  seconds. Similarity is experimental and is not turned into correctness labels.

References and expected answers come from the backend. The five installed visual
reference clips are silent; the preview explicitly identifies that limitation.
No reference is downloaded by the frontend when `showReference` is false.

The existing standalone pronunciation endpoints/components remain available for
legacy demo integrations. New workflows should use this shared component and API.
Restart Vite after adding the `/speaking` proxy. Production uses the same
`VITE_API_BASE_URL` as the existing pronunciation API.

Media and previous attempts are session-only; there is no automatic account
history, grading policy, or database persistence. Parent workflows own those.
