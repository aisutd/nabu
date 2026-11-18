import { useEffect, useId, useState } from 'react'
import { apiUrl } from '../../api/backend'

type Markers = [points: [number, number][], sizes: number[]]
type Review = { mode: 'errors'; markers: Markers } | { mode: 'grade'; similarity: number }
type Action = Review['mode']

const tips = [
  ['PNG files only', 'Export or photograph your sample and save it as a PNG.'],
  ['Write on paper', 'Use plain, light paper without lines or patterns.'],
  ['Keep it clear', 'Use dark ink, good lighting, and avoid shadows or blur.'],
  ['One glyph at a time', 'Center a single character with space around it.'],
]

const previewBox = 'handwriting-guides grid aspect-square place-items-center overflow-hidden rounded-lg border border-border bg-background/35'
const actionButton = 'min-h-11 rounded-lg border border-primary px-4 py-2 font-bold disabled:opacity-40'

export default function HandwritingPage() {
  const fileId = useId()
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState('')
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>()
  const [reference, setReference] = useState('a')
  const [pending, setPending] = useState<Action>()
  const [review, setReview] = useState<Review>()
  const [error, setError] = useState('')
  const [failedReference, setFailedReference] = useState<string>()
  const glyph = reference.trim()
  const hasGlyph = Array.from(glyph).length === 1

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview)
  }, [preview])

  function selectFile(selected: File) {
    setReview(undefined)
    setError('')
    setImageSize(undefined)
    setPreview('')
    if (selected.type !== 'image/png' && (selected.type || !/\.png$/i.test(selected.name))) {
      setFile(undefined)
      setError('Choose a PNG file.')
      return
    }
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  async function submit(mode: Action) {
    if (!file || !imageSize || !hasGlyph || pending) return
    setPending(mode)
    setReview(undefined)
    setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('expected', glyph)
    const path = mode === 'errors' ? 'review' : 'grade'

    try {
      const response = await fetch(apiUrl(`/ocr/errorfinder/${path}`), { method: 'POST', body: form })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        if (response.status === 422 && typeof body?.detail === 'string') {
          setError(body.detail)
          return
        }
        throw new Error('Handwriting review failed')
      }
      if (mode === 'errors') {
        setReview({ mode, markers: await response.json() })
      } else {
        const { similarity } = await response.json()
        setReview({ mode, similarity })
      }
    } catch {
      setError('Could not review the sample. Check that the Nabu backend is running on port 8000.')
    } finally {
      setPending(undefined)
    }
  }

  const disabled = !file || !imageSize || !hasGlyph || Boolean(pending)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-4xl font-semibold">Compare handwriting</h1>
        <p className="mt-2 text-muted-foreground">Upload a handwriting sample and compare it with the matching reference glyph.</p>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)]">
        <section aria-label="Handwriting review" className="rounded-xl border bg-card p-4 shadow-card sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <h2 className="font-bold">Your handwriting</h2>
              <p className="mb-2 text-xs text-muted-foreground">PNG upload</p>
              <input id={fileId} type="file" accept="image/png,.png" disabled={Boolean(pending)} className="peer sr-only"
                onChange={(event) => {
                  const selected = event.target.files?.[0]
                  event.target.value = ''
                  if (selected) selectFile(selected)
                }} />
              <div className={`${previewBox} relative peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2`}>
                {preview ? (
                  <div className="absolute inset-0">
                    <img src={preview} alt="Uploaded handwriting" className="absolute inset-0 size-full object-contain"
                      onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                      onError={() => {
                        setFile(undefined)
                        setPreview('')
                        setImageSize(undefined)
                        setError('Choose a readable PNG file.')
                      }} />
                    {review?.mode === 'errors' && imageSize && (
                      <svg className="pointer-events-none absolute inset-0 size-full text-destructive" role="img" aria-label="Highlighted stroke differences"
                        viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}>
                        {review.markers[0].map(([x, y], index) => (
                          <circle key={index} cx={x} cy={y} r={review.markers[1][index] / 2}
                            fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                        ))}
                      </svg>
                    )}
                  </div>
                ) : (
                  <div className="z-10 space-y-1 p-3 text-center">
                    <span aria-hidden className="mx-auto mb-2 grid size-10 place-items-center rounded-full bg-accent text-xl text-accent-foreground">↑</span>
                    <p className="text-sm font-bold">Upload handwriting</p>
                    <p className="text-xs text-muted-foreground">Choose a clear PNG file</p>
                    <label htmlFor={fileId} className="mt-2 inline-block cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Select file</label>
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                <span>{file?.name ?? 'One glyph per image'}</span>
                {file && <label htmlFor={fileId} className={pending ? 'opacity-50' : 'cursor-pointer font-bold text-primary'}>Replace file</label>}
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-bold">Reference glyph</h2>
                  <p className="text-xs text-muted-foreground">The expected form</p>
                </div>
                <input aria-label="Reference character" value={reference} disabled={Boolean(pending)}
                  onChange={(event) => {
                    setReference(event.target.value)
                    setReview(undefined)
                    setFailedReference(undefined)
                    setError('')
                  }}
                  className="w-12 rounded-lg border border-input bg-background px-2 py-1 text-center font-bold" />
              </div>
              <div className={`${previewBox} relative`}>
                {hasGlyph && failedReference !== glyph ? (
                  <img key={glyph} src={apiUrl(`/ocr/reference?expected=${encodeURIComponent(glyph)}`)} alt={`Reference glyph ${glyph}`}
                    onError={() => setFailedReference(glyph)} className="absolute inset-0 m-auto size-[38%] object-contain" />
                ) : (
                  <p className="z-10 rounded-lg bg-card p-2 text-center text-sm text-muted-foreground">
                    {hasGlyph ? 'Reference preview unavailable.' : 'Enter one reference character.'}
                  </p>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Editable reference character</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-2">
            <button type="button" disabled={disabled} onClick={() => void submit('errors')} className={`${actionButton} bg-primary text-primary-foreground`}>
              {pending === 'errors' ? 'Finding errors…' : 'Find errors'}
            </button>
            <button type="button" disabled={disabled} onClick={() => void submit('grade')} className={`${actionButton} text-primary`}>
              {pending === 'grade' ? 'Grading…' : 'Grade handwriting'}
            </button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          {review && (
            <div role="status" className="mt-4 rounded-lg bg-muted p-3 text-sm">
              {review.mode === 'errors'
                ? review.markers[0].length ? 'Highlighted areas show the largest stroke differences.' : 'No prominent stroke differences were found.'
                : <><strong>{review.similarity}% shape similarity</strong><p>Estimated from stroke geometry after aligning the sample to the reference.</p></>}
            </div>
          )}
        </section>
        <aside className="rounded-xl bg-accent p-5 text-accent-foreground">
          <h2 className="font-heading text-xl font-semibold">Tips for a clean test</h2>
          <ol className="mt-4 space-y-4">
            {tips.map(([title, detail], index) => (
              <li key={title} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card font-bold text-primary">{index + 1}</span>
                <div><strong>{title}</strong><p className="mt-0.5 text-xs">{detail}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-lg border bg-card/65 p-3 text-xs">Cropped, tilted, or low-contrast samples may produce less reliable results.</p>
        </aside>
      </div>
    </div>
  )
}
