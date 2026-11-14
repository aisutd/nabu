import type { AnimationEvent, CSSProperties } from 'react'
import handUrl from '../../assets/Nabu - Hand.png'
import blushUrl from '../../assets/Nabu - blush.png'
import eyesUrl from '../../assets/Nabu - Eyes.png'
import mouthUrl from '../../assets/Nabu - mouth.png'
import starUrl from '../../assets/Star.png'

const STAR_COUNT = 3

/**
 * Spider-web glass crack around the impact point, generated once with a fixed
 * seed so it looks hand-drawn but is identical on every play. Coordinates are
 * in a 1000×1000 box centred on the impact.
 */
const CRACK = (() => {
  let seed = 11
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const jitter = (amount: number) => (rand() * 2 - 1) * amount
  const radii = [16, 95, 175, 265, 370, 490]
  const rayCount = 9
  const point = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`

  const rays = Array.from({ length: rayCount }, (_, i) => {
    let angle = (i / rayCount) * Math.PI * 2 + jitter(0.25)
    return radii.map((r, k) => {
      angle += jitter(0.13)
      return { r: r * (k === radii.length - 1 ? 0.75 + rand() * 0.25 : 1) + jitter(10), a: angle }
    })
  })

  const main = rays.map((ray) => `M${ray.map((p) => point(p.r, p.a)).join(' L')}`)
  const rings: string[] = []
  rays.forEach((ray, i) => {
    const next = rays[(i + 1) % rayCount]
    for (const k of [1, 2, 3]) {
      // Fewer, patchier rings further out read as shattered glass, not a web.
      if (rand() > [0, 0.85, 0.55, 0.3][k]) continue
      const a = ray[k], b = next[k]
      const mid = (a.a + b.a + (b.a < a.a ? Math.PI * 2 : 0)) / 2
      rings.push(`M${point(a.r, a.a)} Q${point((a.r + b.r) / 2 - 18, mid)} ${point(b.r, b.a)}`)
    }
  })
  const branches = rays.filter((_, i) => i % 2 === 0).map((ray) => {
    const base = ray[3]
    const dir = rand() < 0.5 ? -1 : 1
    return `M${point(base.r, base.a)} L${point(base.r + 70, base.a + dir * 0.18)} L${point(base.r + 120, base.a + dir * 0.32)}`
  })
  return { main: [...main, ...branches], rings }
})()

function GlassCrack() {
  const lines = (paths: string[], kind: string) => paths.map((d) => <path key={d} d={d} pathLength={1} className={kind} />)
  return (
    <svg className="nabu-fail__crack" viewBox="-500 -500 1000 1000">
      <g className="nabu-fail__crack-dark">{lines(CRACK.main, 'is-ray')}{lines(CRACK.rings, 'is-ring')}</g>
      <g className="nabu-fail__crack-glint">{lines(CRACK.main, 'is-ray')}{lines(CRACK.rings, 'is-ring')}</g>
    </svg>
  )
}

type Props = {
  /** Called once the animation has finished, so the parent can unmount it. */
  onDone?: () => void
}

/**
 * Nabu built from the layer assets, which share one 1000×1000 canvas. He starts
 * with his normal face (Eyes + mouth layers) and switches to closed eyes and a
 * neutral mouth the moment he splats into the screen.
 */
function DazedNabu() {
  return (
    <svg className="nabu-fail__nabu" viewBox="0 0 1000 1000">
      <image href={handUrl} width="1000" height="1000" />
      <image href={blushUrl} width="1000" height="1000" />
      <g className="nabu-fail__face-happy">
        <image href={eyesUrl} width="1000" height="1000" />
        <image href={mouthUrl} width="1000" height="1000" />
      </g>
      <g className="nabu-fail__face nabu-fail__face-dazed" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Closed eyes: lids drawn where the open eyes sit, with small lashes. */}
        <path d="M362 420 Q420 458 482 420" strokeWidth="9" />
        <path d="M376 432 l-12 14 M420 441 l0 17 M464 432 l12 14" strokeWidth="6" />
        <path d="M590 422 Q648 460 708 422" strokeWidth="9" />
        <path d="M604 434 l-12 14 M648 443 l0 17 M692 434 l12 14" strokeWidth="6" />
        {/* Neutral mouth. */}
        <path d="M470 652 Q532 646 594 652" strokeWidth="10" />
      </g>
    </svg>
  )
}

/**
 * Full-screen, non-interactive failure animation (~4.6s): Nabu flies at the
 * viewer, splats against the screen, slides off and falls, then sits dazed
 * while stars circle his head. Remount (e.g. change `key`) to replay it.
 */
export default function NabuFailAnimation({ onDone }: Props) {
  function handleEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onDone?.()
  }

  return (
    <div className="nabu-fail" aria-hidden="true">
      <div className="nabu-fail__flash" />
      <GlassCrack />
      <div className="nabu-fail__body" onAnimationEnd={handleEnd}>
        <div className="nabu-fail__squash"><DazedNabu /></div>
        <div className="nabu-fail__stars">
          {Array.from({ length: STAR_COUNT }, (_, index) => (
            <div key={index} className="nabu-fail__star-y" style={{ '--i': index } as CSSProperties}>
              <div className="nabu-fail__star-x">
                <img className="nabu-fail__star" src={starUrl} alt="" draggable={false} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
