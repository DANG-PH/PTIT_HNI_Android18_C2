'use client'

import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import tcConfig from '../../tidecloak.json'
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
          <span className="brand-mark">N</span> NeedToKnow <span className="pill pill-danger">Operator console</span>
        </div>
        <nav>
          <a className="btn btn-sm" href="/home">
            Back to my vault
          </a>
          <button className="btn btn-sm" onClick={() => logout()}>
            Sign out
          </button>
        </nav>
      </header>

      <main className="page">
        {!hasRealmRole('ntk-operator') && (
          <div className="alert alert-warn small" style={{ marginBottom: 16 }}>
            Your token has no <code>ntk-operator</code> role. The API will refuse these requests: the role is checked
            server-side on the threshold-signed token, and granting it needs a quorum of admins.
          </div>
        )}

        <section className="card">
          <div className="row">
            <h2>The whole document store</h2>
            <span className="spacer" />
            {totals && (
              <span className="pill">
                {totals.documents} documents · {totals.owners} users
              </span>
            )}
            <button className="btn btn-sm" onClick={load}>
              Refresh
            </button>
          </div>
          <p className="sub">
            As the platform operator you can read every row in the database. This is everything a rogue admin, an
            insider or a breach would get.
          </p>
          {error && <div className="alert alert-danger small">{error}</div>}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Category</th>
                  <th>Title (as stored)</th>
                  <th>Body (as stored)</th>
                  <th>Decrypt with my Tide session</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = attempts[r.id]
                  return (
                    <tr key={r.id}>
                      <td className="mono small">
                        {r.owner === me ? <span className="pill pill-accent">you</span> : `${r.owner.slice(0, 8)}…`}
                      </td>
                      <td>{r.category}</td>
                      <td className="ct">{r.titleCt.slice(0, 60)}…</td>
                      <td className="ct">{r.bodyCt.slice(0, 120)}…</td>
                      <td style={{ minWidth: 220 }}>
                        <button className="btn btn-sm" onClick={() => tryDecrypt(r)} disabled={a?.state === 'busy'}>
                          {a?.state === 'busy' ? 'Asking Tide ORKs…' : 'Try to decrypt'}
                        </button>
                        {a?.state === 'refused' && (
                          <div className="alert alert-danger small" style={{ marginTop: 6 }}>
                            🛑 Refused by the Tide network: {a.text}
                          </div>
                        )}
                        {a?.state === 'ok' && (
                          <div className="alert alert-ok small" style={{ marginTop: 6 }}>
                            Decrypted (your own document): {a.text}
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
          <h2>Unleash a server-side AI agent on the database</h2>
          <p className="sub">
            A typical &quot;AI-powered&quot; backend lets its agent read the store directly. Here is what an agent with
            full database access gets from NeedToKnow.
          </p>
          <button className="btn btn-primary btn-sm" onClick={unleash} disabled={rogue.busy}>
            {rogue.busy ? 'Agent is reading the database…' : 'Run rogue agent'}
          </button>
          {rogue.output && (
            <div className="bubble ai" style={{ marginTop: 12 }}>
              <div className="small muted" style={{ marginBottom: 6 }}>
                {rogue.model} · given {rogue.given} raw records
              </div>
              {rogue.output}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Can I just give myself more power?</h2>
          <p className="sub">
            Role changes in this realm are governed by TideCloak IGA. Assigning a role (for example making yourself an
            operator, or granting decrypt rights) creates a change request that needs a quorum of admins (2 of 3), each
            approving in their own Tide enclave. No single admin can push it through.
          </p>
          <a className="btn btn-sm" href={consoleUrl} target="_blank" rel="noreferrer">
            Open Tide admin console ↗
          </a>
        </section>
      </main>
    </>
  )
}
