import { db, type BeliefNode, type ConversationSession } from './index'
import { newExploration, normalizeExploration } from '../utils/exploration'

export async function saveExploration(session: ConversationSession): Promise<void> {
  if (!session.userId) throw new Error('请先登录')
  await db.transaction('rw', db.conversationSessions, async () => {
    const existing = await db.conversationSessions.get(session.id)
    if (existing && existing.userId !== session.userId) throw new Error('无法保存其他账号的记录')
    await db.conversationSessions.put({ ...session, createdAt: existing?.createdAt ?? session.createdAt })
  })
}

export async function listExplorations(userId: string): Promise<ConversationSession[]> {
  const sessions = await db.conversationSessions.where('userId').equals(userId).toArray()
  return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).map(normalizeExploration)
}

/** 旧笔记保留原表；每篇至多生成一条可继续的探索。 */
export async function continueFromJournal(userId: string, journalId: string): Promise<ConversationSession> {
  if (!userId) throw new Error('请先登录')
  return db.transaction('rw', db.thoughtJournals, db.conversationSessions, async () => {
    const journal = await db.thoughtJournals.get(journalId)
    if (!journal || journal.userId !== userId) throw new Error('找不到这篇笔记')
    const existing = await db.conversationSessions.where('userId').equals(userId)
      .filter(session => session.sourceJournalId === journalId).first()
    if (existing) return normalizeExploration(existing)

    const original = journal.content || journal.title
    const session = newExploration(userId)
    session.title = journal.title
    session.description = original
    session.sourceJournalId = journal.id
    session.history = [{
      id: crypto.randomUUID(), role: 'user', kind: 'thought', content: original,
      createdAt: journal.createdAt.toISOString(),
    }]
    await db.conversationSessions.add(session)
    return session
  })
}

/** 入图和来源标记在同一事务内提交。刷新、重复点击不会反复创建节点。 */
export async function retainExplorationCandidate(
  userId: string, sessionId: string, summaryId: string, candidateId: string,
  content: string, type: BeliefNode['type'], position: BeliefNode['position'],
): Promise<{ session: ConversationSession; node: BeliefNode }> {
  if (!content.trim()) throw new Error('请先写下想保留的表达')
  return db.transaction('rw', db.conversationSessions, db.beliefNodes, async () => {
    const session = await db.conversationSessions.get(sessionId)
    if (!session || session.userId !== userId) throw new Error('找不到这次探索')
    const candidate = session.summaries?.find(summary => summary.id === summaryId)?.candidates.find(item => item.id === candidateId)
    if (!candidate) throw new Error('找不到这条整理建议')
    if (candidate.addedNodeId) {
      const node = await db.beliefNodes.get(candidate.addedNodeId)
      if (node && node.userId === userId) return { session, node }
      throw new Error('这条内容曾加入画布，请先检查垃圾箱或已有记录')
    }
    const now = new Date(Math.max(Date.now(), session.updatedAt.getTime() + 1))
    const node: BeliefNode = {
      id: crypto.randomUUID(), userId, content: content.trim(), type, position,
      status: 'active', attitude: 'observe', createdAt: now, updatedAt: now,
      sourceSessionId: sessionId, sourceSummaryId: summaryId, sourceCandidateId: candidateId,
      userNote: `探索中的原话：${candidate.quote}`,
    }
    candidate.addedNodeId = node.id
    candidate.userContent = content.trim()
    candidate.userType = type
    session.updatedAt = now
    await db.beliefNodes.add(node)
    await db.conversationSessions.put(session)
    return { session, node }
  })
}
