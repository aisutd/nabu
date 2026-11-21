import { useEffect, useRef, useState } from 'react'
import hand from '../../assets/Nabu - Hand.png'
import eyes from '../../assets/Nabu - Eyes.png'
import mouth from '../../assets/Nabu - mouth.png'
import blush from '../../assets/Nabu - blush.png'

export default function NabuGreeting() {
  const spot = useRef<HTMLDivElement>(null)
  const [hasEntered, setHasEntered] = useState(false)

  useEffect(() => {
    const element = spot.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setHasEntered(true)
      observer.disconnect()
    }, { threshold: 0.25 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={spot} aria-hidden="true" className="pointer-events-none relative h-44 overflow-hidden sm:h-48">
      {hasEntered && (
        <div className="profile-nabu-peek absolute right-3 bottom-0 size-44 sm:right-5 sm:size-48">
          <div className="profile-nabu-wave relative size-full">
            {[hand, blush, eyes, mouth].map((layer) => (
              <img key={layer} src={layer} alt="" className="absolute inset-0 size-full" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
