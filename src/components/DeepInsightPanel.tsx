import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBeliefStore } from '../stores/useBeliefStore'
import { db, type BeliefNode, type BeliefEdge, type ConversationSession } from '../db'
import { traceBelief, continueTrace, type TraceResult } from '../utils/deepseek'
import { getNodeColor, getTypeLabel, normalizeEdgeDirection, formatDate, TYPE_HIERARCHY } from './utils'

interface Props {
  open: boolean
  onClose: () => void
}

type PanelState = 'input' | 'loading' | 'confirming' | 'result' | 'error'

export default function DeepInsightPanel({ open, onClose }: Props) {
  const store = useBeliefStore()
  const [description, setDescription] = useState('')
  const [panelState, setPanelState] = useState<PanelState>('input')
  const [result, setResult] = useState<TraceResult | null>(null)
  const [addedNodeIndices, setAddedNodeIndices] = useState<Set<number>>(new Set())
  const [allAdded, setAllAdded] = useState(false)
  // 确认流程
  const [confirmationRound, setConfirmationRound] = useState(0)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [supplementInput, setSupplementInput] = useState('')
  const [showSupplement, setShowSupplement] = useState(false)
  const [isSupplementLoading, setIsSupplementLoading] = useState(false)
  // 选择性接受：每个建议节点的开关
  const [acceptedNodes, setAcceptedNodes] = useState<Set<number>>(new Set())
  // 会话持久化
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ConversationSession[]>([])
  const MAX_ROUNDS = 10

  // 加载历史会话
  useEffect(() => {
    if (!open) return
    loadSessions()
  }, [open])

  const loadSessions = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const list = await db.conversationSessions
      .where('userId').equals(userId)
      .reverse()
      .sortBy('createdAt')
    setSessions(list.slice(0, 20)) // 最多显示 20 条
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await db.conversationSessions.delete(sessionId)
    if (currentSessionId === sessionId) setCurrentSessionId(null)
    loadSessions()
  }

  /** 保存/更新会话到 DB */
  const saveSession = async (
    desc: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    lastResult: TraceResult | null,
    confirmRound: number,
    followRound: number,
    sessionId?: string | null,
  ) => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const id = sessionId || crypto.randomUUID()
    const session: ConversationSession = {
      id,
      userId,
      title: desc.slice(0, 30),
      description: desc,
      history,
      lastResult,
      confirmationRound: confirmRound,
      followUpRound: followRound,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await db.conversationSessions.put(session)
    setCurrentSessionId(id)
    loadSessions() // 刷新列表
    return id
  }

  /** 恢复历史会话 */
  const resumeSession = (session: ConversationSession) => {
    setDescription(session.description)
    setResult(session.lastResult)
    setConversationHistory(session.history)
    setConfirmationRound(session.confirmationRound)
    setFollowUpRound(session.followUpRound)
    setAcceptedNodes(new Set(session.lastResult?.suggestedNodes.map((_: any, i: number) => i) ?? []))
    setCurrentSessionId(session.id)
    setAllAdded(false)
    // 如果已确认过，直接进入结果态；否则回到确认态
    if (session.confirmationRound > 0 && session.history.length > 1) {
      setPanelState('result')
    } else if (session.lastResult) {
      setPanelState('confirming')
    }
  }

  const handleClose = () => {
    setDescription('')
    setPanelState('input')
    setResult(null)
    setAddedNodeIndices(new Set())
    setAllAdded(false)
    setConfirmationRound(0)
    setConversationHistory([])
    setSupplementInput('')
    setIsSupplementLoading(false)
    setShowSupplement(false)
    setAcceptedNodes(new Set())
    setCurrentSessionId(null)
    setFollowUpRound(0)
    onClose()
  }

  const handleSubmit = async () => {
    if (!description.trim()) return
    setPanelState('loading')

    const existingNodes = store.nodes
      .filter(n => !n.deletedAt)
      .map(n => ({ id: n.id, content: n.content, type: n.type }))

    const res = await traceBelief(description.trim(), existingNodes)
    if (!res) {
      setPanelState('error')
      return
    }
    setResult(res)
    setConfirmationRound(1)
    const history = [
      { role: 'user' as const, content: description.trim() },
      { role: 'assistant' as const, content: res.insight },
    ]
    setConversationHistory(history)
    // 默认全部接受建议节点
    setAcceptedNodes(new Set(res.suggestedNodes.map((_, i) => i)))
    // 保存会话到 DB
    saveSession(description.trim(), history, res, 1, 0, null)
    // 进入确认步骤
    setPanelState('confirming')
  }

  /** 确认：对，就是这样 → 进入完整结果 */
  const handleConfirm = () => {
    setPanelState('result')
  }

  /** 补充更多信息 → 重新分析 */
  const handleSupplement = async () => {
    if (!supplementInput.trim() || confirmationRound >= MAX_ROUNDS) return
    setIsSupplementLoading(true)

    const existingNodes = store.nodes
      .filter(n => !n.deletedAt)
      .map(n => ({ id: n.id, content: n.content, type: n.type }))

    const newHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory,
      { role: 'user', content: `补充信息：${supplementInput.trim()}` },
    ]

    const res = await continueTrace(description.trim(), newHistory, existingNodes, result?.suggestedNodes)
    setIsSupplementLoading(false)

    if (!res) return

    setResult(res)
    const newRound = confirmationRound + 1
    setConfirmationRound(newRound)
    const finalHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...newHistory,
      { role: 'assistant', content: res.insight },
    ]
    setConversationHistory(finalHistory)
    setAcceptedNodes(new Set(res.suggestedNodes.map((_, i) => i)))
    setSupplementInput('')
    setShowSupplement(false)
    // 更新 DB 中的会话
    saveSession(description.trim(), finalHistory, res, newRound, followUpRound, currentSessionId)
  }

  const toggleAcceptedNode = (index: number) => {
    setAcceptedNodes(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  /** 计算新节点的锚点位置：优先聚焦节点，其次选中节点，最后原点 */
  const getAnchorPosition = (): { x: number; y: number } => {
    const focusNode = store.nodes.find(n => n.id === store.focusNodeId)
    if (focusNode) return { x: focusNode.position.x, y: focusNode.position.y }
    const selectedNode = store.nodes.find(n => n.id === store.selectedNodeId)
    if (selectedNode) return { x: selectedNode.position.x, y: selectedNode.position.y }
    return { x: 0, y: 0 }
  }

  /** 为新节点创建位置：围绕锚点螺旋分布 */
  const getNodePosition = (index: number, total: number) => {
    const anchor = getAnchorPosition()
    const angle = (index / total) * Math.PI * 2
    const radius = 130 + Math.random() * 70
    return {
      x: anchor.x + Math.cos(angle) * radius,
      y: anchor.y + Math.sin(angle) * radius,
      z: Math.random(),
    }
  }

  /** 自动连接新节点到锚点（方向按层级自动调整） */
  const autoConnectToAnchor = (newNodeId: string, userId: string, newNodeType: string) => {
    const anchorId = store.focusNodeId || store.selectedNodeId
    if (!anchorId) return
    const anchorNode = store.nodes.find(n => n.id === anchorId)
    if (!anchorNode) return
    const dir = normalizeEdgeDirection(anchorId, newNodeId, anchorNode.type, newNodeType)
    const edge: BeliefEdge = {
      id: crypto.randomUUID(),
      userId,
      sourceId: dir.sourceId,
      targetId: dir.targetId,
      type: 'suggested_by_ai',
      strength: 0.5,
      createdAt: new Date(),
    }
    store.addEdge(edge)
    db.beliefEdges.add(edge)
  }

  const handleAddNode = (suggestedNode: { content: string; type: BeliefNode['type'] }, index: number) => {
    if (addedNodeIndices.has(index)) return
    const userId = localStorage.getItem('currentUserId') || ''
    const id = crypto.randomUUID()
    const total = result?.suggestedNodes.length ?? 1
    const node: BeliefNode = {
      id,
      userId,
      type: suggestedNode.type,
      content: suggestedNode.content,
      position: getNodePosition(index, total),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    }
    store.addNode(node)
    db.beliefNodes.add(node)
    autoConnectToAnchor(id, userId, suggestedNode.type)
    setAddedNodeIndices(prev => new Set(prev).add(index))
  }

  const handleAddAll = () => {
    if (!result || allAdded) return
    const userId = localStorage.getItem('currentUserId') || ''
    const newIds: string[] = []
    const acceptedList = result.suggestedNodes.filter((_, i) => acceptedNodes.has(i))
    const total = acceptedList.length

    // 只添加被接受的节点
    result.suggestedNodes.forEach((node, i) => {
      if (!acceptedNodes.has(i)) return
      const id = crypto.randomUUID()
      newIds.push(id)
      // 找到在已接受列表中的位置用于螺旋分布
      const acceptedIndex = acceptedList.findIndex((_, ai) => result.suggestedNodes.indexOf(node) === result.suggestedNodes.indexOf(acceptedList[ai]))
      const beliefNode: BeliefNode = {
        id,
        userId,
        type: node.type,
        content: node.content,
        position: getNodePosition(acceptedIndex >= 0 ? acceptedIndex : i, total),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      }
      store.addNode(beliefNode)
      db.beliefNodes.add(beliefNode)
      // 自动连接到锚点节点
      autoConnectToAnchor(id, userId, node.type)
    })

    // 层级化连线：按信念层级构建树状结构
    // core_belief → sub_belief → thought_emotion_pattern → thought/emotion → behavior → material_reality
    // 每个层级的所有节点连接到下一层级的所有节点（扇形展开），而非串行链
    // 注意：必须用 getState() 获取最新 state，因为 store.nodes 是渲染快照
    const state = useBeliefStore.getState()
    const addedNodes = newIds
      .map(id => state.nodes.find(n => n.id === id))
      .filter((n): n is BeliefNode => n != null)

    // 按 TYPE_HIERARCHY 层级分组
    const byLevel = new Map<number, BeliefNode[]>()
    for (const node of addedNodes) {
      const level = TYPE_HIERARCHY[node.type] ?? 99
      if (!byLevel.has(level)) byLevel.set(level, [])
      byLevel.get(level)!.push(node)
    }

    const levels = [...byLevel.keys()].sort((a, b) => a - b) // 深层(小数字) → 浅层(大数字)

    // 在相邻层级之间：上层所有节点 → 下层所有节点
    for (let li = 0; li < levels.length - 1; li++) {
      const upperNodes = byLevel.get(levels[li])!   // 更深层
      const lowerNodes = byLevel.get(levels[li + 1])! // 更浅层

      for (const upper of upperNodes) {
        for (const lower of lowerNodes) {
          const dir = normalizeEdgeDirection(upper.id, lower.id, upper.type, lower.type)
          const edge: BeliefEdge = {
            id: crypto.randomUUID(),
            userId,
            sourceId: dir.sourceId,
            targetId: dir.targetId,
            type: 'suggested_by_ai',
            strength: 0.5,
            createdAt: new Date(),
          }
          store.addEdge(edge)
          db.beliefEdges.add(edge)
        }
      }
    }

    // 标记所有被接受且未被单独添加过的为已添加
    const newAdded = new Set(addedNodeIndices)
    result.suggestedNodes.forEach((_, i) => {
      if (acceptedNodes.has(i)) newAdded.add(i)
    })
    setAddedNodeIndices(newAdded)
    setAllAdded(true)
  }

  // 追问（结果态下继续对话）
  const [followUpInput, setFollowUpInput] = useState('')
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false)
  const [followUpRound, setFollowUpRound] = useState(0)

  const handleFollowUp = async () => {
    if (!followUpInput.trim() || followUpRound >= MAX_ROUNDS) return
    setIsFollowUpLoading(true)

    const existingNodes = store.nodes
      .filter(n => !n.deletedAt)
      .map(n => ({ id: n.id, content: n.content, type: n.type }))

    const newHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...conversationHistory,
      { role: 'user', content: followUpInput.trim() },
    ]

    const res = await continueTrace(description.trim(), newHistory, existingNodes, result?.suggestedNodes)
    setIsFollowUpLoading(false)

    if (!res) return

    setResult(res)
    setAllAdded(false)
    const newFRound = followUpRound + 1
    setFollowUpRound(newFRound)
    const finalHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...newHistory,
      { role: 'assistant', content: res.insight },
    ]
    setConversationHistory(finalHistory)
    setAcceptedNodes(new Set(res.suggestedNodes.map((_, i) => i)))
    setFollowUpInput('')
    // 更新 DB 中的会话
    saveSession(description.trim(), finalHistory, res, confirmationRound, newFRound, currentSessionId)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          {/* 遮罩 */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(74, 64, 54, 0.06)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* 面板 */}
          <motion.div
            className="relative w-full max-w-lg mx-6 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 251, 245, 0.97)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid #E0D8CC',
              boxShadow: '0 8px 40px rgba(74, 64, 54, 0.1)',
              maxHeight: '80vh',
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h3 className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
                深度觉察
              </h3>
              <button
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: '#9C9088' }}
                onClick={handleClose}
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-6 pb-6" style={{ maxHeight: 'calc(80vh - 70px)' }}>
              {/* ====== 输入态 ====== */}
              {panelState === 'input' && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed" style={{ color: '#9C9088' }}>
                    描述一个你反复出现的行为、情绪或让你好奇的模式。AI 会温柔地帮你追溯背后可能的信念结构。
                  </p>
                  <textarea
                    className="w-full bg-transparent border rounded-lg px-4 py-3 text-sm resize-none outline-none transition-all"
                    style={{
                      borderColor: '#E0D8CC',
                      color: '#4A4036',
                      fontFamily: 'inherit',
                      minHeight: 100,
                    }}
                    placeholder="描述一个反复出现的行为模式或感受..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        handleSubmit()
                      }
                    }}
                  />
                  <button
                    className="btn-soft w-full"
                    onClick={handleSubmit}
                    disabled={!description.trim()}
                  >
                    开始探索
                  </button>

                  {/* 历史会话列表 */}
                  {sessions.length > 0 && (
                    <div className="space-y-2 pt-2" style={{ borderTop: '1px solid #E0D8CC' }}>
                      <label className="text-xs tracking-wide" style={{ color: '#C4B8B0' }}>
                        💬 过去的对话
                      </label>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {sessions.map(session => (
                          <button
                            key={session.id}
                            className="w-full text-left px-3 py-2 rounded-lg transition-all hover:opacity-80"
                            style={{ backgroundColor: 'rgba(200, 169, 110, 0.04)' }}
                            onClick={() => resumeSession(session)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm" style={{ color: '#4A4036' }}>
                                {session.title}
                              </span>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                <span className="text-xs" style={{ color: '#C4B8B0' }}>
                                  {formatDate(session.createdAt)}
                                </span>
                                <button
                                  className="text-xs hover:opacity-70"
                                  style={{ color: '#C4B8B0' }}
                                  onClick={(e) => deleteSession(session.id, e)}
                                  title="删除此对话"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <span className="text-xs" style={{ color: '#C4B8B0' }}>
                              {session.history.filter(m => m.role === 'user').length} 轮对话
                              {session.confirmationRound > 0 ? ' · 已确认' : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ====== 加载态 ====== */}
              {panelState === 'loading' && (
                <div className="flex flex-col items-center py-12 space-y-4">
                  <span
                    className="inline-block w-4 h-4 rounded-full animate-pulse"
                    style={{ backgroundColor: '#C8A96E' }}
                  />
                  <p className="text-sm" style={{ color: '#9C9088' }}>
                    正在聆听...
                  </p>
                </div>
              )}

              {/* ====== 错误态 ====== */}
              {panelState === 'error' && (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-center" style={{ color: '#9C9088' }}>
                    AI 暂时无法回应，请稍后再试
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      className="text-sm px-4 py-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.1)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.25)',
                      }}
                      onClick={() => setPanelState('input')}
                    >
                      重试
                    </button>
                    <button
                      className="text-sm px-4 py-1.5"
                      style={{ color: '#9C9088' }}
                      onClick={handleClose}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}

              {/* ====== 确认态：核心信念确认 ====== */}
              {panelState === 'confirming' && result && (
                <div className="space-y-5">
                  {/* 确认提示 */}
                  <div
                    className="px-4 py-3 rounded-lg text-sm leading-relaxed"
                    style={{
                      backgroundColor: 'rgba(200, 169, 110, 0.06)',
                      border: '1px solid rgba(200, 169, 110, 0.2)',
                      color: '#4A4036',
                    }}
                  >
                    <p className="text-xs mb-1.5" style={{ color: '#9C9088' }}>
                      🤔 AI 认为你的核心信念可能是...
                    </p>
                    {result.coreBeliefName && (
                      <p className="text-lg font-serif mb-2" style={{ color: '#5C4A3A' }}>
                        「{result.coreBeliefName}」
                      </p>
                    )}
                    <p className="text-sm leading-relaxed" style={{ color: '#7A7670' }}>
                      {result.possibleCoreBelief}
                    </p>
                  </div>

                  {/* 附属信念 */}
                  {result.possibleSubBeliefs.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        从这个核心衍生出的信念
                      </label>
                      {result.possibleSubBeliefs.map((s, i) => (
                        <p key={i} className="text-sm" style={{ color: '#4A4036' }}>
                          · {s}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* 反向推导 */}
                  {result.reverseDerivation && (
                    <div
                      className="px-3 py-2.5 rounded-lg text-xs leading-relaxed"
                      style={{
                        backgroundColor: 'rgba(160, 176, 200, 0.05)',
                        borderLeft: '2px solid #8BA4BC',
                        color: '#5A6A7A',
                      }}
                    >
                      <span className="text-xs block mb-0.5" style={{ color: '#8BA4BC' }}>
                        🔄 反向推导
                      </span>
                      {result.reverseDerivation}
                    </div>
                  )}

                  {/* 确认/补充按钮 */}
                  <div className="space-y-3 pt-2">
                    <div className="flex gap-2">
                      <button
                        className="flex-1 text-sm px-4 py-2.5 rounded-full transition-all hover:opacity-80"
                        style={{
                          backgroundColor: 'rgba(160, 200, 176, 0.15)',
                          color: '#5A7A68',
                          border: '1px solid rgba(160, 200, 176, 0.35)',
                        }}
                        onClick={handleConfirm}
                      >
                        ✓ 对，就是这样
                      </button>
                      <button
                        className="flex-1 text-sm px-4 py-2.5 rounded-full transition-all hover:opacity-80"
                        style={{
                          backgroundColor: 'rgba(200, 169, 110, 0.12)',
                          color: '#5C4A3A',
                          border: '1px solid rgba(200, 169, 110, 0.25)',
                        }}
                        onClick={() => { setShowSupplement(true); setSupplementInput('') }}
                      >
                        ✏️ 补充更多
                      </button>
                    </div>

                    {/* 补充输入 */}
                    <AnimatePresence>
                      {showSupplement && confirmationRound < MAX_ROUNDS && (
                        <motion.div
                          className="space-y-2"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: '#9C9088' }}>
                              补充更多信息帮助 AI 更准确地理解你
                            </span>
                            <span className="text-xs" style={{ color: '#C4B8B0' }}>
                              第 {confirmationRound}/{MAX_ROUNDS} 轮
                            </span>
                          </div>
                          <textarea
                            className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm resize-none outline-none transition-all"
                            style={{
                              borderColor: '#E0D8CC',
                              color: '#4A4036',
                              fontFamily: 'inherit',
                              minHeight: 60,
                            }}
                            placeholder="比如：这种感受通常在什么情况下出现？有什么具体例子？"
                            value={supplementInput}
                            onChange={(e) => setSupplementInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && supplementInput.trim()) {
                                e.preventDefault()
                                handleSupplement()
                              }
                            }}
                          />
                          <button
                            className="text-sm px-4 py-1.5 rounded-full transition-all hover:opacity-70"
                            style={{
                              backgroundColor: 'rgba(200, 169, 110, 0.1)',
                              color: '#5C4A3A',
                              border: '1px solid rgba(200, 169, 110, 0.2)',
                            }}
                            onClick={handleSupplement}
                            disabled={!supplementInput.trim() || isSupplementLoading}
                          >
                            {isSupplementLoading ? '分析中...' : '补充并重新分析'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {confirmationRound >= MAX_ROUNDS && (
                      <p className="text-xs text-center py-1" style={{ color: '#C4B8B0' }}>
                        补充已达上限，请选择确认或关闭 🌿
                      </p>
                    )}
                  </div>

                  {/* 对话历史摘要 */}
                  {confirmationRound > 1 && (
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      <label className="text-xs" style={{ color: '#C4B8B0' }}>
                        之前的补充记录
                      </label>
                      {conversationHistory.filter(m => m.role === 'user').slice(1).map((m, i) => (
                        <p key={i} className="text-xs" style={{ color: '#C4B8B0' }}>
                          补充 {i + 1}: {m.content.replace('补充信息：', '').length > 40
                            ? m.content.replace('补充信息：', '').slice(0, 40) + '...'
                            : m.content.replace('补充信息：', '')}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* 跳过直接看结果 */}
                  <button
                    className="w-full text-center text-sm py-1"
                    style={{ color: '#C4B8B0' }}
                    onClick={handleConfirm}
                  >
                    不补充，直接查看完整分析 →
                  </button>
                </div>
              )}

              {/* ====== 结果态 ====== */}
              {panelState === 'result' && result && (
                <div className="space-y-5">
                  {/* 核心信念名称 */}
                  {result.coreBeliefName && (
                    <div
                      className="px-4 py-3 rounded-lg text-center"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.08)',
                        border: '1px solid rgba(200, 169, 110, 0.2)',
                      }}
                    >
                      <span className="text-xs block mb-1" style={{ color: '#C4B8B0' }}>
                        核心信念
                      </span>
                      <span className="text-lg font-serif" style={{ color: '#5C4A3A' }}>
                        {result.coreBeliefName}
                      </span>
                    </div>
                  )}

                  {/* 洞察文字 */}
                  <div
                    className="px-4 py-3 rounded-lg text-sm leading-relaxed italic"
                    style={{
                      backgroundColor: 'rgba(200, 169, 110, 0.06)',
                      borderLeft: '2px solid #C8A96E',
                      color: '#4A4036',
                    }}
                  >
                    {result.insight}
                  </div>

                  {/* 视角转化 */}
                  {result.reframedPerspective && (
                    <div
                      className="px-4 py-3 rounded-lg text-sm leading-relaxed"
                      style={{
                        backgroundColor: 'rgba(160, 176, 200, 0.06)',
                        borderLeft: '2px solid #8BA4BC',
                        color: '#5A6A7A',
                      }}
                    >
                      <span className="text-xs block mb-1" style={{ color: '#8BA4BC' }}>
                        🔄 换个角度看
                      </span>
                      {result.reframedPerspective}
                    </div>
                  )}

                  {/* 反向推导 */}
                  {result.reverseDerivation && (
                    <div
                      className="px-3 py-2.5 rounded-lg text-xs leading-relaxed"
                      style={{
                        backgroundColor: 'rgba(160, 176, 200, 0.05)',
                        borderLeft: '2px solid #8BA4BC',
                        color: '#5A6A7A',
                      }}
                    >
                      <span className="text-xs block mb-0.5" style={{ color: '#8BA4BC' }}>
                        🔍 反向验证
                      </span>
                      {result.reverseDerivation}
                    </div>
                  )}

                  {/* 相似信念检测 */}
                  {result.similarExistingNodes.filter(sn => {
                    const n = store.nodes.find(n => n.id === sn.nodeId)
                    return n && !n.deletedAt
                  }).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        ⚡ 与已有信念相似
                      </label>
                      {result.similarExistingNodes.filter(sn => {
                        const n = store.nodes.find(n => n.id === sn.nodeId)
                        return n && !n.deletedAt
                      }).map((sn, i) => {
                        const existingNode = store.nodes.find(n => n.id === sn.nodeId && !n.deletedAt)
                        return (
                          <div
                            key={i}
                            className="px-3 py-2.5 rounded-lg space-y-2"
                            style={{
                              backgroundColor: 'rgba(200, 180, 160, 0.06)',
                              border: '1px solid rgba(200, 180, 160, 0.15)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className="text-sm font-medium cursor-pointer hover:underline"
                                style={{ color: '#4A4036' }}
                                onClick={() => {
                                  store.setFocusNode(sn.nodeId)
                                  store.selectNode(sn.nodeId)
                                  handleClose()
                                }}
                              >
                                {existingNode ? existingNode.content : sn.content}
                              </span>
                              <SimilarityBadge suggestion={sn.suggestion} />
                            </div>
                            <p className="text-xs" style={{ color: '#7A7670' }}>
                              {sn.similarityNote}
                            </p>
                            <SimilarAction
                              suggestion={sn.suggestion}
                              nodeId={sn.nodeId}
                              existingContent={sn.content}
                              onClose={handleClose}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 可能的信念结构 */}
                  {result.possibleCoreBelief && (
                    <div className="space-y-1">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        核心信念详述
                      </label>
                      <p className="text-sm" style={{ color: '#4A4036' }}>
                        {result.possibleCoreBelief}
                      </p>
                    </div>
                  )}

                  {result.possibleSubBeliefs.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        可能的附属信念
                      </label>
                      {result.possibleSubBeliefs.map((s, i) => (
                        <p key={i} className="text-sm" style={{ color: '#4A4036' }}>
                          · {s}
                        </p>
                      ))}
                    </div>
                  )}

                  {result.possiblePatterns.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        可能的模式
                      </label>
                      {result.possiblePatterns.map((s, i) => (
                        <p key={i} className="text-sm" style={{ color: '#4A4036' }}>
                          · {s}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* 逻辑关系梳理 */}
                  {result.logicalConnections.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        🔗 信念逻辑链
                      </label>
                      {result.logicalConnections.map((lc, i) => {
                        const fromNode = store.nodes.find(n => n.id === lc.fromId)
                          || resolveSuggestedNode(lc.fromId, result.suggestedNodes)
                        const toNode = store.nodes.find(n => n.id === lc.toId)
                          || resolveSuggestedNode(lc.toId, result.suggestedNodes)
                        const fromLabel = typeof fromNode === 'string'
                          ? fromNode
                          : fromNode?.content ?? `[${lc.fromId.replace(/suggested[_\s-]*node[_\s-]*/i, '建议节点').slice(0, 16)}]`
                        const toLabel = typeof toNode === 'string'
                          ? toNode
                          : toNode?.content ?? `[${lc.toId.replace(/suggested[_\s-]*node[_\s-]*/i, '建议节点').slice(0, 16)}]`
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-2 px-3 py-2 rounded-lg"
                            style={{ backgroundColor: 'rgba(200, 169, 110, 0.04)' }}
                          >
                            <span className="text-xs flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'rgba(200, 169, 110, 0.12)', color: '#5C4A3A' }}
                            >
                              {lc.relation}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 flex-wrap text-xs">
                                <span
                                  className="cursor-pointer hover:underline max-w-[200px]"
                                  style={{ color: '#4A4036', wordBreak: 'break-word' }}
                                  onClick={() => {
                                    if (fromNode && typeof fromNode !== 'string') {
                                      store.setFocusNode(fromNode.id)
                                      store.selectNode(fromNode.id)
                                    }
                                  }}
                                >
                                  {fromLabel}
                                </span>
                                <span style={{ color: '#C4B8B0' }}>→</span>
                                <span
                                  className="cursor-pointer hover:underline max-w-[200px]"
                                  style={{ color: '#4A4036', wordBreak: 'break-word' }}
                                  onClick={() => {
                                    if (toNode && typeof toNode !== 'string') {
                                      store.setFocusNode(toNode.id)
                                      store.selectNode(toNode.id)
                                    }
                                  }}
                                >
                                  {toLabel}
                                </span>
                              </div>
                              <p className="text-xs mt-0.5" style={{ color: '#7A7670' }}>
                                {lc.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 建议节点 - 带选择性接受开关 */}
                  {result.suggestedNodes.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        💡 建议添加到画布的节点（点击开关选择接受/拒绝）
                      </label>
                      <div className="space-y-2">
                        {result.suggestedNodes.map((node, i) => {
                          const isAccepted = acceptedNodes.has(i)
                          const isAdded = addedNodeIndices.has(i)
                          return (
                            <div
                              key={i}
                              className="flex items-center justify-between px-3 py-2 rounded-lg transition-all"
                              style={{
                                backgroundColor: isAdded
                                  ? 'rgba(160, 200, 176, 0.08)'
                                  : isAccepted
                                    ? 'rgba(200, 169, 110, 0.05)'
                                    : 'rgba(200, 169, 110, 0.02)',
                                border: isAccepted
                                  ? '1px solid rgba(200, 169, 110, 0.2)'
                                  : '1px solid rgba(200, 169, 110, 0.06)',
                                opacity: isAccepted ? 1 : 0.55,
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {/* 接受/拒绝开关 */}
                                <button
                                  className="flex-shrink-0 w-9 h-5 rounded-full transition-all duration-200 relative"
                                  style={{
                                    backgroundColor: isAccepted
                                      ? 'rgba(200, 169, 110, 0.4)'
                                      : 'rgba(200, 196, 180, 0.25)',
                                  }}
                                  onClick={() => toggleAcceptedNode(i)}
                                  title={isAccepted ? '已接受，点击拒绝' : '已拒绝，点击接受'}
                                >
                                  <span
                                    className="absolute top-0.5 w-4 h-4 rounded-full shadow-sm transition-all duration-200"
                                    style={{
                                      left: isAccepted ? 18 : 2,
                                      backgroundColor: isAccepted ? '#C8A96E' : '#C4B8B0',
                                    }}
                                  />
                                </button>
                                <span
                                  className="inline-block rounded-full flex-shrink-0"
                                  style={{
                                    width: 6, height: 6,
                                    backgroundColor: getNodeColor(node.type),
                                  }}
                                />
                                <div className="min-w-0">
                                  <span className="text-sm block" style={{
                                    color: '#4A4036',
                                    wordBreak: 'break-word',
                                    textDecoration: isAccepted ? 'none' : 'line-through',
                                  }}>
                                    {node.content}
                                  </span>
                                  <span className="text-xs" style={{ color: '#9C9088' }}>
                                    {getTypeLabel(node.type)}
                                  </span>
                                </div>
                              </div>
                              {isAdded ? (
                                <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#5A7A68' }}>
                                  已添加
                                </span>
                              ) : isAccepted ? (
                                <button
                                  className="text-xs flex-shrink-0 ml-2 px-2.5 py-1 rounded-full transition-all hover:opacity-70"
                                  style={{
                                    backgroundColor: 'rgba(200, 169, 110, 0.1)',
                                    color: '#5C4A3A',
                                    border: '1px solid rgba(200, 169, 110, 0.2)',
                                  }}
                                  onClick={() => handleAddNode(node, i)}
                                >
                                  + 单独添加
                                </button>
                              ) : (
                                <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#C4B8B0' }}>
                                  已拒绝
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-1">
                    <button
                      className="flex-1 text-sm px-4 py-2 rounded-full transition-all hover:opacity-80"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.15)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.3)',
                        opacity: allAdded ? 0.4 : 1,
                      }}
                      onClick={handleAddAll}
                      disabled={allAdded}
                    >
                      {allAdded ? '✓ 已添加' : `全部添加（${acceptedNodes.size}个）`}
                    </button>
                    <button
                      className="text-sm px-4 py-2 rounded-full transition-all hover:opacity-70"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.06)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.15)',
                      }}
                      onClick={() => {
                        setPanelState('confirming')
                        setFollowUpRound(0)
                      }}
                    >
                      返回确认
                    </button>
                    <button
                      className="text-sm px-4 py-2"
                      style={{ color: '#9C9088' }}
                      onClick={handleClose}
                    >
                      关闭
                    </button>
                  </div>

                  {/* 多轮追问 */}
                  <div
                    className="space-y-3 pt-2"
                    style={{ borderTop: '1px solid #E0D8CC' }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs" style={{ color: '#9C9088' }}>
                        还有想深入探讨的吗？
                      </label>
                      <span className="text-xs flex-shrink-0 ml-2" style={{
                        color: followUpRound >= MAX_ROUNDS ? '#C8A080' : '#C4B8B0',
                      }}>
                        追问 {followUpRound}/{MAX_ROUNDS} 轮
                      </span>
                    </div>
                    {followUpRound >= MAX_ROUNDS ? (
                      <p className="text-xs text-center py-2" style={{ color: '#C4B8B0' }}>
                        对话已达上限，感谢你的深入探索 🌿
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          className="input-underline flex-1 text-sm"
                          type="text"
                          placeholder="比如：「XX这个信念不太准」「还想加入YY信念」「这个说得对，还有呢？」"
                          value={followUpInput}
                          onChange={(e) => setFollowUpInput(e.target.value)}
                          disabled={isFollowUpLoading}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && followUpInput.trim()) {
                              handleFollowUp()
                            }
                          }}
                        />
                        <button
                          className="text-sm px-3 py-1 rounded-full transition-all hover:opacity-70 flex-shrink-0"
                          style={{
                            backgroundColor: 'rgba(200, 169, 110, 0.12)',
                            color: '#5C4A3A',
                            border: '1px solid rgba(200, 169, 110, 0.25)',
                          }}
                          onClick={handleFollowUp}
                          disabled={!followUpInput.trim() || isFollowUpLoading}
                        >
                          {isFollowUpLoading ? '...' : '追问'}
                        </button>
                      </div>
                    )}
                    {/* 对话历史摘要 */}
                    {conversationHistory.filter(m => m.role === 'user').length > 1 && (
                      <div className="space-y-0.5 max-h-16 overflow-y-auto">
                        {conversationHistory.filter(m => m.role === 'user').slice(1).map((m, i) => (
                          <p key={i} className="text-xs" style={{ color: '#C4B8B0' }}>
                            {i + 2}. {m.content.length > 40 ? m.content.slice(0, 40) + '...' : m.content}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ====== 辅助函数 ======

/** 尝试将逻辑链中的 ID 解析为建议节点 */
function resolveSuggestedNode(
  id: string,
  suggestedNodes: Array<{ content: string; type: string }>,
): { id: string; content: string } | string | null {
  let match = id.match(/suggested[_\s-]*node[_\s-]*(\d+)/i)
  if (!match) {
    match = id.match(/建议节点[_\s-]*(\d+)/i)
  }
  if (!match) {
    match = id.match(/^(\d+)$/)
  }
  if (match) {
    const index = parseInt(match[1], 10)
    if (index >= 0 && index < suggestedNodes.length) {
      return suggestedNodes[index].content
    }
  }
  return null
}

// ====== 辅助组件 ======

function SimilarityBadge({ suggestion }: { suggestion: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    merge:  { label: '建议合并', color: '#C87A5A', bg: 'rgba(200,122,90,0.1)' },
    refine: { label: '建议精炼', color: '#8BA4BC', bg: 'rgba(139,164,188,0.1)' },
    connect: { label: '建议连线', color: '#7AAA7A', bg: 'rgba(122,170,122,0.1)' },
    keep_separate: { label: '保持独立', color: '#9C9088', bg: 'rgba(156,144,136,0.06)' },
  }
  const cfg = config[suggestion] ?? config.keep_separate
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

function SimilarAction({
  suggestion,
  nodeId,
  existingContent,
  onClose,
}: {
  suggestion: string
  nodeId: string
  existingContent: string
  onClose: () => void
}) {
  const store = useBeliefStore()

  if (suggestion === 'keep_separate') return null

  const handleMerge = () => {
    const existingNode = store.nodes.find(n => n.id === nodeId)
    store.updateNode(nodeId, {
      markedForReview: true,
      userNote: (existingNode?.userNote ? existingNode.userNote + '\n' : '') + '[AI 建议合并] 新输入与当前信念内容相似，可考虑合并表述',
    })
    db.beliefNodes.update(nodeId, {
      markedForReview: true,
      userNote: (existingNode?.userNote ? existingNode.userNote + '\n' : '') + '[AI 建议合并] 新输入与当前信念内容相似，可考虑合并表述',
    })
    onClose()
  }

  const handleConnect = () => {
    store.selectNode(nodeId)
    onClose()
  }

  const handleRefine = () => {
    const existingNode = store.nodes.find(n => n.id === nodeId)
    store.updateNode(nodeId, {
      markedForReview: true,
      userNote: (existingNode?.userNote ? existingNode.userNote + '\n' : '') + '[AI 建议精炼] 可基于新输入精炼此信念的表述',
    })
    db.beliefNodes.update(nodeId, {
      markedForReview: true,
      userNote: (existingNode?.userNote ? existingNode.userNote + '\n' : '') + '[AI 建议精炼] 可基于新输入精炼此信念的表述',
    })
    onClose()
  }

  return (
    <div className="flex gap-1.5 pt-1 border-t" style={{ borderColor: 'rgba(224, 216, 204, 0.5)' }}>
      {suggestion === 'merge' && (
        <button
          className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-70"
          style={{
            backgroundColor: 'rgba(200,122,90,0.08)',
            color: '#8B5A3A',
            border: '1px solid rgba(200,122,90,0.2)',
          }}
          onClick={handleMerge}
        >
          标记并合并
        </button>
      )}
      {suggestion === 'refine' && (
        <button
          className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-70"
          style={{
            backgroundColor: 'rgba(139,164,188,0.08)',
            color: '#5A6A7A',
            border: '1px solid rgba(139,164,188,0.2)',
          }}
          onClick={handleRefine}
        >
          标记并精炼
        </button>
      )}
      {suggestion === 'connect' && (
        <button
          className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-70"
          style={{
            backgroundColor: 'rgba(122,170,122,0.08)',
            color: '#5A7A68',
            border: '1px solid rgba(122,170,122,0.2)',
          }}
          onClick={handleConnect}
        >
          选中节点去连线
        </button>
      )}
      <button
        className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-70"
        style={{ color: '#9C9088' }}
        onClick={onClose}
      >
        忽略
      </button>
    </div>
  )
}
