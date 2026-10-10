import Dexie, { type Table } from 'dexie'

// ====== 数据模型 ======

export const CATEGORIES = [
  'study', 'work', 'life', 'money',
  'love', 'friendship', 'family', 'health',
  'self',
] as const

export type Category = string

export interface BeliefNode {
  id: string
  userId: string
  type: 'core_belief' | 'sub_belief' | 'thought_emotion_pattern'
    | 'thought' | 'emotion' | 'behavior' | 'material_reality' | 'seed'
  content: string
  category?: Category               // 领域分类
  userNote?: string
  sourceSessionId?: string          // 从哪次探索中主动保留
  sourceSummaryId?: string
  sourceCandidateId?: string
  position: { x: number; y: number; z: number }
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'fading' | 'released' | 'observed'
  attitude?: 'break' | 'strengthen' | 'observe'
  isLongTerm?: boolean
  markedForReview?: boolean
  reviewHistory?: { date: string; note: string }[]
  deletedAt?: Date  // 软删除时间戳，有值=在垃圾箱中，7天后自动物理删除
}

export interface BeliefEdge {
  id: string
  userId: string
  sourceId: string
  targetId: string
  type: 'derives_from' | 'leads_to' | 'related_to' | 'suggested_by_ai' | 'manual'
  strength: number
  createdAt: Date
}

export interface ThoughtJournal {
  id: string
  userId: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface DailyTask {
  id: string
  userId: string
  content: string
  date: string          // YYYY-MM-DD，按天分组
  status: 'pending' | 'done'
  createdAt: Date
}

export interface ExplorationMessage {
  id?: string                       // 旧对话没有 ID，读取时补齐
  role: 'user' | 'assistant'
  content: string
  kind?: 'thought' | 'question' | 'summary'
  createdAt?: string
}

export interface ExplorationCandidate {
  id: string
  content: string
  type: BeliefNode['type']
  reason: string
  quote: string
  sourceMessageId: string
  addedNodeId?: string
  userContent?: string              // 用户改写单独保存，不覆盖 AI 原始建议
  userType?: BeliefNode['type']
}

export interface ExplorationSummary {
  id: string
  createdAt: string
  text: string
  candidates: ExplorationCandidate[]
}

/** 原话、问题和整理版本分别保存，旧会话字段保持兼容。 */
export interface ConversationSession {
  id: string
  userId: string
  title: string                          // 从首次输入截取的前 30 字
  description: string                    // 原始用户输入
  history: ExplorationMessage[]
  lastResult: unknown                    // 旧版 TraceResult 快照，保留原数据
  confirmationRound: number
  followUpRound: number
  createdAt: Date
  updatedAt: Date
  version?: 2
  draft?: string
  summaries?: ExplorationSummary[]
  sourceNodeId?: string
  sourceJournalId?: string             // 从旧「深度思考」笔记继续探索
}

export interface BookChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode: 'book' | 'personal'
  sources?: string[]
  status?: 'notice'
  createdAt: Date
}

export interface BookChat {
  id: string
  userId: string
  bookId: string
  messages: BookChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface UserAccount {
  id: string
  username: string
  passwordHash: string
  nickname?: string             // 用户昵称
  createdAt: Date
  reviewSettings?: {
    monthlyEnabled: boolean
    weeklyEnabled: boolean
    dailyEnabled: boolean
    lastMonthlyReview?: string
    lastWeeklyReview?: string
    lastDailyReview?: string
  }
  hasCompletedOnboarding?: boolean
}

// ====== 数据库定义 ======

class BeliefDB extends Dexie {
  userAccounts!: Table<UserAccount, string>
  beliefNodes!: Table<BeliefNode, string>
  beliefEdges!: Table<BeliefEdge, string>
  thoughtJournals!: Table<ThoughtJournal, string>
  dailyTasks!: Table<DailyTask, string>
  conversationSessions!: Table<ConversationSession, string>
  bookChats!: Table<BookChat, string>

  constructor() {
    super('BeliefDB')
    this.version(4).stores({
      userAccounts: 'id, username',
      beliefNodes: 'id, userId, type, category, status, attitude, isLongTerm, markedForReview, deletedAt',
      beliefEdges: 'id, userId, sourceId, targetId, type',
      thoughtJournals: 'id, userId, createdAt',
    })
    this.version(5).stores({
      userAccounts: 'id, username',
      beliefNodes: 'id, userId, type, category, status, attitude, isLongTerm, markedForReview, deletedAt',
      beliefEdges: 'id, userId, sourceId, targetId, type',
      thoughtJournals: 'id, userId, createdAt',
      dailyTasks: 'id, userId, date, status',
    })
    this.version(6).stores({
      userAccounts: 'id, username',
      beliefNodes: 'id, userId, type, category, status, attitude, isLongTerm, markedForReview, deletedAt',
      beliefEdges: 'id, userId, sourceId, targetId, type',
      thoughtJournals: 'id, userId, createdAt',
      dailyTasks: 'id, userId, date, status',
      conversationSessions: 'id, userId, createdAt',
    })
    this.version(7).stores({
      userAccounts: 'id, username',
      beliefNodes: 'id, userId, type, category, status, attitude, isLongTerm, markedForReview, deletedAt',
      beliefEdges: 'id, userId, sourceId, targetId, type',
      thoughtJournals: 'id, userId, createdAt',
      dailyTasks: 'id, userId, date, status',
      conversationSessions: 'id, userId, createdAt',
      bookChats: 'id, userId, bookId, updatedAt',
    })
  }

  // ====== 账号操作 ======

  /** 注册新账号 */
  async register(username: string, password: string, nickname?: string): Promise<UserAccount> {
    const existing = await this.userAccounts.where('username').equals(username).first()
    if (existing) {
      throw new Error('该账号名已被使用')
    }
    const id = crypto.randomUUID()
    const hash = await this.hashPassword(password)
    const account: UserAccount = {
      id,
      username,
      nickname: nickname || username,
      passwordHash: hash,
      createdAt: new Date(),
      reviewSettings: {
        monthlyEnabled: true,
        weeklyEnabled: true,
        dailyEnabled: true,
      },
      hasCompletedOnboarding: false,
    }
    await this.userAccounts.add(account)
    return account
  }

  /** 登录 */
  async login(username: string, password: string): Promise<UserAccount> {
    const existing = await this.userAccounts.where('username').equals(username).first()
    if (!existing) {
      throw new Error('账号不存在，请先注册')
    }
    const hash = await this.hashPassword(password)
    if (existing.passwordHash !== hash) {
      throw new Error('密码不正确')
    }
    return existing
  }

  /** 修改密码 */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userAccounts.get(userId)
    if (!user) throw new Error('用户不存在')
    const oldHash = await this.hashPassword(oldPassword)
    if (user.passwordHash !== oldHash) {
      throw new Error('原密码不正确')
    }
    const newHash = await this.hashPassword(newPassword)
    await this.userAccounts.update(userId, { passwordHash: newHash })
  }

  /** 修改昵称 */
  async updateNickname(userId: string, nickname: string): Promise<void> {
    await this.userAccounts.update(userId, { nickname })
  }

  /** 将所有已存在用户的密码重置为 "12345678"（一次性迁移） */
  async resetAllPasswords(): Promise<void> {
    const newHash = await this.hashPassword('12345678')
    const all = await this.userAccounts.toArray()
    for (const user of all) {
      await this.userAccounts.update(user.id, { passwordHash: newHash })
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'belief-salt')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

export const db = new BeliefDB()
