'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'

type Theme = 'light' | 'dark'

/** Effective theme right now: an explicit choice on <html>, else the OS preference. */
function currentTheme(): Theme {
  const forced = document.documentElement.getAttribute('data-theme')
  if (forced === 'light' || forced === 'dark') return forced
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Light/dark switch. Writes `data-theme` on <html> and remembers the choice in
 * localStorage; the anti-flash script in the root layout reads it back on load.
 * No app logic here -- purely a presentation toggle.
 */
export function ThemeToggle() {
  const { t } = useI18n()
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    setTheme(currentTheme())
  }, [])

  const toggle = () => {
    const next: Theme = (theme ?? currentTheme()) === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('ntk.theme', next)
    } catch {}
    setTheme(next)
  }

  const isDark = theme === 'dark'
  const label = isDark ? t('theme.toLight') : t('theme.toDark')

  return (
    <button
      type="button"
      className={`theme-toggle${isDark ? ' is-dark' : ''}`}
      onClick={toggle}
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      <svg className="theme-toggle-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <g className="sun">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </g>
        <path className="moon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  )
}
