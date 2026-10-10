import type { ConversationSession } from '../db'

const recoveryKey = (userId: string) => `belief:exploration-draft:${userId}`

// IndexedDB 写入是异步的；输入后立即刷新也能从当前编辑快照恢复。
export function storeExplorationRecovery(session: ConversationSession): void {
  localStorage.setItem(recoveryKey(session.userId), JSON.stringify(session))
}

export function readExplorationRecovery(userId: string): ConversationSession | null {
  try {
    const raw = localStorage.getItem(recoveryKey(userId))
    if (!raw) return null
    const value = JSON.parse(raw) as ConversationSession
    if (value.userId !== userId || typeof value.id !== 'string' || !Array.isArray(value.history) ||
        typeof value.draft !== 'string' || typeof value.description !== 'string') return null
    const createdAt = new Date(value.createdAt)
    const updatedAt = new Date(value.updatedAt)
    if (!Number.isFinite(createdAt.getTime()) || !Number.isFinite(updatedAt.getTime())) return null
    return { ...value, createdAt, updatedAt }
  } catch {
    return null
  }
}
