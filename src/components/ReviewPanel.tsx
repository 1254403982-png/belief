import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBeliefStore } from '../stores/useBeliefStore'
import { db } from '../db'
import { reviewBeliefs, type ReviewResult } from '../utils/deepseek'
import { getTypeLabel } from './utils'

interface Props {
  open: boolean
  reviewType: 'monthly' | 'weekly' | 'daily'
  onClose: () => void
}

type PanelState = 'loading' | 'result' | 'error' | 'empty'

// --- 小工具：态度建议 chip ---

const ATTITUDE_CONFIG: Record<string, { label: string; color: string; bg: string; activeBg: string }> = {
  break:    { label: '破除', color: '#C87A5A', bg: 'rgba(200,122,90,0.08)',  activeBg: 'rgba(200,122,90,0.2)' },
  strengthen: { label: '坚定', color: '#7AAA7A', bg: 'rgba(122,170,122,0.08)', activeBg: 'rgba(122,170,122,0.2)' },
  observe:  { label: '观察', color: '#9C9C8C', bg: 'rgba(156,156,140,0.08)',  activeBg: 'rgba(156,156,140,0.2)' },
}

function AttitudeChip({
  attitude,
  active,
  onClick,
}: {
  attitude: 'break' | 'strengthen' | 'observe'
  active: boolean
  onClick: () => void
}) {
  const cfg = ATTITUDE_CONFIG[attitude]
  return (
    <button
      type="button"
      className="text-xs px-2.5 py-0.5 rounded-full transition-all hover:opacity-80"
      style={{
        color: cfg.color,
        backgroundColor: active ? cfg.activeBg : cfg.bg,
        border: `1px solid ${active ? cfg.color : 'transparent'}`,
      }}
      onClick={onClick}
      title={active ? '已标记' : '点击应用此建议'}
    >
      {cfg.label}{active ? ' ✓' : ''}
    </button>
  )
}

export default function ReviewPanel({ open, reviewType, onClose }: Props) {
  const store = useBeliefStore()
  const [panelState, setPanelState] = useState<PanelState>('loading')
  const [result, setResult] = useState<ReviewResult | null>(null)

  const title = reviewType === 'monthly' ? '每月长期信念盘点' : reviewType === 'weekly' ? '每周信念清理' : '每日待办回顾'
  const icon = reviewType === 'monthly' ? '🌙' : reviewType === 'weekly' ? '🌟' : '📌'

  useEffect(() => {
    if (!open) return
    runReview()
  }, [open, reviewType])

  const runReview = async () => {
    setPanelState('loading')

    // 过滤相关节点
    let relevantNodes = store.nodes
    if (reviewType === 'monthly') {
      relevantNodes = store.nodes.filter(n => n.isLongTerm)
    } else if (reviewType === 'weekly') {
      relevantNodes = store.nodes.filter(n => n.markedForReview)
    } else {
      // daily: show all active nodes
      relevantNodes = store.nodes.filter(n => !n.deletedAt)
    }

    if (relevantNodes.length < 2) {
      setPanelState(relevantNodes.length === 0 ? 'empty' : 'result')
      if (relevantNodes.length === 0) return
    }

    const res = await reviewBeliefs(
      store.nodes.map(n => ({
        id: n.id, content: n.content, type: n.type,
        attitude: n.attitude, isLongTerm: n.isLongTerm,
      })),
      store.edges.map(e => ({ sourceId: e.sourceId, targetId: e.targetId })),
      reviewType,
    )

    if (!res) {
      setPanelState('error')
      return
    }
    setResult(res)
    setPanelState('result')
  }

  const handleComplete = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const user = await db.userAccounts.get(userId)
    if (!user?.reviewSettings) return
    const now = new Date().toISOString()
    if (reviewType === 'monthly') {
      await db.userAccounts.update(userId, {
        reviewSettings: { ...user.reviewSettings, lastMonthlyReview: now },
      })
    } else if (reviewType === 'weekly') {
      await db.userAccounts.update(userId, {
        reviewSettings: { ...user.reviewSettings, lastWeeklyReview: now },
      })
    } else {
      await db.userAccounts.update(userId, {
        reviewSettings: { ...user.reviewSettings, lastDailyReview: now },
      })
    }
    onClose()
  }

  const handleFocusNode = (nodeId: string) => {
    store.setFocusNode(nodeId)
    store.selectNode(nodeId)
    onClose()
  }

  const handleApplyAttitude = (nodeId: string, attitude: 'break' | 'strengthen' | 'observe') => {
    store.updateNode(nodeId, { attitude })
    db.beliefNodes.update(nodeId, { attitude })
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
            onClick={onClose}
          />

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
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <h3 className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
                {icon} {title}
              </h3>
              <button
                className="text-sm hover:opacity-70 transition-opacity"
                style={{ color: '#9C9088' }}
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-6 pb-6" style={{ maxHeight: 'calc(80vh - 70px)' }}>
              {/* 加载态 */}
              {panelState === 'loading' && (
                <div className="flex flex-col items-center py-12 space-y-4">
                  <span
                    className="inline-block w-4 h-4 rounded-full animate-pulse"
                    style={{ backgroundColor: '#C8A96E' }}
                  />
                  <p className="text-sm" style={{ color: '#9C9088' }}>
                    AI 正在回顾你的信念...
                  </p>
                </div>
              )}

              {/* 空状态 */}
              {panelState === 'empty' && (
                <div className="py-8 space-y-4">
                  <p className="text-sm text-center" style={{ color: '#9C9088' }}>
                    {reviewType === 'monthly'
                      ? '还没有标记为长期信念的节点'
                      : '还没有标记为待清理的节点'}
                  </p>
                  <div className="flex justify-center">
                    <button
                      className="text-sm px-4 py-1.5"
                      style={{ color: '#9C9088' }}
                      onClick={onClose}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}

              {/* 错误态 */}
              {panelState === 'error' && (
                <div className="space-y-4 py-4">
                  <p className="text-sm text-center" style={{ color: '#9C9088' }}>
                    梳理暂时无法进行，请稍后再试
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      className="text-sm px-4 py-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.1)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.25)',
                      }}
                      onClick={runReview}
                    >
                      重试
                    </button>
                    <button
                      className="text-sm px-4 py-1.5"
                      style={{ color: '#9C9088' }}
                      onClick={onClose}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              )}

              {/* 结果态 */}
              {panelState === 'result' && (
                <div className="space-y-5">
                  {/* 总结文字 */}
                  {result?.overallInsight ? (
                    <div
                      className="px-4 py-3 rounded-lg text-sm leading-relaxed italic"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.06)',
                        borderLeft: '2px solid #C8A96E',
                        color: '#4A4036',
                      }}
                    >
                      {result.overallInsight}
                    </div>
                  ) : (
                    <p className="text-sm text-center" style={{ color: '#9C9088' }}>
                      已经梳理完毕，暂时没有特别的发现 🌿
                    </p>
                  )}

                  {/* 节点洞察 */}
                  {result?.nodeInsights && result.nodeInsights.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        信念观察
                      </label>
                      {result.nodeInsights.map((ni, i) => {
                        const node = store.nodes.find(n => n.id === ni.nodeId)
                        const currentAttitude = node?.attitude
                        return (
                          <div
                            key={i}
                            className="px-3 py-2.5 rounded-lg space-y-2"
                            style={{ backgroundColor: 'rgba(200, 169, 110, 0.04)' }}
                          >
                            <button
                              className="w-full text-left"
                              onClick={() => handleFocusNode(ni.nodeId)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium" style={{ color: '#4A4036' }}>
                                  {node ? (node.content.length > 16 ? node.content.slice(0, 16) + '...' : node.content) : ni.nodeId}
                                </span>
                                <span className="text-xs" style={{ color: '#9C9088' }}>
                                  {node ? getTypeLabel(node.type) : ''}
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed" style={{ color: '#7A7670' }}>
                                {ni.observation}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: '#9C9088' }}>
                                {ni.suggestion}
                              </p>
                            </button>

                            {/* 态度建议 */}
                            {ni.suggestedAttitude && (
                              <div className="flex items-center gap-1.5 pt-1 border-t" style={{ borderColor: 'rgba(224, 216, 204, 0.5)' }}>
                                <span className="text-xs" style={{ color: '#C4B8B0' }}>
                                  AI 建议 →
                                </span>
                                <AttitudeChip
                                  attitude={ni.suggestedAttitude}
                                  active={currentAttitude === ni.suggestedAttitude}
                                  onClick={() => handleApplyAttitude(ni.nodeId, ni.suggestedAttitude!)}
                                />
                                <span className="text-xs" style={{ color: '#C4B8B0' }}>
                                  · 点击标记
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* 模式观察 */}
                  {result?.patternObservations && result.patternObservations.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs tracking-wide" style={{ color: '#9C9088' }}>
                        关联模式
                      </label>
                      {result.patternObservations.map((po, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 rounded-lg"
                          style={{ backgroundColor: 'rgba(200, 169, 110, 0.04)' }}
                        >
                          <p className="text-xs leading-relaxed" style={{ color: '#7A7670' }}>
                            {po.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 完成按钮 */}
                  <div className="flex justify-center pt-2">
                    <button
                      className="text-sm px-6 py-2 rounded-full transition-all hover:opacity-80"
                      style={{
                        backgroundColor: 'rgba(200, 169, 110, 0.15)',
                        color: '#5C4A3A',
                        border: '1px solid rgba(200, 169, 110, 0.3)',
                      }}
                      onClick={handleComplete}
                    >
                      完成梳理
                    </button>
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
