'use client'

import { useCallback, useEffect, type ReactNode } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/app/components/ThemeToggle'
import { DemoVideo } from '@/app/components/DemoVideo'
import { DEMO_DOCS, DEMO_QUESTIONS } from './lib/demo-docs'
import { LangSwitch, useI18n, type I18nKey } from './lib/i18n'

/** Documents the preview shows the AI asking for, with the reason it gives. Passport stays sealed. */
const PREVIEW_REQUESTS: Record<string, I18nKey> = {
  'Health insurance policy': 'mock.reasonPolicy',
  'Surgery quote': 'mock.reasonQuote',
  'Bank statement': 'mock.reasonBank',
}

export default function LandingPage() {
  const { login, authenticated, isInitializing } = useTideCloak()
  const { t } = useI18n()
  const router = useRouter()

  const onLogin = useCallback(() => {
    login()
  }, [login])

  useEffect(() => {
    if (authenticated) router.push('/home')
  }, [authenticated, router])

  const signIn = (
    <button className="btn btn-primary btn-lg" onClick={onLogin} disabled={isInitializing}>
      {isInitializing ? t('landing.connecting') : `${t('landing.signIn')} →`}
    </button>
  )

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">N</span> NeedToKnow
        </div>
        <nav>
          <a className="nav-link" href="#how">{t('nav.how')}</a>
          <a className="nav-link" href="#security">{t('nav.security')}</a>
          <span className="pill pill-accent">{t('brand.builtWith')}</span>
          <LangSwitch />
          <ThemeToggle />
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="badge">
            {t('landing.e2ee')} · {t('landing.badge')}
          </span>
          <h1>
            {t('landing.title1')}
            <br />
            <span className="gradient-text">{t('landing.title2')}</span>
          </h1>
          <p className="lead">{t('landing.lead')}</p>
          <div className="row">
            {signIn}
            <DemoVideo />
          </div>
          <p className="muted small hero-note">{t('landing.noPassword')}</p>
        </div>

        <ProductPreview />
      </section>

      <section className="section" id="how">
        <div className="section-head reveal">
          <span className="eyebrow">{t('nav.how')}</span>
          <h2>{t('landing.how.title')}</h2>
          <p>{t('landing.how.sub')}</p>
        </div>
        <div className="how-grid">
          <Step n="01" title={t('landing.s1.title')}>{t('landing.s1.body')}</Step>
          <Step n="02" title={t('landing.s2.title')}>{t('landing.s2.body')}</Step>
          <Step n="03" title={t('landing.s3.title')}>{t('landing.s3.body')}</Step>
          <Step n="04" title={t('landing.s4.title')}>{t('landing.s4.body')}</Step>
        </div>
      </section>

      <section className="section" id="security">
        <div className="section-head reveal">
          <span className="eyebrow">{t('nav.security')}</span>
          <h2>{t('landing.sec.title')}</h2>
          <p>{t('landing.sec.sub')}</p>
        </div>
        <div className="bento">
          <div className="card bento-big reveal">
            <Icon>
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="M10.7 12.3 21 2M17 6l3 3M14.5 8.5 17 11" />
            </Icon>
            <h3>{t('landing.noKey.title')}</h3>
            <p>{t('landing.noKey.body')}</p>
            <VaultVisual />
          </div>
          <div className="card tilt reveal">
            <Icon>
              <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
              <path d="m9 12 2 2 4-4" />
            </Icon>
            <h3>{t('landing.hijack.title')}</h3>
            <p>{t('landing.hijack.body')}</p>
          </div>
          <div className="card tilt reveal">
            <Icon>
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
            </Icon>
            <h3>{t('landing.operator.title')}</h3>
            <p>{t('landing.operator.body')}</p>
          </div>
          <div className="card tilt reveal">
            <Icon>
              <circle cx="9" cy="8" r="3.5" />
              <path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.9 2.7 2.7 3 5.2" />
            </Icon>
            <h3>{t('landing.governance.title')}</h3>
            <p>{t('landing.governance.body')}</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="card reveal">
          <h2>{t('landing.cta.title')}</h2>
          <p>{t('landing.cta.body')}</p>
          <div className="row">{signIn}</div>
        </div>
      </section>

      <footer className="footer">
        <span>NeedToKnow · {t('landing.badge')}</span>
        <span>{t('brand.builtWith')}</span>
      </footer>
    </>
  )
}

/** A still frame of the real app at the moment of consent. Decorative: nothing in it is interactive. */
function ProductPreview() {
  const { t, lang } = useI18n()
  const docs = DEMO_DOCS.map((d) => ({ title: d.title.split(':')[0], category: d.category }))
  const requested = docs.filter((d) => d.title in PREVIEW_REQUESTS)
  return (
    <div className="mock" aria-hidden="true">
      <div className="mock-bar">
        <span className="mock-dots">
          <i />
          <i />
          <i />
        </span>
        <span className="mock-tab active">{t('tab.ask')}</span>
        <span className="mock-tab">{t('tab.receipts')}</span>
        <span className="spacer" />
        <span className="mock-status">E2EE · TIDE</span>
      </div>
      <div className="mock-body">
        <div className="mock-vault">
          <span className="eyebrow">
            {t('vault.title')} · {t('mock.sealed', { n: docs.length })}
          </span>
          <ul className="doc-list">
            {docs.map((d) => {
              const asked = d.title in PREVIEW_REQUESTS
              return (
                <li key={d.title} className={`doc${asked ? ' requested' : ''}`}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="title">{d.title}</div>
                    <div className="meta">{t(`cat.${d.category}` as I18nKey)}</div>
                  </div>
                  <span className="tag">{asked ? t('mock.tagRequested') : t('mock.tagSealed')}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="mock-chat thread">
          <div className="bubble user">{DEMO_QUESTIONS[lang].surgery}</div>
          <div className="consent">
            <h3>{t('turn.asks', { n: requested.length, total: docs.length })}</h3>
            {requested.map((d) => (
              <div className="consent-item" key={d.title}>
                <span className="check" />
                <span>
                  <strong>{d.title}</strong>
                  <br />
                  <span className="reason">{t(PREVIEW_REQUESTS[d.title])}</span>
                </span>
              </div>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <span className="btn btn-primary btn-sm">{t('turn.release', { n: requested.length })}</span>
              <span className="btn btn-sm">{t('turn.deny')}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mock-log">
        &gt; {t('mock.log', { n: requested.length, total: docs.length })}
        <span className="caret" />
      </div>
    </div>
  )
}

/** Decorative: the vault in the middle, Tide's key-holding nodes orbiting it. */
function VaultVisual() {
  return (
    <div className="vault-visual" aria-hidden="true">
      {[1, 2, 3].map((n) => (
        <div key={n} className={`orbit orbit-${n}`}>
          <div className="arm">
            <span className="node" />
          </div>
        </div>
      ))}
      <div className="vault-core">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </div>
    </div>
  )
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="card tilt reveal">
      <span className="how-num">{n}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="icon-tile">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </span>
  )
}
