'use client'

import { useCallback, useEffect } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { LangSwitch, useI18n } from './lib/i18n'

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

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">N</span> NeedToKnow
        </div>
        <nav>
          <span className="pill pill-accent">{t('brand.builtWith')}</span>
          <LangSwitch />
        </nav>
      </header>

      <section className="hero">
        <span className="pill">{t('landing.badge')}</span>
        <h1 style={{ marginTop: 16 }}>
          {t('landing.title1')}
          <br />
          {t('landing.title2')}
        </h1>
        <p className="lead">{t('landing.lead')}</p>
        <div className="row">
          <button className="btn btn-primary btn-lg" onClick={onLogin} disabled={isInitializing}>
            {isInitializing ? t('landing.connecting') : t('landing.signIn')}
          </button>
          <span className="muted small">{t('landing.noPassword')}</span>
        </div>
      </section>

      <section className="features">
        <div className="card">
          <h3>{t('landing.f1.title')}</h3>
          <p>{t('landing.f1.body')}</p>
        </div>
        <div className="card">
          <h3>{t('landing.f2.title')}</h3>
          <p>{t('landing.f2.body')}</p>
        </div>
        <div className="card">
          <h3>{t('landing.f3.title')}</h3>
          <p>{t('landing.f3.body')}</p>
        </div>
      </section>
    </>
  )
}
