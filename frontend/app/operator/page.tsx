'use client'

import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import tcConfig from '../../tidecloak.json'
import { Glyph } from '../components/Glyph'
import { ThresholdRing } from '../components/ThresholdRing'
import { ThemeToggle } from '../components/ThemeToggle'
import { LangSwitch, useI18n, type I18nKey } from '../lib/i18n'
import { errorText, useApi, useVaultCrypto } from '../lib/vault'

interface StoreRow {
  id: string
  owner: string
  category: string
  titleCt: string
  bodyCt: string
  bodyBytes: number
  createdAt: string
}

const cfg = tcConfig as Record<string, any>
const consoleUrl = `${String(cfg['auth-server-url'] ?? '').replace(/\/+$/, '')}/realms/${cfg.realm}/tide-console/`

export default function OperatorPage() {
  const { authenticated, isInitializing, hasRealmRole, getValueFromToken, logout } = useTideCloak()
  const router = useRouter()
  const api = useApi()
  const { decrypt } = useVaultCrypto()
  const { t } = useI18n()

  const [rows, setRows] = useState<StoreRow[]>([])
  const [totals, setTotals] = useState<{ documents: number; owners: number } | null>(null)
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState<Record<string, { state: 'busy' | 'ok' | 'refused'; text: string }>>({})
  const [rogue, setRogue] = useState<{ busy: boolean; output?: string; given?: number; model?: string }>({ busy: false })

  const me = getValueFromToken('sub') as string | undefined

  useEffect(() => {
    if (!isInitializing && !authenticated) router.push('/')
  }, [authenticated, isInitializing, router])

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await api<{ totals: { documents: number; owners: number }; rows: StoreRow[] }>('/operator/store')
      setRows(res.rows)
      setTotals(res.totals)
    } catch (err) {
      setError(errorText(err))
    }
  }, [api])

  useEffect(() => {
    if (authenticated) load()
  }, [authenticated, load])

  const tryDecrypt = useCallback(
    async (row: StoreRow) => {
      setAttempts((a) => ({ ...a, [row.id]: { state: 'busy', text: '' } }))
      try {
        const [plain] = await decrypt([row.bodyCt])
        setAttempts((a) => ({ ...a, [row.id]: { state: 'ok', text: plain.slice(0, 160) } }))
      } catch (err) {
        setAttempts((a) => ({ ...a, [row.id]: { state: 'refused', text: errorText(err) } }))
      }
    },
    [decrypt],
  )

  const unleash = useCallback(async () => {
    setRogue({ busy: true })
    try {
      const res = await api<{ recordsGiven: number; model: string; output: string }>('/operator/rogue-agent', {
        method: 'POST',
      })
      setRogue({ busy: false, output: res.output, given: res.recordsGiven, model: res.model })
    } catch (err) {
      setRogue({ busy: false, output: `Error: ${errorText(err)}` })
    }
  }, [api])

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">N</span> NeedToKnow <span className="pill pill-danger">{t('nav.operator')}</span>
        </div>
        <nav>
          <a className="btn btn-sm" href="/home">
            {t('nav.backToVault')}
          </a>
          <button className="btn btn-sm" onClick={() => logout()}>
            {t('nav.signOut')}
          </button>
          <LangSwitch />
          <ThemeToggle />
        </nav>
      </header>

      <main className="page">
        {!isInitializing && authenticated && !hasRealmRole('ntk-operator') && (
          <div className="alert alert-warn small" style={{ marginBottom: 16 }}>
            {t('op.noRole')}
          </div>
        )}

        <section className="card">
          <div className="row">
            <h2>{t('op.storeTitle')}</h2>
            <span className="spacer" />
            {totals && (
              <span className="pill">{t('op.totals', { docs: totals.documents, users: totals.owners })}</span>
            )}
            <button className="btn btn-sm" onClick={load}>
              {t('op.refresh')}
            </button>
          </div>
          <p className="sub">
            {t('op.storeSub')}
          </p>
          {error && <div className="alert alert-danger small">{error}</div>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('op.colOwner')}</th>
                  <th>{t('vault.form.category')}</th>
                  <th>{t('op.colTitle')}</th>
                  <th>{t('op.colBody')}</th>
                  <th>{t('op.colDecrypt')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = attempts[r.id]
                  return (
                    <tr key={r.id}>
                      <td className="mono small">
                        {r.owner === me ? <span className="pill pill-accent">{t('op.you')}</span> : `${r.owner.slice(0, 8)}…`}
                      </td>
                      <td>{t(`cat.${r.category}` as I18nKey)}</td>
                      <td className="ct">{r.titleCt.slice(0, 60)}…</td>
                      <td className="ct">{r.bodyCt.slice(0, 120)}…</td>
                      <td style={{ minWidth: 220 }}>
                        <button className="btn btn-sm" onClick={() => tryDecrypt(r)} disabled={a?.state === 'busy'}>
                          {a?.state === 'busy' ? t('op.asking') : t('op.tryDecrypt')}
                        </button>
                        {a?.state === 'busy' && (
                          <div className="ring-row" style={{ marginTop: 8 }}>
                            <ThresholdRing state="working" size="sm" />
                            <p>{t('ring.aria.working')}</p>
                          </div>
                        )}
                        {a?.state === 'refused' && (
                          <div className="alert alert-danger small" style={{ marginTop: 6 }}>
                            <div className="ring-row" style={{ marginBottom: 6 }}>
                              <ThresholdRing state="refused" />
                              <span>
                                <Glyph name="stop" /> {t('op.refused')} <RefusalSummary raw={a.text} />
                              </span>
                            </div>
                            <details style={{ marginTop: 4 }}>
                              <summary>{t('op.rawError')}</summary>
                              <code style={{ wordBreak: 'break-all' }}>{a.text.slice(0, 400)}</code>
                            </details>
                          </div>
                        )}
                        {a?.state === 'ok' && (
                          <div className="alert alert-ok small ring-row" style={{ marginTop: 6 }}>
                            <ThresholdRing state="granted" size="sm" />
                            <span>
                              {t('op.decryptedOwn')} {a.text}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>{t('op.rogueTitle')}</h2>
          <p className="sub">
            {t('op.rogueSub')}
          </p>
          <button className="btn btn-primary btn-sm" onClick={unleash} disabled={rogue.busy}>
            {rogue.busy ? t('op.rogueBusy') : t('op.rogueRun')}
          </button>
          {rogue.output && (
            <div className="bubble ai" style={{ marginTop: 12 }}>
              <div className="small muted" style={{ marginBottom: 6 }}>
                {t('op.rogueGiven', { model: rogue.model ?? '', n: rogue.given ?? 0 })}
              </div>
              {rogue.output}
            </div>
          )}
        </section>

        <section className="card">
          <h2>{t('op.govTitle')}</h2>
          <p className="sub">
            {t('op.govSub')}
          </p>
          <a className="btn btn-sm" href={consoleUrl} target="_blank" rel="noreferrer">
            {t('op.openConsole')}
          </a>
        </section>
      </main>
    </>
  )
}

/**
 * The SDK reports a threshold refusal as "got X of N required, F of T failed". Say what that means:
 * every independent node checked the request against the caller's identity and declined.
 */
function RefusalSummary({ raw }: { raw: string }) {
  const { t } = useI18n()
  const m = raw.match(/got \d+ of (\d+) required, (\d+) of (\d+) failed/)
  if (!m) return <>{raw.slice(0, 160)}</>
  return <>{t('op.refusedSummary', { need: m[1], failed: m[2], total: m[3] })}</>
}
