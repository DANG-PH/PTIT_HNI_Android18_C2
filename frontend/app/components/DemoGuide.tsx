'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { Glyph } from './Glyph'

export interface GuideStep {
  key: string
  title: string
  body: string
  done: boolean
  action: { label: string; onClick?: () => void; href?: string; disabled?: boolean }
}

const OPEN_KEY = 'ntk.guide.open'

/** The demo path in four steps, so a first-time visitor (or a judge) always knows what to do next. */
export function DemoGuide({ steps, onRestart, restartDisabled }: { steps: GuideStep[]; onRestart: () => void; restartDisabled?: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(true)
  const current = steps.findIndex((s) => !s.done)

  useEffect(() => {
    try {
      if (localStorage.getItem(OPEN_KEY) === '0') setOpen(false)
    } catch {
      // Storage unavailable: the guide simply stays open.
    }
  }, [])

  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem(OPEN_KEY, o ? '0' : '1')
      } catch {
        // Not persisted; fine for this page view.
      }
      return !o
    })
  }

  return (
    <section className="card guide" aria-label={t('guide.eyebrow')}>
      <div className="row">
        <span className="eyebrow">{t('guide.eyebrow')}</span>
        <h2 className="guide-title">{t('guide.title')}</h2>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={onRestart} disabled={restartDisabled}>
          {t('guide.restart')}
        </button>
        <button className="btn btn-sm" onClick={toggle} aria-expanded={open}>
          {open ? t('guide.hide') : t('guide.show')}
        </button>
      </div>
      {open && (
        <ol className="guide-steps">
          {steps.map((s, i) => {
            const isCurrent = i === current
            const cls = `btn btn-sm${isCurrent ? ' btn-primary' : ''}`
            return (
              <li key={s.key} className={`guide-step${s.done ? ' done' : ''}${isCurrent ? ' current' : ''}`}>
                <span className="guide-num">{s.done ? <Glyph name="check" /> : i + 1}</span>
                <div className="guide-body">
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  {s.action.href ? (
                    <a className={cls} href={s.action.href} aria-disabled={s.action.disabled}>
                      {s.action.label}
                    </a>
                  ) : (
                    <button className={cls} onClick={s.action.onClick} disabled={s.action.disabled || s.done}>
                      {s.action.label}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
