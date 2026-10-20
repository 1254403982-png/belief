import { tr } from '../i18n'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBeliefStore } from '../stores/useBeliefStore'
import { db, type BeliefNode, type BeliefEdge } from '../db'
import { exploreChain, type ChainExploreResult } from '../utils/deepseek'
import { getNodeColor, getTypeLabel, normalizeEdgeDirection, hasPath, findRedundantEdgeIds } from './utils'

interface Props {
  open: boolean
  onClose: () => void
  /** 链路中的节点 ID 集合 */
  chainNodeIds: Set<string>
}

type PanelState = 'loading' | 'result' | 'error'

export default function ChainExplorePanel({ open, onClose, chainNodeIds }: Props) {
  const store = useBeliefStore()
  const [panelState, setPanelState] = useState<PanelState>('loading')
  const [result, setResult] = useState<ChainExploreResult | null>(null)
  const [appliedRefinements, setAppliedRefinements] = useState<Set<string>>(new Set())
  const [addedNodes, setAddedNodes] = useState<Set<number>>(new Set())
  const [addedMissingLinks, setAddedMissingLinks] = useState<Set<number>>(new Set())

  // 打开时自动加载
  useEffect(() => {
    if (!open) return
    setPanelState('loading')
    setResult(null)
    setAppliedRefinements(new Set())
    setAddedNodes(new Set())
    setAddedMissingLinks(new Set())
    loadChainExplore()
  }, [open])

  const loadChainExplore = async () => {
    const chainNodes = store.nodes.filter(n => chainNodeIds.has(n.id) && !n.deletedAt)
    const chainEdges = store.edges.filter(e =>
      chainNodeIds.has(e.sourceId) && chainNodeIds.has(e.targetId)
    )

    const res = await exploreChain(
      chainNodes.map(n => ({ id: n.id, content: n.content, type: n.type })),
      chainEdges.map(e => ({ sourceId: e.sourceId, targetId: e.targetId })),
    )
    if (!res) {
      setPanelState('error')
      return
    }
    setResult(res)
    setPanelState('result')
  }

  const handleClose = () => {
    setPanelState('loading')
    setResult(null)
    setAppliedRefinements(new Set())
    setAddedNodes(new Set())
    setAddedMissingLinks(new Set())
    onClose()
  }

  const handleApplyRefinement = (refinement: ChainExploreResult['suggestedRefinements'][0]) => {
    store.updateNode(refinement.nodeId, { content: refinement.refinedContent })
    db.beliefNodes.update(refinement.nodeId, { content: refinement.refinedContent })
    setAppliedRefinements(prev => new Set(prev).add(refinement.nodeId))
  }

  const handleAddSuggestedNode = (node: { content: string; type: BeliefNode['type'] }, index: number) => {
    const userId = localStorage.getItem('currentUserId') || ''
    const id = crypto.randomUUID()
    // 以聚焦节点为锚点来计算位置
    const focusNode = store.nodes.find(n => n.id === store.focusNodeId)
    const anchorPos = focusNode?.position ?? { x: 0, y: 0 }
    const newNode: BeliefNode = {
      id,
      userId,
      type: node.type,
      content: node.content,
      position: {
        x: anchorPos.x + (Math.random() - 0.5) * 300,
        y: anchorPos.y + (Math.random() - 0.5) * 300,
        z: Math.random(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    }
    store.addNode(newNode)
    db.beliefNodes.add(newNode)
    // 自动连接到聚焦节点（原链路中的节点）
    if (focusNode) {
      const dir = normalizeEdgeDirection(focusNode.id, id, focusNode.type, node.type)
      const existingEdges = store.edges
      if (!hasPath(dir.sourceId, dir.targetId, existingEdges) &&
          !existingEdges.some(e => (e.sourceId === dir.sourceId && e.targetId === dir.targetId) ||
                                    (e.sourceId === dir.targetId && e.targetId === dir.sourceId))) {
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
        const redundantIds = findRedundantEdgeIds([dir.sourceId, dir.targetId], [...existingEdges, edge])
        for (const rid of redundantIds) {
          if (rid === edge.id) continue
          store.removeEdge(rid)
          db.beliefEdges.delete(rid)
        }
      }
    }
    setAddedNodes(prev => new Set(prev).add(index))
  }

  const handleAddMissingLink = (ml: ChainExploreResult['missingLinks'][0], index: number) => {
    const userId = localStorage.getItem('currentUserId') || ''
    // 查找链路中匹配 fromContent / toContent 的节点
    const chainNodes = store.nodes.filter(n => chainNodeIds.has(n.id) && !n.deletedAt)
    const findNode = (content: string) => {
      // 先按 ID 精确匹配
      let found = chainNodes.find(n => n.id === content)
      if (found) return found
      // 再按内容精确匹配
      found = chainNodes.find(n => n.content === content)
      if (found) return found
      // 最后按内容包含匹配（取第一个）
      found = chainNodes.find(n => content.includes(n.content) || n.content.includes(content))
      return found
    }
    const fromNode = findNode(ml.fromContent)
    const toNode = findNode(ml.toContent)

    // 如果有建议的中间节点，先创建它
    let bridgeNodeId: string | null = null
    if (ml.suggestedNode) {
      bridgeNodeId = crypto.randomUUID()
      // 以 fromNode 和 toNode 的中点作为位置
      const midX = fromNode && toNode
        ? (fromNode.position.x + toNode.position.x) / 2
        : (Math.random() - 0.5) * 300
      const midY = fromNode && toNode
        ? (fromNode.position.y + toNode.position.y) / 2
        : (Math.random() - 0.5) * 300
      const bridgeNode: BeliefNode = {
        id: bridgeNodeId,
        userId,
        type: ml.suggestedNode.type,
        content: ml.suggestedNode.content,
        position: {
          x: midX + (Math.random() - 0.5) * 60,
          y: midY + (Math.random() - 0.5) * 60,
          z: Math.random(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
      }
      store.addNode(bridgeNode)
      db.beliefNodes.add(bridgeNode)

      // 创建 fromNode → bridgeNode 的连线
      if (fromNode) {
        const dir = normalizeEdgeDirection(fromNode.id, bridgeNodeId, fromNode.type, ml.suggestedNode.type)
        const existingEdges = store.edges
        if (!hasPath(dir.sourceId, dir.targetId, existingEdges) &&
            !existingEdges.some(e => (e.sourceId === dir.sourceId && e.targetId === dir.targetId) ||
                                      (e.sourceId === dir.targetId && e.targetId === dir.sourceId))) {
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
          const redundantIds = findRedundantEdgeIds([dir.sourceId, dir.targetId], [...existingEdges, edge])
          for (const rid of redundantIds) {
            if (rid === edge.id) continue
            store.removeEdge(rid)
            db.beliefEdges.delete(rid)
          }
        }
      }

      // 创建 bridgeNode → toNode 的连线
      if (toNode) {
        const dir = normalizeEdgeDirection(bridgeNodeId, toNode.id, ml.suggestedNode.type, toNode.type)
        const existingEdges = store.edges
        if (!hasPath(dir.sourceId, dir.targetId, existingEdges) &&
            !existingEdges.some(e => (e.sourceId === dir.sourceId && e.targetId === dir.targetId) ||
                                      (e.sourceId === dir.targetId && e.targetId === dir.sourceId))) {
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
          const redundantIds = findRedundantEdgeIds([dir.sourceId, dir.targetId], [...existingEdges, edge])
          for (const rid of redundantIds) {
            if (rid === edge.id) continue
            store.removeEdge(rid)
            db.beliefEdges.delete(rid)
          }
        }
      }
    }
    setAddedMissingLinks(prev => new Set(prev).add(index))
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(74, 64, 54, 0.06)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          <motion.div
            className="relative w-full max-w-lg mx-6 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: 'rgba(255, 251, 245, 0.97)',
              backdropFilter: 'blur(16px)',
              border: '1px solid #E0D8CC',
              boxShadow: '0 8px 40px rgba(74, 64, 54, 0.1)',
              maxHeight: '80vh',
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h3 className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
                {tr("🔍 链路深度挖掘")}
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
              {panelState === 'loading' && (
                <div className="flex flex-col items-center py-12 space-y-4">
                  <span className="inline-block w-4 h-4 rounded-full animate-pulse"
                    style={{ backgroundColor: '#C8A96E' }}
                  />
                  <p className="text-sm" style={{ color: '#9C9088' }}>{tr("正在分析这条信念链路...")}</p>
                </div>
              )}

              {panelState === 'error' && (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-center" style={{ color: '#9C9088' }}>
                    {tr("AI 暂时无法回应，请稍后再试")}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      className="text-sm px-4 py-1.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.1)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.25)',
                      }}
                      onClick={loadChainExplore}
                    >
                      {tr("重试")}
                    </button>
                    <button className="text-sm px-4 py-1.5" style={{ color: '#9C9088' }} onClick={handleClose}>
                      {tr("关闭")}
                    </button>
                  </div>
                </div>
              )}

              {panelState === 'result' && result && (
                <div className="space-y-5">
                  {/* 洞察 */}
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

                  {/* 建议精炼已有信念 */}
                  {result.suggestedRefinements.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        {tr("✨ 更精准的表达")}
                      </label>
                      {result.suggestedRefinements.map((ref, i) => {
                        const isApplied = appliedRefinements.has(ref.nodeId)
                        const node = store.nodes.find(n => n.id === ref.nodeId)
                        return (
                          <div
                            key={i}
                            className="px-3 py-2.5 rounded-lg space-y-2"
                            style={{
                              backgroundColor: 'rgba(139, 164, 188, 0.06)',
                              border: '1px solid rgba(139, 164, 188, 0.15)',
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: '#8BA4BC' }}>
                                {tr("原:")}
                              </span>
                              <span className="text-sm line-through" style={{ color: '#9C9088' }}>
                                {node?.content ?? ref.originalContent}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: '#5A7A68' }}>
                                {tr("新:")}
                              </span>
                              <span className="text-sm" style={{ color: '#4A4036' }}>
                                {ref.refinedContent}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: '#7A7670' }}>{ref.reason}</p>
                            {isApplied ? (
                              <span className="text-xs" style={{ color: '#5A7A68' }}>{tr("✓ 已应用")}</span>
                            ) : (
                              <button
                                className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-70"
                                style={{
                                  backgroundColor: 'rgba(139, 164, 188, 0.1)',
                                  color: '#5A6A7A',
                                  border: '1px solid rgba(139, 164, 188, 0.25)',
                                }}
                                onClick={() => handleApplyRefinement(ref)}
                              >
                                {tr("替换表述")}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 缺失环节 */}
                  {result.missingLinks.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        {tr("🔗 可能缺失的环节")}
                      </label>
                      {result.missingLinks.map((ml, i) => {
                        const isAdded = addedMissingLinks.has(i)
                        return (
                          <div
                            key={i}
                            className="px-3 py-2.5 rounded-lg space-y-2"
                            style={{
                              backgroundColor: 'rgba(200, 180, 160, 0.06)',
                              border: '1px solid rgba(200, 180, 160, 0.15)',
                            }}
                          >
                            <div className="flex items-center gap-1.5 text-xs">
                              <span style={{ color: '#4A4036' }}>{ml.fromContent}</span>
                              <span style={{ color: '#C4B8B0' }}>→ ? →</span>
                              <span style={{ color: '#4A4036' }}>{ml.toContent}</span>
                            </div>
                            <p className="text-xs" style={{ color: '#7A7670' }}>{ml.relation}</p>
                            {ml.suggestedNode && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded"
                                  style={{ backgroundColor: 'rgba(200, 169, 110, 0.08)', color: '#5C4A3A' }}
                                >
                                  {ml.suggestedNode.content} · {getTypeLabel(ml.suggestedNode.type)}
                                </span>
                              </div>
                            )}
                            {isAdded ? (
                              <span className="text-xs" style={{ color: '#5A7A68' }}>{tr("✓ 已添加")}</span>
                            ) : (
                              <button
                                className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-70"
                                style={{
                                  backgroundColor: 'rgba(200, 169, 110, 0.1)',
                                  color: '#5C4A3A',
                                  border: '1px solid rgba(200, 169, 110, 0.2)',
                                }}
                                onClick={() => handleAddMissingLink(ml, i)}
                              >
                                {ml.suggestedNode ? tr("添加桥接节点") : tr("标记")}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 建议新增节点 */}
                  {result.suggestedNodes.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        {tr("🌱 建议新增的节点")}
                      </label>
                      {result.suggestedNodes.map((node, i) => {
                        const isAdded = addedNodes.has(i)
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded-lg"
                            style={{
                              backgroundColor: isAdded
                                ? 'rgba(160, 200, 176, 0.06)'
                                : 'rgba(200, 169, 110, 0.04)',
                              border: '1px solid transparent',
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="inline-block rounded-full flex-shrink-0"
                                style={{ width: 8, height: 8, backgroundColor: getNodeColor(node.type) }}
                              />
                              <div className="min-w-0">
                                <span className="text-sm block" style={{ color: '#4A4036', wordBreak: 'break-word' }}>
                                  {node.content}
                                </span>
                                <span className="text-xs" style={{ color: '#9C9088' }}>
                                  {getTypeLabel(node.type)}
                                </span>
                              </div>
                            </div>
                            {isAdded ? (
                              <span className="text-xs flex-shrink-0 ml-2" style={{ color: '#5A7A68' }}>{tr("已添加")}</span>
                            ) : (
                              <button
                                className="text-xs flex-shrink-0 ml-2 px-2.5 py-1 rounded-full transition-all hover:opacity-70"
                                style={{
                                  backgroundColor: 'rgba(200, 169, 110, 0.1)',
                                  color: '#5C4A3A',
                                  border: '1px solid rgba(200, 169, 110, 0.2)',
                                }}
                                onClick={() => handleAddSuggestedNode(node, i)}
                              >
                                {tr("+ 添加")}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <button
                    className="text-sm px-4 py-2 w-full"
                    style={{ color: '#9C9088' }}
                    onClick={handleClose}
                  >
                    {tr("关闭")}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
