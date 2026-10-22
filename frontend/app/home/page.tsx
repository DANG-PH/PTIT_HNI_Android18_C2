'use client'

import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Glyph } from '../components/Glyph'
import { ThemeToggle } from '../components/ThemeToggle'
import { DEMO_DOCS, DEMO_QUESTIONS, type Category } from '../lib/demo-docs'
import { LangSwitch, useI18n, type I18nKey } from '../lib/i18n'
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
  const { t, lang } = useI18n()

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

  const name = (getValueFromIdToken('given_name') as string) || (lang === 'vi' ? 'bạn' : 'there')
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
      setVaultMsg(t('vault.encrypting', { n: items.length }))
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
        setVaultMsg(t('vault.stored', { n: items.length }))
      } catch (err) {
        setVaultMsg(errorText(err))
        setVaultState('idle')
      }
    },
    [api, encrypt, loadVault, t],
  )

  const removeDoc = useCallback(
    async (id: string) => {
      await api(`/docs/${id}`, { method: 'DELETE' }).catch((err) => setVaultMsg(errorText(err)))
      await loadVault()
    },
    [api, loadVault],
  )

  const resetVault = useCallback(async () => {
    if (!confirm(t('vault.resetConfirm'))) return
    await api('/docs', { method: 'DELETE' }).catch((err) => setVaultMsg(errorText(err)))
    setTurns([])
    await loadVault()
  }, [api, loadVault, t])

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
          <span className="muted small">{t('nav.hi', { name })}</span>
          {isOperator && (
            <a className="btn btn-sm" href="/operator">
              {t('nav.operator')}
            </a>
          )}
          <button className="btn btn-sm" onClick={() => logout()}>
            {t('nav.signOut')}
          </button>
          <LangSwitch />
          <ThemeToggle />
        </nav>
      </header>

      <main className="page grid">
        <aside>
          <section className="card">
            <div className="row">
              <h2>{t('vault.title')}</h2>
              <span className="spacer" />
              <span className="pill pill-accent"><Glyph name="lock" /> E2EE · Tide</span>
            </div>
            <p className="sub">{t('vault.sub')}</p>

            {locked && docs.length === 0 && (
              <div className="alert alert-warn small" style={{ marginBottom: 10 }}>
                {t('vault.locked')}{' '}
                <button className="btn btn-primary btn-sm" onClick={loadVault}>
                  <Glyph name="unlock" /> {t('vault.unlock')}
                </button>
              </div>
            )}
            {vaultState === 'loading' ? (
              <div className="step">
                <span className="spinner" /> {t('vault.decryptingTitles')}
              </div>
            ) : docs.length === 0 && locked ? null : docs.length === 0 ? (
              <div className="alert alert-ok small">
                {t('vault.empty')}
              </div>
            ) : (
              <ul className="doc-list">
                {docs.map((d) => (
                  <li className="doc" key={d.id}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="title">{d.title}</div>
                      <div className="meta">
                        {t(`cat.${d.category}` as I18nKey)} · {t('vault.bytes', { n: d.bodyBytes })}
                      </div>
                      {showCiphertext && <div className="ct">{d.bodyCt.slice(0, 120)}…</div>}
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => removeDoc(d.id)} disabled={busy} title={t('vault.delete')}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="row" style={{ marginTop: 12 }}>
              {docs.length === 0 && vaultState !== 'loading' && (
                <button className="btn btn-primary btn-sm" onClick={() => addDocs(DEMO_DOCS)} disabled={busy}>
                  {t('vault.loadDemo')}
                </button>
              )}
              <button className="btn btn-sm" onClick={() => setAdding((a) => !a)} disabled={busy}>
                {adding ? t('vault.cancel') : t('vault.add')}
              </button>
              {docs.length > 0 && (
                <label className="switch" style={{ margin: 0 }}>
                  <input type="checkbox" checked={showCiphertext} onChange={(e) => setShowCiphertext(e.target.checked)} />
                  {t('vault.serverSees')}
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
                <label htmlFor="title">{t('vault.form.title')}</label>
                <input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                <label htmlFor="category">{t('vault.form.category')}</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`cat.${c}` as I18nKey)}
                    </option>
                  ))}
                </select>
                <label htmlFor="body">{t('vault.form.content')}</label>
                <textarea id="body" rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} disabled={busy}>
                  {t('vault.form.submit')}
                </button>
              </form>
            )}
            {docs.length > 0 && (
              <button className="btn btn-sm btn-danger" style={{ marginTop: 12 }} onClick={resetVault} disabled={busy}>
                {t('vault.reset')}
              </button>
            )}
          </section>
        </aside>

        <section className="card">
          <div className="tabs">
            <button className={`tab ${tab === 'ask' ? 'active' : ''}`} onClick={() => setTab('ask')}>
              {t('tab.ask')}
            </button>
            <button className={`tab ${tab === 'receipts' ? 'active' : ''}`} onClick={() => setTab('receipts')}>
              {t('tab.receipts')}
            </button>
          </div>

          {tab === 'ask' ? (
            <>
              <div className="thread">
                {turns.length === 0 && (
                  <p className="sub">{t('ask.intro')}</p>
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
                  placeholder={t('ask.placeholder')}
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
                    {t('ask.submit')}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setQuestion(DEMO_QUESTIONS[lang].surgery)}>
                    {t('ask.trySurgery')}
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setQuestion(DEMO_QUESTIONS[lang].invoice)}>
                    {t('ask.tryInvoice')}
                  </button>
                  <span className="spacer" />
                  <label className="switch" style={{ margin: 0 }} title={t('ask.hijackHint')}>
                    <input type="checkbox" checked={hijacked} onChange={(e) => setHijacked(e.target.checked)} />
                    <span>
                      {t('ask.simulate')} <strong style={{ color: 'var(--danger)' }}>{t('ask.hijacked')}</strong>
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
  const { t: tr } = useI18n()
  const many = (t.plan?.needed.length ?? 0) > 3
  return (
    <>
      <div className="bubble user">
        {t.question}
        {t.hijacked && <div className="small" style={{ opacity: 0.85, marginTop: 4 }}><Glyph name="alert" /> {tr('turn.hijackedTag')}</div>}
      </div>

      {t.phase === 'planning' && <Step>{tr('turn.planning')}</Step>}

      {t.plan && t.plan.needed.length > 0 && (
        <div className={`consent ${many ? 'flagged' : ''}`}>
          <h3>
            <Glyph name="bot" /> {tr('turn.asks', { n: t.plan.needed.length, total })}
          </h3>
          {t.plan.message && <p className="small" style={{ margin: '0 0 8px' }}>{t.plan.message}</p>}
          {many && (
            <div className="alert alert-danger small" style={{ marginBottom: 8 }}>
              {tr('turn.tooMany')}
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
                {tr('turn.release', { n: t.selection.length })}
              </button>
              <button className="btn btn-sm" onClick={props.onDeny}>
                {tr('turn.deny')}
              </button>
            </div>
          )}
        </div>
      )}

      {t.phase === 'decrypting' && <Step>{tr('turn.decrypting')}</Step>}
      {t.phase === 'answering' && <Step>{tr('turn.answering', { n: t.released.length })}</Step>}
      {t.phase === 'denied' && <div className="alert alert-ok small">{tr('turn.denied')}</div>}
      {t.phase === 'error' && <div className="alert alert-danger small">{tr('turn.error', { msg: t.error ?? '' })}</div>}

      {t.answer && (
        <>
          {t.answer.toolCalls.length > 0 && (
            <div className="alert alert-danger small">
              <Glyph name="stop" /> {tr('turn.toolCallsBefore')} <code>{t.answer.toolCalls.join(', ')}</code>. {tr('turn.toolCallsAfter')}
            </div>
          )}
          {t.answer.injectionSuspected && (
            <div className="alert alert-warn small">
              <Glyph name="alert" /> {tr('turn.injection')} {t.answer.injectionNote}
            </div>
          )}
          {t.answer.blockedLinks.length > 0 && (
            <div className="alert alert-danger small">
              <Glyph name="link" /> {tr('turn.links', { n: t.answer.blockedLinks.length })}{' '}
              <code>{t.answer.blockedLinks.join(' ')}</code>
            </div>
          )}
          <div className="bubble ai">
            <RichAnswer text={t.answer.answer} titles={titles} />
            {t.released.length > 0 && (
              <div className="row small muted" style={{ marginTop: 10 }}>
                {tr('turn.sawOnly')}
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
              <h3>
                <Glyph name="alert" /> {tr('turn.followTitle', { n: t.answer.followUps.length })}
              </h3>
              <p className="small" style={{ margin: '0 0 8px' }}>
                {tr('turn.followBody')}{' '}
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
                  {tr('turn.denyAll')}
                </button>
                <button
                  className="btn btn-sm"
                  onClick={props.onReleaseFollowUps}
                  disabled={!t.followUpSelection.length}
                >
                  {tr('turn.releaseSelected')}
                </button>
              </div>
            </div>
          )}
          {t.followUpsResolved === 'denied' && (
            <div className="alert alert-ok small">
              {tr('turn.followDenied')}
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
  const { t } = useI18n()
  if (loading) return <Step>{t('receipts.loading')}</Step>
  if (!receipts.length) return <p className="sub">{t('receipts.empty')}</p>
  const label = { index: t('receipts.index'), disclosure: t('receipts.disclosure'), denied: t('receipts.denied') }
  const pill = { index: 'pill', disclosure: 'pill pill-warn', denied: 'pill pill-ok' } as const
  return (
    <>
      <p className="sub">{t('receipts.sub')}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('receipts.when')}</th>
              <th>{t('receipts.what')}</th>
              <th>{t('receipts.docs')}</th>
              <th>{t('receipts.question')}</th>
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
                    ? t('receipts.titles', { n: r.docIds.length })
                    : r.docIds.map((id) => (titles.get(id) ?? t('receipts.deleted')).split(':')[0]).join(', ')}
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
