import { useEffect, useRef, useState } from 'react'
import { db, type BeliefNode, type ConversationSession, type ExplorationCandidate, type ThoughtJournal } from '../db'
import { continueFromJournal, listExplorations, retainExplorationCandidate, saveExploration } from '../db/explorations'
import { useBeliefStore } from '../stores/useBeliefStore'
import { askExplorationQuestion, describeAIRequestFailure, getExplorationAvailability, summarizeExploration } from '../utils/deepseek'
import { appendThought, EXPLORATION_TYPES, newExploration, normalizeExploration } from '../utils/exploration'
import { readExplorationRecovery, storeExplorationRecovery } from '../utils/explorationRecovery'
import { formatDate, getTypeLabel } from './utils'

interface Props {
  open: boolean
  onClose: () => void
  sessionId?: string
  sourceNodeId?: string
}

type Busy = 'question' | 'summary' | 'retain' | null
type SaveState = 'saved' | 'saving' | 'error'

export default function ExplorationPanel({ open, onClose, sessionId, sourceNodeId }: Props) {
  const [session, setSession] = useState<ConversationSession | null>(null)
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const [legacyJournals, setLegacyJournals] = useState<ThoughtJournal[]>([])
  const [busy, setBusy] = useState<Busy>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const sessionRef = useRef<ConversationSession | null>(null)
  const writes = useRef<Promise<void>>(Promise.resolve())
  const request = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const install = (value: ConversationSession) => {
    const normalized = normalizeExploration(value)
    sessionRef.current = normalized
    setSession(normalized)
    setError('')
    setSaveState('saved')
  }

  const stopAI = () => {
    request.current?.abort()
    request.current = null
    setBusy(null)
  }

  // 串行落盘：旧草稿不能在晚到的写入中覆盖较新的回答。
  const commit = (value: ConversationSession): Promise<void> => {
    const next = {
      ...value, title: value.description ? value.title : value.draft?.trim().slice(0, 30) || '新的探索', version: 2 as const,
      // 同一毫秒内连续编辑也有明确顺序，刷新时才能识别较新的恢复快照。
      updatedAt: new Date(Math.max(Date.now(), value.updatedAt.getTime() + 1)),
    }
    sessionRef.current = next
    setSession(next)
    setSaveState('saving')
    try { storeExplorationRecovery(next) } catch { /* IndexedDB 保存结果决定最终提示。 */ }
    const job = writes.current.catch(() => {}).then(() => saveExploration(next))
    writes.current = job
    void job.then(() => {
      setSessions(previous => [next, ...previous.filter(item => item.id !== next.id)])
      if (sessionRef.current === next) setSaveState('saved')
    }, () => {
      if (sessionRef.current === next) {
        setSaveState('error')
        setError('记录暂时没有保存成功，请重试。先不要关闭页面，也可以复制下方的原话。')
      }
    })
    return job
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const previousFocus = document.activeElement as HTMLElement | null
    setLoading(true)
    setSession(null)
    setBusy(null)
    setError('')
    const userId = localStorage.getItem('currentUserId')
    const load = async () => {
      if (!userId) throw new Error('请先登录，再打开探索记录')
      await writes.current
      const recovery = readExplorationRecovery(userId)
      if (recovery) {
        const saved = await db.conversationSessions.get(recovery.id)
        if (!saved || recovery.updatedAt.getTime() > saved.updatedAt.getTime()) await saveExploration(recovery)
      }
      const list = await listExplorations(userId)
      const journals = await db.thoughtJournals.where('userId').equals(userId).toArray()
      const reason = await getExplorationAvailability()
      if (cancelled) return
      setSessions(list)
      setLegacyJournals(journals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
      setAvailability(reason)
      const existing = sessionId ? list.find(item => item.id === sessionId)
        : sourceNodeId ? list.find(item => item.sourceNodeId === sourceNodeId) : list[0]
      if (sessionId && !existing) throw new Error('这次探索记录暂时找不到，请从历史记录中选择。')
      const source = useBeliefStore.getState().nodes.find(node => node.id === sourceNodeId && node.userId === userId)
      install(existing ?? newExploration(userId, source))
    }
    void load().catch(reason => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : '暂时无法读取记录，请稍后重试')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      request.current?.abort()
      request.current = null
      previousFocus?.focus()
    }
  }, [open, sessionId, sourceNodeId])

  useEffect(() => {
    if (open && !loading) inputRef.current?.focus()
  }, [open, loading])

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [open, session?.id, session?.history.length])

  const close = async () => {
    if (busy === 'retain') return
    stopAI()
    try {
      if (sessionRef.current?.draft?.trim()) await commit(sessionRef.current)
      await writes.current
      onClose()
    } catch { /* 保留面板和未保存内容，错误由 commit 显示。 */ }
  }

  const switchSession = async (id: string) => {
    stopAI()
    try {
      if (sessionRef.current?.draft?.trim()) await commit(sessionRef.current)
      await writes.current
      const userId = localStorage.getItem('currentUserId')
      if (!userId) return
      const list = await listExplorations(userId)
      setSessions(list)
      install(list.find(item => item.id === id) ?? newExploration(userId))
      inputRef.current?.focus()
    } catch { setError('请先重试保存当前记录，再切换探索。') }
  }

  const openLegacyJournal = async (journalId: string) => {
    stopAI()
    try {
      if (sessionRef.current?.draft?.trim()) await commit(sessionRef.current)
      await writes.current
      const userId = localStorage.getItem('currentUserId')
      if (!userId) return
      const next = await continueFromJournal(userId, journalId)
      setSessions(await listExplorations(userId))
      install(next)
      inputRef.current?.focus()
    } catch {
      setError('旧笔记暂时无法打开，请确认当前记录已保存后重试。')
    }
  }

  const saveThought = async (): Promise<ConversationSession | null> => {
    const current = sessionRef.current
    if (!current) return null
    const next = appendThought(current)
    if (next !== current) await commit(next)
    else await writes.current
    return sessionRef.current
  }

  const runAI = async (kind: 'question' | 'summary') => {
    if (request.current || busy) return
    const controller = new AbortController()
    request.current = controller
    setBusy(kind)
    setError('')
    try {
      const current = await saveThought()
      if (!current?.history.some(message => message.role === 'user') || controller.signal.aborted) return
      const reason = await getExplorationAvailability()
      if (controller.signal.aborted) return
      setAvailability(reason)
      if (reason) return
      let failureMessage: string | undefined
      const onFailure = (reason: Parameters<typeof describeAIRequestFailure>[0]) => {
        failureMessage = describeAIRequestFailure(reason, true)
      }
      const result = kind === 'question'
        ? await askExplorationQuestion(current.history, controller.signal, onFailure)
        : await summarizeExploration(current.history, controller.signal, onFailure)
      if (controller.signal.aborted || request.current !== controller || sessionRef.current?.id !== current.id) return
      if (!result) {
        setError(failureMessage || 'AI 暂时没有给出合适的回应。你的原话已保存，可以继续自己写，或再次点击重试。')
        return
      }
      const latest = sessionRef.current
      const summary = typeof result === 'string' ? null : result
      await commit({
        ...latest,
        history: [...latest.history, {
          id: crypto.randomUUID(), role: 'assistant', kind,
          content: typeof result === 'string' ? result : result.text,
          createdAt: new Date().toISOString(),
        }],
        summaries: summary ? [...(latest.summaries ?? []), summary] : latest.summaries,
      })
    } catch {
      if (!controller.signal.aborted) setError('这次操作未完成，请先确认记录保存成功，再重试。')
    } finally {
      if (request.current === controller) {
        request.current = null
        setBusy(null)
      }
    }
  }

  const retain = async (summaryId: string, candidate: ExplorationCandidate, content: string, type: BeliefNode['type']) => {
    const current = sessionRef.current
    if (!current || busy) return
    setBusy('retain')
    setError('')
    try {
      await writes.current
      const store = useBeliefStore.getState()
      const anchor = store.nodes.find(node => node.id === current.sourceNodeId)
      const result = await retainExplorationCandidate(current.userId, current.id, summaryId, candidate.id, content, type, {
        x: (anchor?.position.x ?? 0) + 120, y: (anchor?.position.y ?? 0) + (current.summaries?.length ?? 0) * 40, z: 0.5,
      })
      if (!result.node.deletedAt && !store.nodes.some(node => node.id === result.node.id)) store.addNode(result.node)
      install(result.session)
      try { storeExplorationRecovery(result.session) } catch { /* 已在事务中保存。 */ }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '加入画布失败，请重试')
    } finally { setBusy(null) }
  }

  const editCandidate = (summaryId: string, candidateId: string, content: string, type: BeliefNode['type']) => {
    const current = sessionRef.current
    if (!current) return
    void commit({ ...current, summaries: current.summaries?.map(summary => summary.id !== summaryId ? summary : {
      ...summary, candidates: summary.candidates.map(candidate => candidate.id !== candidateId ? candidate : {
        ...candidate, userContent: content, userType: type,
      }),
    }) }).catch(() => {})
  }

  if (!open) return null
  const hasThoughts = session?.history.some(message => message.role === 'user') || !!session?.draft?.trim()
  const summaries = session?.summaries ?? []
  const latestSummary = summaries[summaries.length - 1]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6" style={{ background: 'rgba(74,64,54,0.12)' }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="exploration-title"
        className="w-full max-w-3xl rounded-2xl border border-[#E0D8CC] flex flex-col overflow-hidden shadow-lg"
        style={{ background: '#FAF7F2', height: 'min(850px, 90dvh)' }}
        onKeyDown={event => {
          if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.stopPropagation(); void close() }
          if (event.key === 'Tab') {
            const controls = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), textarea:not(:disabled), input:not(:disabled), summary')
            if (!controls?.length) return
            const first = controls[0], last = controls[controls.length - 1]
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
          }
        }}>
        <header className="px-6 pt-5 pb-4 border-b border-[#E0D8CC]">
          <div className="flex justify-between gap-4 items-center">
            <div>
              <h2 id="exploration-title" className="font-serif text-xl text-[#5C4A3A]">我的探索</h2>
              <p className="text-xs text-[#7A7670] mt-1">先把自己的话写下来，不急着得出结论。</p>
            </div>
            <button className="btn-soft text-sm" disabled={busy === 'retain'} onClick={() => void close()}>今天到这里</button>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <select aria-label="继续过去的探索" className="bg-transparent text-sm min-w-0 flex-1 border-b border-[#E0D8CC] py-2"
              value={sessions.some(item => item.id === session?.id) ? session?.id : ''}
              disabled={loading || busy === 'retain'} onChange={event => void switchSession(event.target.value)}>
              <option value="" disabled>新的探索</option>
              {sessions.map(item => <option key={item.id} value={item.id}>{item.title} · {formatDate(item.updatedAt)}</option>)}
            </select>
            <button className="text-sm text-[#5C4A3A] px-2 py-2" disabled={loading || busy === 'retain'} onClick={() => void switchSession('')}>另起一段</button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading && <p role="status" className="text-sm text-[#7A7670]">正在找回你的记录…</p>}
          {!loading && session?.history.length === 0 && <p className="text-sm leading-7 text-[#7A7670]">可以从一件具体的事、一种感受，或一个尚未想明白的念头开始。先自己写也很好。</p>}
          {!loading && session?.history.map((message, index) => (
            <article key={message.id ?? index} className={message.role === 'user' ? 'space-y-2' : 'border-l-2 border-[#D8CCB7] pl-4'}>
              <p className="text-xs text-[#7A7670] mb-1">{message.role === 'user' ? '我的思考' : message.kind === 'summary' ? '按你的请求整理 · 可保留不同意见' : message.kind === 'question' ? '一个问题' : '之前的 AI 回应 · 供回看'}</p>
              <p className={`whitespace-pre-wrap break-words leading-8 ${message.role === 'user' ? 'text-base text-[#4A4036]' : 'text-sm text-[#73675A]'}`}>{message.content}</p>
            </article>
          ))}
          {latestSummary && <section className="space-y-3 border-t border-[#E0D8CC] pt-4">
            <h3 className="text-sm text-[#5C4A3A]">想留下哪句话，由你决定</h3>
            <p className="text-xs text-[#7A7670]">可以改写、调整类型，也可以一条都不加入。原话和历次整理都会保留。</p>
            {latestSummary.candidates.length === 0 && <p className="text-sm text-[#7A7670]">目前还不必形成信念节点，可以继续写。</p>}
            {latestSummary.candidates.map(candidate => <CandidateCard key={candidate.id} candidate={candidate} disabled={!!busy}
              onEdit={(content, type) => editCandidate(latestSummary.id, candidate.id, content, type)}
              onRetain={(content, type) => void retain(latestSummary.id, candidate, content, type)} />)}
          </section>}
          {summaries.length > 1 && <details className="text-sm text-[#7A7670]">
            <summary className="cursor-pointer py-2">查看以前的整理版本</summary>
            {summaries.slice(0, -1).map(summary => <div key={summary.id} className="my-4 space-y-3">
              <p className="text-xs">{new Date(summary.createdAt).toLocaleString('zh-CN')}</p>
              <p className="whitespace-pre-wrap">{summary.text}</p>
              {summary.candidates.map(candidate => <CandidateCard key={candidate.id} candidate={candidate} disabled={!!busy}
                onEdit={(content, type) => editCandidate(summary.id, candidate.id, content, type)}
                onRetain={(content, type) => void retain(summary.id, candidate, content, type)} />)}
            </div>)}
          </details>}
          {session?.lastResult != null && <details className="text-sm text-[#7A7670]">
            <summary className="cursor-pointer py-2">旧版分析存档</summary>
            <p className="text-xs my-2">保留迁移前的完整结果，不代表你已认可其中的判断。</p>
            <LegacyArchive value={session.lastResult} />
          </details>}
          {legacyJournals.length > 0 && <details className="border-t border-[#E0D8CC] pt-4 text-sm text-[#7A7670]">
            <summary className="cursor-pointer py-2">以前的深度思考笔记 · {legacyJournals.length} 篇</summary>
            <p className="text-xs leading-6 mb-3">旧笔记保留原样。选择“从这篇继续探索”后，原文会进入一段可继续的探索，旧笔记仍在这里。</p>
            <div className="space-y-4">
              {legacyJournals.map(journal => <article key={journal.id} className="rounded-xl border border-[#E0D8CC] bg-[#FFFBF5] p-4 space-y-2">
                <h3 className="text-sm text-[#4A4036]">{journal.title}</h3>
                <p className="text-xs">{formatDate(journal.createdAt)}</p>
                {journal.content && <p className="whitespace-pre-wrap break-words leading-7 text-sm text-[#5C4A3A]">{journal.content}</p>}
                <button className="text-xs text-[#5C4A3A] underline py-1" disabled={!!busy || loading}
                  onClick={() => void openLegacyJournal(journal.id)}>
                  {sessions.some(item => item.sourceJournalId === journal.id) ? '继续这篇的探索' : '从这篇继续探索'}
                </button>
              </article>)}
            </div>
          </details>}
        </div>

        <footer className="px-6 pt-3 pb-5 border-t border-[#E0D8CC] space-y-3">
          {error && <p role="alert" className="text-sm text-[#9A573E]">{error}</p>}
          {availability && <p className="text-xs text-[#7A7670]">{availability}</p>}
          <label htmlFor="exploration-draft" className="sr-only">继续写下我的思考</label>
          <textarea ref={inputRef} id="exploration-draft" value={session?.draft ?? ''} disabled={loading || !session || busy === 'retain'}
            placeholder="我想接着写……" rows={4}
            className="w-full resize-y bg-[#FFFBF5] border border-[#DDD1C0] rounded-xl p-3 text-base leading-7 outline-none focus:ring-1 focus:ring-[#C8A96E]"
            onChange={event => { if (sessionRef.current) void commit({ ...sessionRef.current, draft: event.target.value }).catch(() => {}) }}
            onKeyDown={event => {
              if (event.nativeEvent.isComposing) return
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !busy) {
                event.preventDefault(); void saveThought().catch(() => {})
              }
            }} />
          <div className="flex flex-wrap gap-3 items-center">
            <button className="btn-soft text-sm disabled:opacity-40" disabled={!session?.draft?.trim() || !!busy || loading}
              onClick={() => void saveThought().catch(() => {})}>记下这段</button>
            <button className="text-sm text-[#5C4A3A] py-2 disabled:opacity-40" disabled={!hasThoughts || !!busy || loading}
              onClick={() => void runAI('question')}>问我一个问题</button>
            <button className="text-sm text-[#7A7670] py-2 disabled:opacity-40" disabled={!hasThoughts || !!busy || loading}
              onClick={() => void runAI('summary')}>整理到这里</button>
            {(busy === 'question' || busy === 'summary') && <button className="text-sm text-[#7A7670] py-2" onClick={stopAI}>停止，我先自己写</button>}
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-[#7A7670]" aria-live="polite">
            <span>{busy === 'question' ? '正在准备一个问题…' : busy === 'summary' ? '正在整理你写下的内容…' : 'Enter 换行 · Ctrl / ⌘ + Enter 记下这段'}</span>
            <span>{saveState === 'saving' ? '正在保存…' : saveState === 'error' ? '尚未保存' : '草稿与记录保存在当前浏览器'}
              {saveState === 'error' && <button className="underline ml-2" onClick={() => { if (sessionRef.current) void commit(sessionRef.current).catch(() => {}) }}>重试保存</button>}
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}

function CandidateCard({ candidate, disabled, onRetain, onEdit }: {
  candidate: ExplorationCandidate
  disabled: boolean
  onRetain: (content: string, type: BeliefNode['type']) => void
  onEdit: (content: string, type: BeliefNode['type']) => void
}) {
  const content = candidate.userContent ?? candidate.content
  const type = candidate.userType ?? candidate.type
  return <div className="rounded-xl border border-[#E0D8CC] p-3 space-y-2 bg-[#FFFBF5]">
    <label className="block text-xs text-[#7A7670]">我想保留的表达
      <textarea value={content} onChange={event => onEdit(event.target.value, type)} disabled={!!candidate.addedNodeId || disabled}
        className="block w-full bg-transparent text-sm leading-7 text-[#4A4036] mt-1 p-1 border-b border-[#E0D8CC]" rows={2} />
    </label>
    <p className="text-xs text-[#7A7670] whitespace-pre-wrap">来自我的原话：「{candidate.quote}」</p>
    <p className="text-xs text-[#7A7670]">分层参考：{candidate.reason}</p>
    <div className="flex flex-wrap gap-3 items-center">
      <label className="text-xs text-[#7A7670]">类型由我决定：
        <select className="bg-transparent py-2" value={type} disabled={!!candidate.addedNodeId || disabled}
          onChange={event => onEdit(content, event.target.value as BeliefNode['type'])}>
          {EXPLORATION_TYPES.map(value => <option key={value} value={value}>{value === 'seed' ? '暂不分类' : getTypeLabel(value)}</option>)}
        </select>
      </label>
      <button className="btn-soft text-xs disabled:opacity-50" disabled={!!candidate.addedNodeId || disabled || !content.trim()}
        onClick={() => onRetain(content, type)}>{candidate.addedNodeId ? '已保留到画布' : '把这句话加入画布'}</button>
    </div>
  </div>
}

function LegacyArchive({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object') return null
  const result = value as Record<string, unknown>
  const labels: Record<string, string> = {
    coreBeliefName: '之前提出的核心信念名称', possibleCoreBelief: '当时的推测',
    possibleSubBeliefs: '当时提出的附属信念', possiblePatterns: '当时提出的模式',
    reverseDerivation: '当时的推导', insight: '当时的整理', reframedPerspective: '另一个角度',
  }
  return <div className="space-y-3">
    {Object.entries(labels).map(([key, label]) => {
      const content = result[key]
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.filter(item => typeof item === 'string').join('\n') : ''
      return text ? <div key={key}><p className="text-xs">{label}</p><p className="whitespace-pre-wrap leading-7">{text}</p></div> : null
    })}
  </div>
}
