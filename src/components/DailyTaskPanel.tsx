import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBeliefStore } from '../stores/useBeliefStore'
import { db, type DailyTask } from '../db'
import { classifyInput, type ClassifyResult } from '../utils/deepseek'
import { normalizeEdgeDirection, findDuplicateNode, hasPath, findRedundantEdgeIds } from './utils'
import { getTypeLabel } from './utils'

interface Props {
  open: boolean
  onClose: () => void
  onTaskCountChange: (count: number) => void
}

type ClassifyState =
  | { stage: 'idle' }
  | { stage: 'loading' }
  | { stage: 'result'; taskId: string; result: ClassifyResult; content: string }
  | { stage: 'error' }

export default function DailyTaskPanel({ open, onClose, onTaskCountChange }: Props) {
  const store = useBeliefStore()
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [classifyState, setClassifyState] = useState<ClassifyState>({ stage: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().slice(0, 10)

  const loadTasks = async () => {
    const userId = localStorage.getItem('currentUserId')
    if (!userId) return
    const all = await db.dailyTasks
      .where('userId').equals(userId)
      .and(t => t.status === 'pending' && t.date === today)
      .toArray()
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setTasks(all)
    onTaskCountChange(all.length)
  }

  useEffect(() => {
    if (open) {
      loadTasks()
      setClassifyState({ stage: 'idle' })
    }
  }, [open])

  const handleDelete = async (taskId: string) => {
    await db.dailyTasks.delete(taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    onTaskCountChange(tasks.length - 1)
  }

  const handleDone = async (taskId: string) => {
    await db.dailyTasks.update(taskId, { status: 'done' })
    setTasks(prev => prev.filter(t => t.id !== taskId))
    onTaskCountChange(tasks.length - 1)
  }

  const handleClassify = async (taskId: string, content: string) => {
    setClassifyState({ stage: 'loading' })

    const existingNodes = store.nodes
      .filter(n => !n.deletedAt)
      .map(n => ({ id: n.id, content: n.content, type: n.type }))

    const result = await classifyInput(content, existingNodes)
    if (!result) {
      setClassifyState({ stage: 'error' })
      return
    }
    setClassifyState({ stage: 'result', taskId, result, content })
  }

  const handleConfirmClassify = async () => {
    if (classifyState.stage !== 'result') return
    const { taskId, result } = classifyState

    const userId = localStorage.getItem('currentUserId')
    if (!userId) return

    // 重复检测
    const duplicate = findDuplicateNode(result.polishedContent, store.nodes)
    if (duplicate) {
      window.alert('这个想法已经存在了：\n"' + (duplicate.content.length > 30 ? duplicate.content.slice(0, 30) + '...' : duplicate.content) + '"')
      setClassifyState({ stage: 'idle' })
      return
    }

    const node = {
      id: crypto.randomUUID(),
      userId,
      type: result.type,
      content: result.polishedContent,
      category: result.category,
      position: {
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200,
        z: 0.5,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active' as const,
    }
    store.addNode(node)
    await db.beliefNodes.add(node)

    // 处理建议的连接
    if (result.relatedNodeIds.length > 0) {
      for (const connectId of result.relatedNodeIds) {
        const connectNode = store.nodes.find(n => n.id === connectId)
        if (!connectNode) continue
        // 冗余检查
        const existingEdges = store.edges
        const dir = normalizeEdgeDirection(node.id, connectId, node.type, connectNode.type)
        if (hasPath(dir.sourceId, dir.targetId, existingEdges)) continue
        if (existingEdges.some(e => (e.sourceId === dir.sourceId && e.targetId === dir.targetId) ||
                                     (e.sourceId === dir.targetId && e.targetId === dir.sourceId))) continue
        const edge = {
          id: crypto.randomUUID(),
          userId,
          sourceId: dir.sourceId,
          targetId: dir.targetId,
          type: 'suggested_by_ai' as const,
          strength: 0.5,
          createdAt: new Date(),
        }
        store.addEdge(edge)
        await db.beliefEdges.add(edge)
        // 清理冗余连线
        const redundantIds = findRedundantEdgeIds([dir.sourceId, dir.targetId], [...existingEdges, edge])
        for (const rid of redundantIds) {
          if (rid === edge.id) continue
          store.removeEdge(rid)
          await db.beliefEdges.delete(rid)
        }
      }
    }

    // 标记任务已完成
    await db.dailyTasks.update(taskId, { status: 'done' })
    setTasks(prev => prev.filter(t => t.id !== taskId))
    onTaskCountChange(tasks.length - 1)
    setClassifyState({ stage: 'idle' })
  }

  const handleCancelClassify = () => {
    setClassifyState({ stage: 'idle' })
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="drawer-panel fixed right-0 top-0 bottom-0 w-full md:w-80 z-30 flex flex-col"
        initial={{ x: 320 }}
        animate={{ x: 0 }}
        exit={{ x: 320 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="font-serif text-lg" style={{ color: '#5C4A3A' }}>
            📌 今日待办
          </h3>
          <button
            className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: '#9C9088' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
          {/* 提示 */}
          <p className="text-xs leading-relaxed" style={{ color: '#C4B8B0' }}>
            快速捕捉一闪而过的想法，稍后再逐一处理。
            <br />
            输入框中按 <kbd style={{ color: '#C8A96E' }}>Ctrl+Enter</kbd> 即可添加。
          </p>

          {/* 任务列表 */}
          {tasks.length === 0 && classifyState.stage === 'idle' && (
            <p className="text-sm text-center py-8" style={{ color: '#C4B8B0' }}>
              今天还没有待办，去捕捉一些想法吧
            </p>
          )}

          {tasks.map(task => (
            <div
              key={task.id}
              className="rounded-lg px-3 py-2.5"
              style={{
                backgroundColor: 'rgba(200, 169, 110, 0.04)',
                border: '1px solid rgba(200, 169, 110, 0.08)',
              }}
            >
              <p className="text-sm leading-relaxed mb-2" style={{ color: '#4A4036', wordBreak: 'break-word' }}>
                {task.content}
              </p>
              <div className="flex gap-2">
                <button
                  className="text-xs px-2.5 py-1 rounded-full transition-all hover:opacity-70"
                  style={{
                    color: '#5A7A68',
                    backgroundColor: 'rgba(160, 200, 176, 0.1)',
                    border: '1px solid rgba(160, 200, 176, 0.15)',
                  }}
                  onClick={() => handleClassify(task.id, task.content)}
                  disabled={classifyState.stage === 'loading'}
                >
                  🤖 AI 分类
                </button>
                <button
                  className="text-xs px-2.5 py-1 rounded-full transition-all hover:opacity-70"
                  style={{
                    color: '#9C9088',
                    backgroundColor: 'rgba(200, 196, 180, 0.08)',
                    border: '1px solid rgba(200, 196, 180, 0.12)',
                  }}
                  onClick={() => handleDone(task.id)}
                >
                  完成
                </button>
                <button
                  className="text-xs px-2.5 py-1 rounded-full transition-all hover:opacity-70 ml-auto"
                  style={{ color: '#C8A080' }}
                  onClick={() => handleDelete(task.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}

          {/* AI 分类结果 */}
          {classifyState.stage === 'loading' && (
            <div className="text-center py-8">
              <span
                className="inline-block w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: '#C8A96E' }}
              />
              <p className="text-xs mt-2" style={{ color: '#9C9088' }}>AI 正在分析...</p>
            </div>
          )}

          {classifyState.stage === 'error' && (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: '#C8A080' }}>分析失败，请重试</p>
              <button
                className="text-xs mt-2 px-3 py-1 rounded-full"
                style={{ color: '#C8A96E', border: '1px solid rgba(200, 169, 110, 0.3)' }}
                onClick={handleCancelClassify}
              >
                返回
              </button>
            </div>
          )}

          {classifyState.stage === 'result' && (
            <div className="rounded-lg px-3 py-3 space-y-2.5"
              style={{
                backgroundColor: 'rgba(200, 169, 110, 0.06)',
                border: '1px solid rgba(200, 169, 110, 0.15)',
              }}
            >
              <p className="text-xs font-medium" style={{ color: '#C8A96E' }}>AI 分析结果</p>
              <div>
                <span className="text-xs" style={{ color: '#9C9088' }}>类型：</span>
                <span className="text-xs ml-1" style={{ color: '#4A4036' }}>
                  {getTypeLabel(classifyState.result.type)}
                </span>
              </div>
              {classifyState.result.category && (
                <div>
                  <span className="text-xs" style={{ color: '#9C9088' }}>领域：</span>
                  <span className="text-xs ml-1" style={{ color: '#4A4036' }}>
                    {classifyState.result.category}
                  </span>
                </div>
              )}
              <div>
                <span className="text-xs" style={{ color: '#9C9088' }}>内容：</span>
                <p className="text-sm mt-0.5" style={{ color: '#4A4036', wordBreak: 'break-word' }}>
                  {classifyState.result.polishedContent}
                </p>
              </div>
              {classifyState.result.relatedNodeIds.length > 0 && (
                <div>
                  <span className="text-xs" style={{ color: '#9C9088' }}>
                    将关联 {classifyState.result.relatedNodeIds.length} 个已有节点
                  </span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-70"
                  style={{
                    color: '#5A7A68',
                    backgroundColor: 'rgba(160, 200, 176, 0.12)',
                    border: '1px solid rgba(160, 200, 176, 0.2)',
                  }}
                  onClick={handleConfirmClassify}
                >
                  ✓ 确认添加
                </button>
                <button
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:opacity-70"
                  style={{
                    color: '#9C9088',
                    backgroundColor: 'rgba(200, 196, 180, 0.08)',
                    border: '1px solid rgba(200, 196, 180, 0.12)',
                  }}
                  onClick={handleCancelClassify}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
