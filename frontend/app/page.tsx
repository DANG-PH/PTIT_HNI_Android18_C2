'use client'

import { useCallback, useEffect } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const { login, authenticated, isInitializing } = useTideCloak()
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
        <span className="pill pill-accent">Built with TideCloak</span>
      </header>

      <section className="hero">
        <span className="pill">Synthetic demo · no real data</span>
        <h1 style={{ marginTop: 16 }}>
          Ask AI about your most private documents.
          <br />
          Nobody else holds the key.
        </h1>
        <p className="lead">
          Medical results, insurance policies, bank statements. NeedToKnow lets an AI help you with them while
          the server, its admins and the AI itself can only see what you release, one question at a time.
        </p>
        <div className="row">
          <button className="btn btn-primary btn-lg" onClick={onLogin} disabled={isInitializing}>
            {isInitializing ? 'Connecting to Tide…' : 'Sign in with Tide'}
          </button>
          <span className="muted small">No password is stored anywhere: Tide&apos;s network verifies it in pieces.</span>
        </div>
      </section>

      <section className="features">
        <div className="card">
          <h3>🔐 No master key</h3>
          <p>
            Documents are encrypted in your browser. The decryption authority is split across Tide&apos;s independent
            nodes and only comes together for your own signed-in session.
          </p>
        </div>
        <div className="card">
          <h3>🤖 AI on a need-to-know basis</h3>
          <p>
            The AI sees titles first and asks for what it needs. You approve each document, it answers, and every
            disclosure lands in your receipt ledger.
          </p>
        </div>
        <div className="card">
          <h3>🛡️ Hijack-proof by design</h3>
          <p>
            A prompt-injected AI, a rogue admin or a breached server gets ciphertext. There is no key on the server for
            them to steal.
          </p>
        </div>
      </section>
    </>
  )
}
