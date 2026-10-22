'use client'

import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DemoGuide, type GuideStep } from '../components/DemoGuide'
import { Glyph, type GlyphName } from '../components/Glyph'
import { ThresholdRing } from '../components/ThresholdRing'
import { ThemeToggle } from '../components/ThemeToggle'
import { DEMO_DOCS, DEMO_PERSONA, DEMO_QUESTIONS, type Category } from '../lib/demo-docs'
import { MAX_DOC_CHARS, readFileText } from '../lib/file-text'
import { LangSwitch, useI18n, type I18nKey } from '../lib/i18n'
import { redact } from '../lib/redact'
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
  /** Mask names and identifiers in the browser before anything is sent to the AI. */
  mask: boolean
  masked?: number
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
const CATEGORY_GLYPH: Record<string, GlyphName> = {
  health: 'heart',
  insurance: 'shield',
  finance: 'wallet',
  legal: 'file',
  identity: 'id',
  other: 'file',
}

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
  const [fileNote, setFileNote] = useState('')

  /** Fills the form from a file. Extraction runs in the browser; nothing is sent until "Encrypt & store". */
  const pickFile = async (file: File) => {
    setFileNote(t('vault.form.reading'))
    try {
      let text = (await readFileText(file)).replace(/[ \t]+\n/g, '\n').trim()
      if (!text) return setFileNote(t('vault.form.noText'))
      const trimmed = text.length > MAX_DOC_CHARS
      if (trimmed) text = text.slice(0, MAX_DOC_CHARS)
      setForm((f) => ({ ...f, title: f.title || file.name.replace(/\.[^.]+$/, ''), body: text }))
      setFileNote(t(trimmed ? 'vault.form.trimmed' : 'vault.form.loaded', { name: file.name, n: text.length }))
    } catch (err) {
      setFileNote(errorText(err))
    }
  }

  const [tab, setTab] = useState<'ask' | 'receipts'>('ask')
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const threadRef = useRef<HTMLDivElement>(null)
  // Keep the newest step of the conversation in view inside the chat panel.
  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [turns])

  const [receipts, setReceipts] = useState<(Receipt & { question?: string })[]>([])
  const [receiptsState, setReceiptsState] = useState<'idle' | 'loading'>('idle')

  const isOperator = hasRealmRole('ntk-operator')
  const titles = useMemo(() => new Map(docs.map((d) => [d.id, d.title])), [docs])
  const index = useMemo(() => docs.map((d) => ({ id: d.id, title: d.title, category: d.category })), [docs])
  const ownNames = useMemo(
    () =>
      [DEMO_PERSONA, getValueFromIdToken('given_name'), getValueFromIdToken('family_name')].filter(
        (n): n is string => typeof n === 'string' && n.length > 1,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authenticated],
  )
  /** The title index the AI plans with. Names in titles are masked too when masking is on. */
  const aiIndex = useCallback(
    (mask: boolean) => (mask ? index.map((e) => ({ ...e, title: redact(e.title, ownNames).text })) : index),
    [index, ownNames],
  )

  useEffect(() => {
    if (!isInitializing && !authenticated) router.push('/')
  }, [authenticated, isInitializing, router])

  const [locked, setLocked] = useState(false)
  /** Documents on the server, decrypted or not: step 1 is done even if titles are still sealed. */
  const [storedCount, setStoredCount] = useState(0)

  const loadVault = useCallback(async () => {
    setVaultState('loading')
    setVaultMsg('')
    setLocked(false)
    try {
      const stored = await api<StoredDoc[]>('/docs')
      setStoredCount(stored.length)
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
    async (q: string, opts: { hijacked?: boolean } = {}) => {
      const text = q.trim()
      if (!text) return
      const id = Date.now()
      const hijacked = !!opts.hijacked
      // The question is kept in the receipt ledger encrypted under the user's own key.
      const questionCt = encrypt([text]).then(
        ([ct]) => ct,
        () => undefined,
      )
      setTurns((all) => [
        ...all,
        { id, question: text, hijacked, mask: true, phase: 'planning', questionCt, selection: [], released: [], followUpSelection: [] },
      ])
      setQuestion('')
      requestAnimationFrame(() => document.getElementById(`turn-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      try {
        const plan = await api<PlanResult>('/ai/plan', {
          method: 'POST',
          body: JSON.stringify({ question: text, index: aiIndex(true), hijacked }),
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
    [api, encrypt, aiIndex, updateTurn],
  )

  /** Decrypts exactly the approved documents (live threshold call) and sends them for this answer only. */
  const release = useCallback(
    async (turn: Turn, ids: string[], previous: Turn['released']) => {
      updateTurn(turn.id, { phase: 'decrypting' })
      try {
        const chosen = docs.filter((d) => ids.includes(d.id))
        const bodies = await decrypt(chosen.map((d) => d.bodyCt))
        // Minimisation happens here, in the browser, after decryption and before anything leaves it.
        let masked = 0
        const released = [
          ...previous,
          ...chosen.map((d, i) => {
            if (!turn.mask) return { id: d.id, title: d.title, category: d.category, content: bodies[i] }
            const title = redact(d.title, ownNames)
            const body = redact(bodies[i], ownNames)
            masked += title.count + body.count
            return { id: d.id, title: title.text, category: d.category, content: body.text }
          }),
        ]
        updateTurn(turn.id, (cur) => ({ phase: 'answering', released, masked: (cur.masked ?? 0) + masked }))
        const answer = await api<AnswerResult>('/ai/answer', {
          method: 'POST',
          body: JSON.stringify({
            question: turn.question,
            questionCt: await turn.questionCt,
            approved: released,
            index: aiIndex(turn.mask),
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
    [api, decrypt, docs, aiIndex, ownNames, updateTurn],
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
  const inFlight = turns.some((x) => x.phase === 'planning' || x.phase === 'decrypting' || x.phase === 'answering')
  const runGuided = (q: string, hijacked = false) => {
    setTab('ask')
    ask(q, { hijacked })
  }
  const guide: GuideStep[] = [
    {
      key: 'vault',
      title: t('guide.s1.title'),
      body: t('guide.s1.body'),
      done: storedCount > 0,
      action: { label: t('vault.loadDemo'), onClick: () => addDocs(DEMO_DOCS), disabled: busy },
    },
    {
      key: 'consent',
      title: t('guide.s2.title'),
      body: t('guide.s2.body'),
      done: turns.some((x) => !x.hijacked && !!x.answer),
      action: { label: t('guide.s2.action'), onClick: () => runGuided(DEMO_QUESTIONS[lang].surgery), disabled: !docs.length || busy || inFlight },
    },
    {
      key: 'redteam',
      title: t('guide.s3.title'),
      body: t('guide.s3.body'),
      done: turns.some((x) => x.hijacked && !!x.answer),
      action: { label: t('guide.s3.action'), onClick: () => runGuided(DEMO_QUESTIONS[lang].invoice, true), disabled: !docs.length || busy || inFlight },
    },
    {
      key: 'operator',
      title: t('guide.s4.title'),
      body: t('guide.s4.body'),
      done: false,
      action: isOperator ? { label: t('guide.s4.action'), href: '/operator' } : { label: t('guide.s4.noRole'), disabled: true },
    },
  ]

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark brand-logo" src="/logo.png" alt="" width={30} height={30} /> NeedToKnow
        </div>
        <nav>
          <span className="pill">
            <Glyph name="lock" /> {t('nav.signedIn')}
          </span>
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

      <main className="page app">
        <div className="workspace">
        <aside className="vault-col">
          <section className="card vault-card">
            <div className="row">
              <h2>{t('vault.title')}</h2>
              <span className="spacer" />
              <span className="pill pill-accent"><Glyph name="lock" /> E2EE · Tide</span>
            </div>
            <p className="sub">{t('vault.sub')}</p>

            <div className="vault-scroll">
            {/* The form opens at the top of the list so it is in view without scrolling. */}
            {adding && (
              <form
                className="add-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!form.title.trim() || !form.body.trim()) return
                  addDocs([{ ...form, title: form.title.trim() }]).then(() => {
                    setForm({ title: '', category: 'health', body: '' })
                    setFileNote('')
                    setAdding(false)
                  })
                }}
              >
                <label
                  className="file-pick"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0])
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) pickFile(e.target.files[0])
                      e.target.value = ''
                    }}
                  />
                  <Glyph name="file" /> {t('vault.form.file')}
                  <span>{t('vault.form.fileHint')}</span>
                </label>
                {fileNote && <p className="small muted file-note">{fileNote}</p>}
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
            {locked && docs.length === 0 && (
              <div className="alert alert-warn small" style={{ marginBottom: 10 }}>
                {t('vault.locked')}{' '}
                <button className="btn btn-primary btn-sm" onClick={loadVault}>
                  <Glyph name="unlock" /> {t('vault.unlock')}
                </button>
              </div>
            )}
            {vaultState === 'loading' ? (
              <div className="ring-row">
                <ThresholdRing state="working" size="sm" />
                <p>{t('vault.decryptingTitles')}</p>
              </div>
            ) : docs.length === 0 && locked ? null : docs.length === 0 ? (
              <p className="sub" style={{ marginBottom: 0 }}>{t('vault.empty')}</p>
            ) : (
              <ul className="doc-list">
                {docs.map((d) => (
                  <li className="doc" key={d.id}>
                    <span className="doc-icon" aria-hidden="true">
                      <Glyph name={CATEGORY_GLYPH[d.category] ?? 'file'} />
                      <span className="doc-lock">
                        <Glyph name="lock" />
                      </span>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="title" title={d.title}>{d.title}</div>
                      <div className="meta">
                        {t(`cat.${d.category}` as I18nKey)} · {t('vault.bytes', { n: d.bodyBytes })}
                      </div>
                      {showCiphertext && <div className="ct">{d.bodyCt.slice(0, 120)}…</div>}
                    </div>
                    <button className="btn btn-sm btn-danger doc-delete" onClick={() => removeDoc(d.id)} disabled={busy} title={t('vault.delete')} aria-label={t('vault.delete')}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            </div>
            <div className="vault-foot">
            <div className="row">
              <button
                className="btn btn-sm"
                onClick={() => {
                  setAdding((a) => !a)
                  setFileNote('')
                }}
                disabled={busy}
              >
                {adding ? t('vault.cancel') : t('vault.add')}
              </button>
              {docs.length > 0 && (
                <label className="switch" style={{ margin: 0 }}>
                  <input type="checkbox" checked={showCiphertext} onChange={(e) => setShowCiphertext(e.target.checked)} />
                  <Glyph name="eye" /> {t('vault.serverSees')}
                </label>
              )}
            </div>
            {vaultState === 'working' ? (
              <div className="ring-row" style={{ marginTop: 12 }}>
                <ThresholdRing state="working" size="sm" />
                <p>{t('ring.sealing')}</p>
              </div>
            ) : (
              vaultMsg && <p className="small muted" style={{ marginBottom: 0 }}>{vaultMsg}</p>
            )}

            </div>
          </section>
        </aside>

        <section className="card chat-card">
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
              <div className="thread chat-scroll" ref={threadRef}>
                {turns.length === 0 && (
                  <div className="chat-empty">
                    <img src="/logo.png" alt="" width={56} height={56} />
                    <h3>{t('ask.emptyTitle')}</h3>
                    <p>{t('ask.intro')}</p>
                    <span className="pill">{t('ask.emptyHint')}</span>
                  </div>
                )}
                {turns.map((t) => (
                  <div className="turn" id={`turn-${t.id}`} key={t.id}>
                  <TurnView
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
                    onToggleMask={() => updateTurn(t.id, (cur) => ({ mask: !cur.mask }))}
                  />
                  </div>
                ))}
              </div>

              <form
                className="composer"
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
                <div className="composer-bar">
                  <span className="small muted">{docs.length ? t('ask.hint') : t('ask.needDocs')}</span>
                  <button className="btn btn-primary composer-send" disabled={!question.trim() || docs.length === 0} aria-label={t('ask.submit')}>
                    {t('ask.submit')} <Glyph name="send" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="chat-scroll">
              <ReceiptsView receipts={receipts} titles={titles} loading={receiptsState === 'loading'} />
            </div>
          )}
        </section>
        <aside className="side-col">
        <section className="stats stats-side" aria-label={t('stats.label')}>
          <Stat glyph="lock" value={storedCount} label={t('stats.sealed')} />
          <Stat glyph="key" value={0} label={t('stats.keys')} note={t('stats.keysNote')} emphasis />
          <Stat glyph="bot" value={turns.reduce((n, x) => n + (x.answer ? x.released.length : 0), 0)} label={t('stats.released')} />
          <Stat glyph="eye" value={turns.reduce((n, x) => n + (x.masked ?? 0), 0)} label={t('stats.masked')} />
        </section>
        <DemoGuide steps={guide} onRestart={resetVault} restartDisabled={busy || inFlight || (!docs.length && !turns.length)} />
        </aside>
        </div>
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
  onToggleMask: () => void
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
          {t.phase === 'consent' && (
            <p className="consent-why">
              <Glyph name="lock" /> {tr('turn.why')}
            </p>
          )}
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
            <div className="consent-foot">
              <label className="switch mask-switch">
                <input type="checkbox" checked={t.mask} onChange={props.onToggleMask} />
                <Glyph name="eye" /> {tr('mask.toggle')}
              </label>
              <span className="spacer" />
              <button className="btn btn-sm" onClick={props.onDeny}>
                {tr('turn.deny')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={props.onRelease} disabled={!t.selection.length}>
                {tr('turn.release', { n: t.selection.length })}
              </button>
            </div>
          )}
        </div>
      )}

      {t.phase === 'decrypting' && (
        <div className="ring-row">
          <ThresholdRing state="working" />
          <p>{tr('ring.decrypting')}</p>
        </div>
      )}
      {t.phase === 'answering' && (
        <div className="ring-row">
          <ThresholdRing state="granted" />
          <p>
            {tr('ring.granted', { n: t.released.length })} <span className="spinner" />
          </p>
        </div>
      )}
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
            <div className="bubble-head">
              <Glyph name="bot" /> {tr('answer.by')}
              {t.answer.model && <span className="muted"> · {t.answer.model}</span>}
            </div>
            <RichAnswer text={t.answer.answer} titles={titles} />
            {t.released.length > 0 && (
              <div className="row small muted" style={{ marginTop: 10 }}>
                <ThresholdRing state="granted" size="sm" />
                {tr('turn.sawOnly')}
                {t.released.map((r) => (
                  <span key={r.id} className="pill pill-accent">
                    {r.title.split(':')[0]}
                  </span>
                ))}
              </div>
            )}
            {t.released.length > 0 && (
              <details className="sent">
                <summary>
                  {t.mask ? `${tr('mask.count', { n: t.masked ?? 0 })} · ` : ''}
                  {tr('mask.show')}
                </summary>
                {t.released.map((r) => (
                  <div key={r.id}>
                    <strong className="small">{r.title}</strong>
                    <pre>{r.content}</pre>
                  </div>
                ))}
              </details>
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

function Stat({ glyph, value, label, note, emphasis }: { glyph: GlyphName; value: number; label: string; note?: string; emphasis?: boolean }) {
  return (
    <div className={`card stat${emphasis ? ' stat-emphasis' : ''}`}>
      <span className="stat-icon" aria-hidden="true">
        <Glyph name={glyph} />
      </span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {note && <div className="stat-note">{note}</div>}
      </div>
    </div>
  )
}
