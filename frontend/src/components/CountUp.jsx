import { useEffect, useRef, useState } from 'react'

/** Eases a number up from 0 to `value` whenever `value` changes, matching the original animateCount() behavior. */
export default function CountUp({ value, duration = 900, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const target = Number(value) || 0
    if (target === 0) {
      setDisplay(0)
      return
    }
    const start = Date.now()
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(target * eased))
      if (p < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  return <>{display}{suffix}</>
}
