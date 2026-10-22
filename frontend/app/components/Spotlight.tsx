'use client'

import { useEffect } from 'react'

/**
 * Feeds the pointer position to the `.card` under it as CSS variables:
 * --mx/--my (px) for the spotlight glow and --px/--py (-0.5..0.5) for the 3D tilt.
 * Presentation only; renders nothing.
 */
export function Spotlight() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.('.card') as HTMLElement | null
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - r.left}px`)
      card.style.setProperty('--my', `${e.clientY - r.top}px`)
      card.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
      card.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => document.removeEventListener('pointermove', onMove)
  }, [])
  return null
}
