'use client'

import { useI18n } from '../lib/i18n'

export type RingState = 'working' | 'granted' | 'refused'

const NODES = 20
const THRESHOLD = 14

/**
 * Emergent Authority, drawn: Tide's 20 independent ORK nodes, of which at least 14 must agree.
 * "granted" lights the threshold (the SDK confirms the threshold was met, not each node's vote);
 * "refused" mirrors the SDK's "20 of 20 failed" error exactly.
 */
export function ThresholdRing({ state, size = 'md' }: { state: RingState; size?: 'sm' | 'md' }) {
  const { t } = useI18n()
  const px = size === 'sm' ? 56 : 96
  const nodes = Array.from({ length: NODES }, (_, i) => {
    const a = (i / NODES) * Math.PI * 2 - Math.PI / 2
    return { i, x: 60 + 46 * Math.cos(a), y: 60 + 46 * Math.sin(a) }
  })
  const center =
    state === 'refused'
      ? { big: `0/${THRESHOLD}`, small: t('ring.agreed') }
      : state === 'granted'
        ? { big: '✓', small: t('ring.met') }
        : { big: `${THRESHOLD}/${NODES}`, small: t('ring.need') }
  const label =
    state === 'refused' ? t('ring.aria.refused') : state === 'granted' ? t('ring.aria.granted') : t('ring.aria.working')
  return (
    <div className={`ring ring-${state} ring-${size}`} role="img" aria-label={label} style={{ width: px, height: px }}>
      <svg viewBox="0 0 120 120" width={px} height={px} aria-hidden="true">
        <circle cx="60" cy="60" r="46" className="ring-track" />
        {nodes.map((n) => (
          <circle
            key={n.i}
            cx={n.x}
            cy={n.y}
            r="5.5"
            className={`ring-node${n.i < THRESHOLD ? ' yes' : ' no'}`}
            style={{ animationDelay: `${(state === 'working' ? n.i * 0.07 : n.i * 0.045).toFixed(3)}s` }}
          />
        ))}
      </svg>
      <div className="ring-center">
        <strong>{center.big}</strong>
        {size === 'md' && <span>{center.small}</span>}
      </div>
    </div>
  )
}
