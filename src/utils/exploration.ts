import type { BeliefNode, ConversationSession, ExplorationMessage, ExplorationSummary } from '../db'

export const EXPLORATION_TYPES: BeliefNode['type'][] = [
  'seed', 'core_belief', 'sub_belief', 'thought_emotion_pattern',
  'thought', 'emotion', 'behavior', 'material_reality',
]

export function newExploration(userId: string, source?: BeliefNode): ConversationSession {
  const now = new Date()
  return {
    id: crypto.randomUUID(), userId, title: '新的探索', description: '', history: [],
    lastResult: null, confirmationRound: 0, followUpRound: 0,
    createdAt: now, updatedAt: now, version: 2, draft: source?.content ?? '',
    summaries: [], sourceNodeId: source?.id,
  }
}

export function normalizeExploration(session: ConversationSession): ConversationSession {
  const history = session.history.map((message, index) => ({
    ...message, id: message.id ?? `${session.id}-legacy-${index}`,
  }))
  // 某些旧会话只保存 description。让原话仍然可见，而不是用 AI 文案替代。
  if (session.description && !history.some(message => message.role === 'user' && message.content === session.description)) {
    history.unshift({ id: `${session.id}-original`, role: 'user', content: session.description })
  }
  return { ...session, history, draft: session.draft ?? '', summaries: session.summaries ?? [] }
}

export function appendThought(session: ConversationSession): ConversationSession {
  if (!session.draft?.trim()) return session
  const content = session.draft // 完整保留用户原话及换行
  return {
    ...session, version: 2, draft: '', updatedAt: new Date(),
    description: session.description || content,
    title: session.description ? session.title : content.trim().slice(0, 30),
    history: [...session.history, {
      id: crypto.randomUUID(), role: 'user', kind: 'thought', content,
      createdAt: new Date().toISOString(),
    }],
  }
}

export function parseExplorationQuestion(raw: Record<string, unknown>): string | null {
  if (typeof raw.question !== 'string') return null
  const question = raw.question.trim()
  // 错误格式不进入记录；避免模型重新返回整篇分析或多道问题。
  if (!question || question.length > 180 || (question.match(/[?？]/g)?.length ?? 0) > 1) return null
  return question
}

export function parseExplorationSummary(
  raw: Record<string, unknown>, history: ExplorationMessage[],
): ExplorationSummary | null {
  if (typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 600) return null
  const candidates: ExplorationSummary['candidates'] = []
  if (Array.isArray(raw.candidates)) {
    for (const value of raw.candidates.slice(0, 3)) {
      if (!value || typeof value !== 'object') continue
      const item = value as Record<string, unknown>
      if (typeof item.content !== 'string' || !item.content.trim() || item.content.length > 200 ||
          typeof item.quote !== 'string' || !item.quote.trim() ||
          typeof item.sourceMessageId !== 'string' || typeof item.reason !== 'string') continue
      const source = history.find(message => message.id === item.sourceMessageId && message.role === 'user')
      // 仅接收可以在用户原话中核对的引用，AI 的推测不能变成用户证据。
      if (!source?.content.includes(item.quote)) continue
      candidates.push({
        id: crypto.randomUUID(), content: item.content.trim(),
        type: EXPLORATION_TYPES.includes(item.type as BeliefNode['type']) ? item.type as BeliefNode['type'] : 'seed',
        quote: item.quote, sourceMessageId: item.sourceMessageId, reason: item.reason.slice(0, 180),
      })
    }
  }
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), text: raw.text.trim(), candidates }
}
