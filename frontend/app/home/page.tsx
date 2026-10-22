'use client'

import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEMO_DOCS, DEMO_QUESTION, INJECTION_QUESTION, type Category } from '../lib/demo-docs'
import {
  errorText,
  useApi,
  useVaultCrypto,
  type AnswerResult,
  type PlanResult,
  type Receipt,
  type StoredDoc,
} from '../lib/vault'

interface VaultDoc extends StoredDoc {
  title: string
}

type Phase = 'planning' | 'consent' | 'decrypting' | 'answering' | 'done' | 'denied' | 'error'

interface Turn {
  id: number
  question: string
  hijacked: boolean
  phase: Phase
  questionCt?: Promise<string | undefined>
  plan?: PlanResult
  selection: string[]
  /** Plaintext released for this turn only. Never persisted. */
  released: { id: string; title: string; category: string; content: string }[]
  answer?: AnswerResult
  followUpSelection: string[]
  followUpsResolved?: 'approved' | 'denied'
  error?: string
}

const CATEGORIES: Category[] = ['health', 'insurance', 'finance', 'legal', 'identity', 'other']

export default function HomePage() {
  const { authenticated, isInitializing, logout, hasRealmRole, getValueFromIdToken } = useTideCloak()
  const router = useRouter()
  const api = useApi()
  const { encrypt, decrypt } = useVaultCrypto()

  const [docs, setDocs] = useState<VaultDoc[]>([])
  const [vaultState, setVaultState] = useState<'idle' | 'loading' | 'working'>('loading')
  const [vaultMsg, setVaultMsg] = useState('')
  const [showCiphertext, setShowCiphertext] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'health' as Category, body: '' })

  const [tab, setTab] = useState<'ask' | 'receipts'>('ask')
  const [question, setQuestion] = useState('')
  const [hijacked, setHijacked] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])

  const [receipts, setReceipts] = useState<(Receipt & { question?: string })[]>([])
  const [receiptsState, setReceiptsState] = useState<'idle' | 'loading'>('idle')

  const name = (getValueFromIdToken('given_name') as string) || 'there'
  const isOperator = hasRealmRole('ntk-operator')
  const titles = useMemo(() => new Map(docs.map((d) => [d.id, d.title])), [docs])
  const index = useMemo(() => docs.map((d) => ({ id: d.id, title: d.title, category: d.category })), [docs])

  useEffect(() => {
    if (!isInitializing && !authenticated) router.push('/')
  }, [authenticated, isInitializing, router])

  const [locked, setLocked] = useState(false)

  const loadVault = useCallback(async () => {
    setVaultState('loading')
    setVaultMsg('')
    setLocked(false)
    try {
      const stored = await api<StoredDoc[]>('/docs')
      // Titles are ciphertext too: decrypt them in one threshold call. Bodies stay sealed until released.
      // If the hidden enclave can't open, the SDK falls back to a popup, which browsers block without a
      // click, so after a while we offer an explicit Unlock button (a real user gesture).
      const slow = setTimeout(() => setLocked(true), 12_000)
      const plain = await decrypt(stored.map((d) => d.titleCt)).finally(() => clearTimeout(slow))
      setDocs(stored.map((d, i) => ({ ...d, title: plain[i] })))
      setLocked(false)
    } catch (err) {
      setVaultMsg(errorText(err))
      setLocked(true)
    } finally {
      setVaultState('idle')
    }
  }, [api, decrypt])

  useEffect(() => {
    if (authenticated) loadVault()
  }, [authenticated, loadVault])

  const addDocs = useCallback(
    async (items: { title: string; category: Category; body: string }[]) => {
      setVaultState('working')
      setVaultMsg(`Encrypting ${items.length} document(s) in your browser via Tide…`)
      try {
        const cts = await encrypt(items.flatMap((d) => [d.title, d.body]))
        for (let i = 0; i < items.length; i++) {
          await api('/docs', {
            method: 'POST',
            body: JSON.stringify({
              category: items[i].category,
              titleCt: cts[2 * i],
              bodyCt: cts[2 * i + 1],
              bodyBytes: new TextEncoder().encode(items[i].body).length,
            }),
          })
        }
        await loadVault()
        setVaultMsg(`Stored ${items.length} document(s). The server only received ciphertext.`)
      } catch (err) {
        setVaultMsg(errorText(err))
        setVaultState('idle')
      }
    },
    [api, encrypt, loadVault],
  )

  const removeDoc = useCallback(
    async (id: string) => {
      await api(`/docs/${id}`, { method: 'DELETE' }).catch((err) => setVaultMsg(errorText(err)))
      await loadVault()
    },
    [api, loadVault],
  )

  const resetVault = useCallback(async () => {
    if (!confirm('Delete all your documents and receipts?')) return
    await api('/docs', { method: 'DELETE' }).catch((err) => setVaultMsg(errorText(err)))
    setTurns([])
    await loadVault()
  }, [api, loadVault])

  const updateTurn = useCallback((id: number, patch: Partial<Turn> | ((t: Turn) => Partial<Turn>)) => {
    setTurns((all) => all.map((t) => (t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t)))
  }, [])

  const ask = useCallback(
    async (q: string) => {
      const text = q.trim()
      if (!text) return
      const id = Date.now()
      // The question is kept in the receipt ledger encrypted under the user's own key.
      const questionCt = encrypt([text]).then(
        ([ct]) => ct,
        () => undefined,
      )
      setTurns((all) => [
        ...all,
        { id, question: text, hijacked, phase: 'planning', questionCt, selection: [], released: [], followUpSelection: [] },
      ])
      setQuestion('')
      try {
        const plan = await api<PlanResult>('/ai/plan', {
          method: 'POST',
          body: JSON.stringify({ question: text, index, hijacked }),
        })
        updateTurn(id, { plan, phase: plan.needed.length ? 'consent' : 'done', selection: plan.needed.map((n) => n.id) })
        if (!plan.needed.length) {
          updateTurn(id, {
            answer: {
              answer: plan.message,
              citations: [],
              followUps: [],
              injectionSuspected: false,
              injectionNote: '',
              toolCalls: [],
              blockedLinks: [],
            },
          })
        }
      } catch (err) {
        updateTurn(id, { phase: 'error', error: errorText(err) })
      }
    },
    [api, encrypt, hijacked, index, updateTurn],
  )

  /** Decrypts exactly the approved documents (live threshold call) and sends them for this answer only. */
  const release = useCallback(
    async (turn: Turn, ids: string[], previous: Turn['released']) => {
      updateTurn(turn.id, { phase: 'decrypting' })
      try {
        const chosen = docs.filter((d) => ids.includes(d.id))
        const bodies = await decrypt(chosen.map((d) => d.bodyCt))
        const released = [
          ...previous,
          ...chosen.map((d, i) => ({ id: d.id, title: d.title, category: d.category, content: bodies[i] })),
        ]
        updateTurn(turn.id, { phase: 'answering', released })
        const answer = await api<AnswerResult>('/ai/answer', {
          method: 'POST',
          body: JSON.stringify({
            question: turn.question,
            questionCt: await turn.questionCt,
            approved: released,
            index,
            hijacked: turn.hijacked,
          }),
        })
        updateTurn(turn.id, {
          phase: 'done',
          answer,
          followUpSelection: [],
          followUpsResolved: undefined,
        })
      } catch (err) {
        updateTurn(turn.id, { phase: 'error', error: errorText(err) })
      }
    },
    [api, decrypt, docs, index, updateTurn],
  )

  const deny = useCallback(
    async (turn: Turn, ids: string[], note: string, final: boolean) => {
      await api('/receipts/denial', { method: 'POST', body: JSON.stringify({ docIds: ids, note }) }).catch(() => {})
      updateTurn(turn.id, final ? { phase: 'denied' } : { followUpsResolved: 'denied' })
    },
    [api, updateTurn],
  )

  const loadReceipts = useCallback(async () => {
    setReceiptsState('loading')
    try {
      const list = await api<Receipt[]>('/receipts')
      const withQ = list.filter((r) => r.questionCt)
      const questions = await decrypt(withQ.map((r) => r.questionCt!)).catch(() => [] as string[])
      const byId = new Map(withQ.map((r, i) => [r.id, questions[i]]))
      setReceipts(list.map((r) => ({ ...r, question: byId.get(r.id) })))
    } catch (err) {
      setVaultMsg(errorText(err))
    } finally {
      setReceiptsState('idle')
    }
  }, [api, decrypt])

  useEffect(() => {
    if (tab === 'receipts' && authenticated) loadReceipts()
  }, [tab, authenticated, loadReceipts])

  const busy = vaultState !== 'idle'

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">N</span> NeedToKnow
        </div>
        <nav>
          <span className="muted small">Hi, {name}</span>
          {isOperator && (
            <a className="btn btn-sm" href="/operator">
              Operator console
            </a>
          )}
          <button className="btn btn-sm" onClick={() => logout()}>
            Sign out
          </button>
        </nav>
      </header>

      <main className="page grid">
        <aside>
          <section className="card">
            <div className="row">
              <h2>Your vault</h2>
              <span className="spacer" />
              <span className="pill pill-accent">🔐 E2EE · Tide</span>
            </div>
            <p className="sub">
              Encrypted in your browser. The server stores ciphertext only; decrypting needs your live Tide session.
            </p>

            {locked && docs.length === 0 && (
              <div className="alert alert-warn small" style={{ marginBottom: 10 }}>
                Tide needs your go-ahead to open its secure enclave.{' '}
                <button className="btn btn-primary btn-sm" onClick={loadVault}>
                  🔓 Unlock vault
                </button>
              </div>
            )}
            {vaultState === 'loading' ? (
              <div className="step">
                <span className="spinner" /> Decrypting titles via Tide…
              </div>
            ) : docs.length === 0 && locked ? null : docs.length === 0 ? (
              <div className="alert alert-ok small">
                Empty vault. Load Linh&apos;s synthetic documents to try the demo.
              </div>
            ) : (
              <ul className="doc-list">
                {docs.map((d) => (
                  <li className="doc" key={d.id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="title">{d.title}</div>
                      <div className="meta">
                        {d.category} · {d.bodyBytes} bytes
                      </div>
                      {showCiphertext && <div className="ct">{d.bodyCt.slice(0, 120)}…</div>}
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => removeDoc(d.id)} disabled={busy} title="Delete">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="row" style={{ marginTop: 12 }}>
              {docs.length === 0 && vaultState !== 'loading' && (
                <button className="btn btn-primary btn-sm" onClick={() => addDocs(DEMO_DOCS)} disabled={busy}>
                  Load demo documents
                </button>
              )}
              <button className="btn btn-sm" onClick={() => setAdding((a) => !a)} disabled={busy}>
                {adding ? 'Cancel' : '+ Add document'}
              </button>
              {docs.length > 0 && (
                <label className="switch" style={{ margin: 0 }}>
                  <input type="checkbox" checked={showCiphertext} onChange={(e) => setShowCiphertext(e.target.checked)} />
                  What the server sees
                </label>
              )}
            </div>
            {vaultMsg && <p className="small muted" style={{ marginBottom: 0 }}>{vaultMsg}</p>}

            {adding && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!form.title.trim() || !form.body.trim()) return
                  addDocs([{ ...form, title: form.title.trim() }]).then(() => {
                    setForm({ title: '', category: 'health', body: '' })
                    setAdding(false)
                  })
                }}
              >
                <label htmlFor="title">Title</label>
                <input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <label htmlFor="body">Content</label>
                <textarea id="body" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} disabled={busy}>
                  Encrypt &amp; store
                </button>
              </form>
            )}
            {docs.length > 0 && (
              <button className="btn btn-sm btn-danger" style={{ marginTop: 12 }} onClick={resetVault} disabled={busy}>
                Reset demo
              </button>
            )}
          </section>
        </aside>

        <section className="card">
          <div className="tabs">
            <button className={`tab ${tab === 'ask' ? 'active' : ''}`} onClick={() => setTab('ask')}>
              Ask AI
            </button>
            <button className={`tab ${tab === 'receipts' ? 'active' : ''}`} onClick={() => setTab('receipts')}>
              Disclosure receipts
            </button>
          </div>

          {tab === 'ask' ? (
            <>
              <div className="thread">
                {turns.length === 0 && (
                  <p className="sub">
                    The AI starts with the <strong>titles</strong> of your documents only. It asks for what it needs, and
                    you decide what it reads.
                  </p>
                )}
                {turns.map((t) => (
                  <TurnView
                    key={t.id}
                    turn={t}
                    titles={titles}
                    total={docs.length}
                    onToggle={(docId) =>
                      updateTurn(t.id, (cur) => ({
                        selection: cur.selection.includes(docId)
                          ? cur.selection.filter((x) => x !== docId)
                          : [...cur.selection, docId],
                      }))
                    }
                    onToggleFollowUp={(docId) =>
                      updateTurn(t.id, (cur) => ({
                        followUpSelection: cur.followUpSelection.includes(docId)
                          ? cur.followUpSelection.filter((x) => x !== docId)
                          : [...cur.followUpSelection, docId],
                      }))
                    }
                    onRelease={() => release(t, t.selection, [])}
                    onDeny={() => deny(t, t.plan?.needed.map((n) => n.id) ?? [], 'Initial request denied', true)}
                    onReleaseFollowUps={() => {
                      updateTurn(t.id, { followUpsResolved: 'approved' })
                      release(t, t.followUpSelection, t.released)
                    }}
                    onDenyFollowUps={() =>
                      deny(t, t.answer?.followUps.map((f) => f.id) ?? [], 'Follow-up request after reading documents', false)
                    }
                  />
                ))}
              </div>

              <form
                style={{ marginTop: 16 }}
                onSubmit={(e) => {
                  e.preventDefault()
                  ask(question)
                }}
              >
                <textarea
                  rows={2}
                  placeholder="Ask about your documents…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      ask(question)
                    }
                  }}
                />
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary" disabled={!question.trim() || docs.length === 0}>
                    Ask
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setQuestion(DEMO_QUESTION)}>
                    Try: surgery cost
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setQuestion(INJECTION_QUESTION)}>
                    Try: physio invoice
                  </button>
                  <span className="spacer" />
                  <label className="switch" style={{ margin: 0 }} title="Red-team mode: the model is instructed to act as a hijacked exfiltration agent">
                    <input type="checkbox" checked={hijacked} onChange={(e) => setHijacked(e.target.checked)} />
                    <span>
                      Simulate <strong style={{ color: 'var(--danger)' }}>hijacked AI</strong>
                    </span>
                  </label>
                </div>
              </form>
            </>
          ) : (
            <ReceiptsView receipts={receipts} titles={titles} loading={receiptsState === 'loading'} />
          )}
        </section>
      </main>
    </>
  )
}

function TurnView(props: {
  turn: Turn
  titles: Map<string, string>
  total: number
  onToggle: (id: string) => void
  onToggleFollowUp: (id: string) => void
  onRelease: () => void
  onDeny: () => void
  onReleaseFollowUps: () => void
  onDenyFollowUps: () => void
}) {
  const { turn: t, titles, total } = props
  const many = (t.plan?.needed.length ?? 0) > 3
  return (
    <>
      <div className="bubble user">
        {t.question}
        {t.hijacked && <div className="small" style={{ opacity: 0.85, marginTop: 4 }}>⚠ hijacked-AI simulation</div>}
      </div>

      {t.phase === 'planning' && <Step>AI is reading the titles of your documents…</Step>}

      {t.plan && t.plan.needed.length > 0 && (
        <div className={`consent ${many ? 'flagged' : ''}`}>
          <h3>
            🤖 The AI asks to read {t.plan.needed.length} of your {total} documents
          </h3>
          {t.plan.message && <p className="small" style={{ margin: '0 0 8px' }}>{t.plan.message}</p>}
          {many && (
            <div className="alert alert-danger small" style={{ marginBottom: 8 }}>
              That is a lot of documents for one question. Only release what is clearly needed.
            </div>
          )}
          {t.plan.needed.map((n) => (
            <label className="consent-item" key={n.id}>
              <input
                type="checkbox"
                checked={t.selection.includes(n.id)}
                onChange={() => props.onToggle(n.id)}
                disabled={t.phase !== 'consent'}
              />
              <span>
                <strong>{titles.get(n.id) ?? n.id}</strong>
                <br />
                <span className="reason">{n.reason}</span>
              </span>
            </label>
          ))}
          {t.phase === 'consent' && (
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={props.onRelease} disabled={!t.selection.length}>
                Release {t.selection.length} for this question
              </button>
              <button className="btn btn-sm" onClick={props.onDeny}>
                Deny
              </button>
            </div>
          )}
        </div>
      )}

      {t.phase === 'decrypting' && <Step>Threshold decryption on the Tide network (your session, your key)…</Step>}
      {t.phase === 'answering' && <Step>Released {t.released.length} document(s) to the AI for this answer…</Step>}
      {t.phase === 'denied' && <div className="alert alert-ok small">Denied. The AI read nothing. Logged in your receipts.</div>}
      {t.phase === 'error' && <div className="alert alert-danger small">Error: {t.error}</div>}

      {t.answer && (
        <>
          {t.answer.toolCalls.length > 0 && (
            <div className="alert alert-danger small">
              🛑 The AI tried to run <code>{t.answer.toolCalls.join(', ')}</code>. NeedToKnow gives the AI no tools and no
              keys: the server holds only ciphertext, so there was nothing to export.
            </div>
          )}
          {t.answer.injectionSuspected && (
            <div className="alert alert-warn small">
              ⚠ Hidden instructions found inside a document: {t.answer.injectionNote}
            </div>
          )}
          {t.answer.blockedLinks.length > 0 && (
            <div className="alert alert-danger small">
              🔗 Removed {t.answer.blockedLinks.length} external link(s) from the answer:{' '}
              <code>{t.answer.blockedLinks.join(' ')}</code>
            </div>
          )}
          <div className="bubble ai">
            <RichAnswer text={t.answer.answer} titles={titles} />
            {t.released.length > 0 && (
              <div className="row small muted" style={{ marginTop: 10 }}>
                AI saw only:
                {t.released.map((r) => (
                  <span key={r.id} className="pill pill-accent">
                    {r.title.split(':')[0]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {t.answer.followUps.length > 0 && !t.followUpsResolved && (
            <div className="consent flagged">
              <h3>⚠ After reading your documents, the AI wants {t.answer.followUps.length} more</h3>
              <p className="small" style={{ margin: '0 0 8px' }}>
                Text inside a document can steer an AI. These were requested after it read:{' '}
                <strong>{t.released.map((r) => r.title.split(':')[0]).join(', ')}</strong>.
              </p>
              {t.answer.followUps.map((n) => (
                <label className="consent-item" key={n.id}>
                  <input
                    type="checkbox"
                    checked={t.followUpSelection.includes(n.id)}
                    onChange={() => props.onToggleFollowUp(n.id)}
                  />
                  <span>
                    <strong>{titles.get(n.id) ?? n.id}</strong>
                    <br />
                    <span className="reason">{n.reason}</span>
                  </span>
                </label>
              ))}
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn-sm" onClick={props.onDenyFollowUps}>
                  Deny all
                </button>
                <button
                  className="btn btn-sm"
                  onClick={props.onReleaseFollowUps}
                  disabled={!t.followUpSelection.length}
                >
                  Release selected
                </button>
              </div>
            </div>
          )}
          {t.followUpsResolved === 'denied' && (
            <div className="alert alert-ok small">
              Follow-up denied. Those documents stayed sealed: no key exists that the AI or the server could use instead.
            </div>
          )}
        </>
      )}
    </>
  )
}

function Step({ children }: { children: ReactNode }) {
  return (
    <div className="step">
      <span className="spinner" /> {children}
    </div>
  )
}

/** Plain-text rendering with [doc:ID] citations and **bold**. No HTML, links or images are ever rendered. */
function RichAnswer({ text, titles }: { text: string; titles: Map<string, string> }) {
  const parts = text.replace(/^\s*[*-]\s+/gm, '• ').split(/(\[doc:[^\]]+\]|\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((p, i) => {
        const cite = p.match(/^\[doc:([^\]]+)\]$/)
        if (cite) {
          const ids = cite[1].split(/,\s*(?:doc:)?/)
          return (
            <Fragment key={i}>
              {ids.map((id) => (
                <span key={id} className="cite">
                  {(titles.get(id.trim()) ?? 'doc').split(':')[0]}
                </span>
              ))}
            </Fragment>
          )
        }
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
        return <Fragment key={i}>{p}</Fragment>
      })}
    </>
  )
}

function ReceiptsView({
  receipts,
  titles,
  loading,
}: {
  receipts: (Receipt & { question?: string })[]
  titles: Map<string, string>
  loading: boolean
}) {
  if (loading) return <Step>Loading receipts and decrypting your questions…</Step>
  if (!receipts.length) return <p className="sub">No disclosures yet.</p>
  const label = { index: 'Titles shared', disclosure: 'Content disclosed', denied: 'Denied' } as const
  const pill = { index: 'pill', disclosure: 'pill pill-warn', denied: 'pill pill-ok' } as const
  return (
    <>
      <p className="sub">
        Every time the AI saw anything. Questions are stored encrypted under your key; the server can&apos;t read this
        ledger either.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>What</th>
              <th>Documents</th>
              <th>Question</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td className="muted">{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <span className={pill[r.kind]}>{label[r.kind]}</span>
                  {r.model && <div className="small muted">{r.model}</div>}
                </td>
                <td>
                  {r.kind === 'index'
                    ? `${r.docIds.length} titles`
                    : r.docIds.map((id) => (titles.get(id) ?? 'deleted').split(':')[0]).join(', ')}
                  {r.note && <div className="small muted">{r.note}</div>}
                </td>
                <td>{r.question ?? <span className="muted">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
