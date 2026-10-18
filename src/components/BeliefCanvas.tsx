import { useRef, useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBeliefStore } from '../stores/useBeliefStore'
import { db, type BeliefNode, type BeliefEdge, type DailyTask } from '../db'
import NodeDetailPanel from './NodeDetailPanel'
import BeliefDrawer from './BeliefDrawer'
import AISuggestionToast from './AISuggestionToast'
import ExplorationPanel from './ExplorationPanel'
import SettingsPanel from './SettingsPanel'
import ReviewPanel from './ReviewPanel'
import EdgeInfoPopup from './EdgeInfoPopup'
import CreateLinkDialog from './CreateLinkDialog'
import ToolbarIcon from './ToolbarIcon'
import NianNian from './NianNian'
import DailyActionPanel from './DailyActionPanel'
import UserManualPanel from './UserManualPanel'
import OnboardingGuide from './OnboardingGuide'
import { classifyInput, describeAIRequestFailure, hasMeaningfulPolish, type ClassifyResult } from '../utils/deepseek'

import {
  getNodeColor,
  formatDate,
  getNodeRadius,
  getTypeLabel,
  getEdgeColor,
  hexToRgba,
  TYPE_HIERARCHY,
  getConnectedComponent,
  getConnectedWithDistance,
  findDuplicateNode,
} from './utils'
import { isSamePair, isDirectionalLink } from '../utils/beliefLinks'

const BookQAPanel = lazy(() => import('./BookQAPanel'))

// ====== 坐标转换 ======

function screenToWorld(
  sx: number, sy: number,
  canvasW: number, canvasH: number,
  offsetX: number, offsetY: number, scale: number
): { x: number; y: number } {
  return {
    x: (sx - canvasW / 2 - offsetX) / scale,
    y: (sy - canvasH / 2 - offsetY) / scale,
  }
}
// ====== 命中检测 ======
function hitTest(
  worldX: number, worldY: number,
  nodes: BeliefNode[]
): BeliefNode | null {
  // 从上层开始检测（后画的在上面）
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    const r = getNodeRadius(n.type) + 6 // 加一点容错
    const dx = worldX - n.position.x
    const dy = worldY - n.position.y
    if (dx * dx + dy * dy <= r * r) {
      return n
    }
  }
  return null
}

// 连线命中检测：点到线段的最短距离 < 阈值
function edgeHitTest(
  worldX: number, worldY: number,
  nodes: BeliefNode[],
  edges: BeliefEdge[],
  threshold: number = 10
): string | null {
  for (const edge of edges) {
    const source = nodes.find(n => n.id === edge.sourceId)
    const target = nodes.find(n => n.id === edge.targetId)
    if (!source || !target) continue
    if (source.deletedAt || target.deletedAt) continue
    const dist = pointToSegmentDist(
      worldX, worldY,
      source.position.x, source.position.y,
      target.position.x, target.position.y
    )
    if (dist < threshold) return edge.id
  }
  return null
}

function pointToSegmentDist(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const nearX = ax + t * dx
  const nearY = ay + t * dy
  return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2)
}

// ====== ContextMenu 组件 ======
function ContextMenu({
  x, y, node, onClose, onConnect,
}: {
  x: number; y: number
  node: BeliefNode
  onClose: () => void
  onConnect: (nodeId: string) => void
}) {
  const store = useBeliefStore()

  const actions = [
    {
      label: '🔗 建立连接',
      action: () => {
        onConnect(node.id)
      },
    },
    {
      label: '标记为待清理',
      action: () => {
        store.updateNode(node.id, { markedForReview: true })
        db.beliefNodes.update(node.id, { markedForReview: true })
      },
    },
    {
      label: node.isLongTerm ? '取消长期信念' : '标记为长期信念',
      action: () => {
        store.updateNode(node.id, { isLongTerm: !node.isLongTerm })
        db.beliefNodes.update(node.id, { isLongTerm: !node.isLongTerm })
      },
    },
    {
      label: '删除',
      action: () => {
        store.updateNode(node.id, { deletedAt: new Date() })
        db.beliefNodes.update(node.id, { deletedAt: new Date() })
      },
      danger: true,
    },
  ]

  useEffect(() => {
    const handler = () => onClose()
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  return (
    <div
      className="fixed z-50 py-1 rounded-lg shadow-sm"
      style={{
        left: x,
        top: y,
        backgroundColor: 'rgba(255, 251, 245, 0.96)',
        backdropFilter: 'blur(8px)',
        border: '1px solid #E0D8CC',
        minWidth: 160,
      }}
    >
      {actions.map((a) => (
        <button
          key={a.label}
          className="w-full text-left px-4 py-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: a.danger ? '#C8A080' : '#4A4036' }}
          onClick={(e) => {
            e.stopPropagation()
            a.action()
            onClose()
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

// ====== 主组件 ======
export default function BeliefCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const store = useBeliefStore()

  // 交互状态
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const [dragNodeId, setDragNodeId] = useState<string | null>(null)
  const [pendingLink, setPendingLink] = useState<{ sourceId: string; targetId: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: BeliefNode } | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [connectMode, setConnectMode] = useState<string | null>(null) // 连接模式：source node id
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [explorationSessionId, setExplorationSessionId] = useState<string | undefined>()
  const [explorationSourceNodeId, setExplorationSourceNodeId] = useState<string | undefined>()
  const [onboardingStep, setOnboardingStep] = useState(0) // 0=关闭，1-4=按需引导
  const guideStartNodeIdsRef = useRef<Set<string>>(new Set())
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [dailyPanelOpen, setDailyPanelOpen] = useState(false)
  const [dailyTaskCount, setDailyTaskCount] = useState(0)
  const [manualOpen, setManualOpen] = useState(false)
  const [bookQAOpen, setBookQAOpen] = useState(false)
  const [bookQAHasOpened, setBookQAHasOpened] = useState(false)
  const [edgePopup, setEdgePopup] = useState<{ edgeId: string; screenX: number; screenY: number } | null>(null)
  const selectedEdgeRef = useRef<string | null>(null)

  // AI 建议状态
  const [inputValue, setInputValue] = useState('')
  const [aiToast, setAiToast] = useState<{
    visible: boolean; loading: boolean; error: boolean; errorMessage?: string
    originalText: string; result: ClassifyResult | null
    duplicate?: { id: string; content: string } | null
  }>({ visible: false, loading: false, error: false, originalText: '', result: null })
  const [deepInsightOpen, setDeepInsightOpen] = useState(false)
  const [reviewReminder, setReviewReminder] = useState<'monthly' | 'weekly' | 'daily' | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewType, setReviewType] = useState<'monthly' | 'weekly' | 'daily'>('monthly')
  // 梳理提醒
  // 同步 ref 给渲染循环用
  useEffect(() => { selectedEdgeRef.current = selectedEdgeId }, [selectedEdgeId])
  const mountedRef = useRef(false)

  // 力导向布局
  const forceVelocitiesRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [forceEnabled, setForceEnabled] = useState(false)

  useEffect(() => {
    if (onboardingStep > 0 && onboardingStep < 3 && store.nodes.some(node => !guideStartNodeIdsRef.current.has(node.id))) {
      setOnboardingStep(3)
      const userId = localStorage.getItem('currentUserId')
      if (userId) void db.userAccounts.update(userId, { hasCompletedOnboarding: true })
    }
  }, [onboardingStep, store.nodes])
  const forceEnabledRef = useRef(false)
  const draggingNodeRef = useRef(false)
  useEffect(() => { forceEnabledRef.current = forceEnabled }, [forceEnabled])
  const forceFrameCountRef = useRef(0)

  // 长按聚焦
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const focusAlphaRef = useRef(0) // 聚焦过渡 alpha：0=全景, 1=聚焦
  const LONG_PRESS_DURATION = 600
  const LONG_PRESS_MOVE_THRESHOLD = 8 // 像素，超过此移动距离取消长按

  // 惯性滑行
  const inertiaAnimRef = useRef<number | null>(null)
  const velocityRef = useRef({ x: 0, y: 0 })
  const lastPanTimeRef = useRef(0)
  const lastPanPosRef = useRef({ x: 0, y: 0 })
  const DRAG_CONNECT_DISTANCE = 50

  // 恢复原版链式拖拽：每次按下重新记录整条链的起点。
  const chainOriginRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const dragPointerStartRef = useRef({ x: 0, y: 0 })
  // 拖拽偏移：点击位置相对于节点中心的世界坐标偏移
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // 双指缩放（触摸）
  const pinchDistRef = useRef(0)        // 初始双指距离
  const pinchScaleRef = useRef(1)       // 初始缩放值
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  // 释怀粒子系统
  interface ReleaseParticle {
    nodeId: string
    x: number; y: number
    vx: number; vy: number
    alpha: number
    color: string
    size: number
  }
  const releaseParticlesRef = useRef<ReleaseParticle[]>([])
  const releaseTimersRef = useRef<Map<string, number>>(new Map()) // nodeId → startTime
  const RELEASE_DURATION = 2500 // 2.5 秒释怀动画（缓慢优雅）
  const MAX_PAN_RADIUS = 500 // 画布最大平移半径（世界坐标），超出即回弹

  // 性能优化：空闲降帧
  const lastActivityRef = useRef(Date.now())
  const idleFrameRef = useRef<number | null>(null)
  const IDLE_THRESHOLD = 3000 // 3 秒无交互降为 ~10fps

  /** 基于节点质心限制 offset，防止用户拖太远找不到节点 */
  const clampOffset = useCallback((ox: number, oy: number) => {
    const nodes = useBeliefStore.getState().nodes
    if (nodes.length === 0) return { ox, oy }

    // 计算节点质心（世界坐标）
    let cx = 0, cy = 0
    for (const n of nodes) { cx += n.position.x; cy += n.position.y }
    cx /= nodes.length
    cy /= nodes.length

    // 屏幕中心应对齐质心 → offsetX = -cx, offsetY = -cy 时质心在正中间
    // 允许在质心周围 MAX_PAN_RADIUS 范围内平移
    const baseOX = -cx
    const baseOY = -cy
    return {
      ox: Math.max(baseOX - MAX_PAN_RADIUS, Math.min(baseOX + MAX_PAN_RADIUS, ox)),
      oy: Math.max(baseOY - MAX_PAN_RADIUS, Math.min(baseOY + MAX_PAN_RADIUS, oy)),
    }
  }, [])

  // 力导向布局
  // 登录检查 + 加载数据
  // 防止 StrictMode 双重 effect 导致误判
  const authCheckedRef = useRef(false)

  useEffect(() => {
    if (authCheckedRef.current) return
    authCheckedRef.current = true

    const userId = localStorage.getItem('currentUserId')
    if (!userId) {
      navigate('/', { replace: true })
      return
    }

    // 验证用户存在于数据库
    db.userAccounts.get(userId).then(user => {
      if (!user) {
        localStorage.removeItem('currentUserId')
        navigate('/', { replace: true })
        return
      }
      loadData(userId)
    })
  }, [])

  const loadData = async (userId: string) => {
    // 自动清理：删除 deletedAt 超过 7 天的节点
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const expired = await db.beliefNodes.where('deletedAt').below(cutoff).and(node => node.userId === userId).toArray()
    for (const n of expired) {
      await db.beliefNodes.delete(n.id)
      await db.beliefEdges.where('sourceId').equals(n.id).or('targetId').equals(n.id).delete()
    }

    const allNodes = await db.beliefNodes.where('userId').equals(userId).toArray()
    // 过滤软删除的节点（不显示在画布上）
    const nodes = allNodes.filter(n => !n.deletedAt)
    const activeIds = new Set(nodes.map(n => n.id))
    const allEdges = await db.beliefEdges.where('userId').equals(userId).toArray()
    // 过滤掉连向已删除节点的边
    const edges = allEdges.filter(e => activeIds.has(e.sourceId) && activeIds.has(e.targetId))
    store.setNodes(nodes)
    store.setEdges(edges)

    // 新手引导检查
    const user = await db.userAccounts.get(userId)
    if (user && !user.hasCompletedOnboarding && nodes.length === 0) {
      guideStartNodeIdsRef.current = new Set(nodes.map(node => node.id))
      setOnboardingStep(1)
    }

    // 梳理提醒检查
    if (user?.reviewSettings) {
      const { monthlyEnabled, weeklyEnabled, lastMonthlyReview, lastWeeklyReview } = user.reviewSettings
      const now = Date.now()
      if (monthlyEnabled) {
        const lastMonthly = lastMonthlyReview ? new Date(lastMonthlyReview).getTime() : 0
        if (now - lastMonthly > 30 * 24 * 60 * 60 * 1000) {
          const longTermCount = nodes.filter(n => n.isLongTerm).length
          if (longTermCount >= 2) {
            setReviewReminder('monthly')
          }
        }
      }
      if (weeklyEnabled && !reviewReminder) {
        const lastWeekly = lastWeeklyReview ? new Date(lastWeeklyReview).getTime() : 0
        if (now - lastWeekly > 7 * 24 * 60 * 60 * 1000) {
          const markedCount = nodes.filter(n => n.markedForReview).length
          if (markedCount >= 1) {
            setReviewReminder('weekly')
          }
        }
      }
      // 每日待办提醒：检查昨天及以前是否有未完成的待办
      if (user.reviewSettings.dailyEnabled && !reviewReminder) {
        const today = formatDate(new Date())
        const pendingCount = await db.dailyTasks
          .where('userId').equals(userId)
          .and(t => t.status === 'pending' && t.date < today)
          .count()
        if (pendingCount > 0) {
          setReviewReminder('daily')
        }
      }
    }

    // 包含之前尚未完成的待办，与待办面板保持一致。
    const userId2 = getUserId()
    if (userId2) {
      const count = await db.dailyTasks
        .where('userId').equals(userId2)
        .and(t => t.status === 'pending')
        .count()
      setDailyTaskCount(count)
    }
  }

  const completeOnboarding = async () => {
    setOnboardingStep(0)
    const userId = getUserId()
    if (userId) {
      await db.userAccounts.update(userId, { hasCompletedOnboarding: true })
    }
  }

  const restartOnboarding = () => {
    guideStartNodeIdsRef.current = new Set(store.nodes.map(node => node.id))
    setManualOpen(false)
    setSettingsOpen(false)
    setOnboardingStep(1)
  }

  const getUserId = () => localStorage.getItem('currentUserId') || ''

  // ====== 今日待办 ======
  const saveDailyTask = async (content: string) => {
    const userId = getUserId()
    if (!userId || !content) return
    const today = formatDate(new Date())
    const task: DailyTask = {
      id: crypto.randomUUID(),
      userId,
      content,
      date: today,
      status: 'pending',
      createdAt: new Date(),
    }
    await db.dailyTasks.add(task)
    setDailyTaskCount(c => c + 1)
  }

  // ====== 连线创建：只去除同一对节点的重复关系，不推断传递性 ======
  const tryCreateEdge = (sourceId: string, targetId: string, edgeType: BeliefEdge['type'] = 'manual') => {
    const state = useBeliefStore.getState()
    const existingEdges = state.edges

    // 检查是否已存在相同连线
    const alreadyExists = existingEdges.some(e => isSamePair(e, sourceId, targetId))
    if (alreadyExists) return false

    const userId = getUserId()
    const sourceNode = state.nodes.find(n => n.id === sourceId)
    const targetNode = state.nodes.find(n => n.id === targetId)
    if (!sourceNode || !targetNode) return false

    const edge: BeliefEdge = {
      id: crypto.randomUUID(),
      userId,
      sourceId,
      targetId,
      type: edgeType,
      strength: 0.5,
      createdAt: new Date(),
    }
    store.addEdge(edge)
    db.beliefEdges.add(edge)

    return true
  }

  // ====== AI 输入处理 ======
  const createSeedNode = (content: string) => {
    // 重复检测
    const duplicate = findDuplicateNode(content, store.nodes)
    if (duplicate) return

    const userId = getUserId()
    const node: BeliefNode = {
      id: crypto.randomUUID(),
      userId,
      type: 'seed',
      content,
      position: {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        z: Math.random(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    }
    store.addNode(node)
    db.beliefNodes.add(node)
  }

  const getExistingNodesSummary = () => {
    return store.nodes.filter(n => !n.deletedAt).map(n => ({ id: n.id, content: n.content, type: n.type }))
  }

  // 直接发送（不经过 AI）
  const handleSendInput = (content: string) => {
    const duplicate = findDuplicateNode(content, store.nodes)
    if (duplicate) {
      setAiToast({ visible: true, loading: false, error: false, originalText: content, result: null, duplicate })
      return
    }
    createSeedNode(content)
  }

  const handleInputSubmit = async (content: string) => {
    // 重复检测
    const duplicate = findDuplicateNode(content, store.nodes)
    if (duplicate) {
      setAiToast({ visible: true, loading: false, error: false, originalText: content, result: null, duplicate })
      return
    }

    // AI 分类流程
    setAiToast({ visible: true, loading: true, error: false, originalText: content, result: null })

    let errorMessage: string | undefined
    const result = await classifyInput(content, getExistingNodesSummary(), reason => {
      errorMessage = describeAIRequestFailure(reason)
    })
    if (!result) {
      setAiToast({ visible: true, loading: false, error: true, errorMessage, originalText: content, result: null })
      return
    }

    setAiToast({ visible: true, loading: false, error: false, originalText: content, result })
  }

  const handleAcceptAll = () => {
    const { originalText, result } = aiToast
    if (!result) return
    const userId = getUserId()
    const node: BeliefNode = {
      id: crypto.randomUUID(),
      userId,
      type: result.type,
      content: hasMeaningfulPolish(originalText, result.polishedContent) ? result.polishedContent : originalText,
      category: result.category,
      position: {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        z: Math.random(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    }
    store.addNode(node)
    db.beliefNodes.add(node)

    // AI 的相关性提示不等于用户确认的关系，故不自动连线。
    setAiToast({ visible: false, loading: false, error: false, originalText: '', result: null })
  }

  const handleAcceptTypeOnly = () => {
    const { originalText, result } = aiToast
    if (!result) return
    const userId = getUserId()
    const node: BeliefNode = {
      id: crypto.randomUUID(),
      userId,
      type: result.type,
      content: originalText,
      position: {
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        z: Math.random(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    }
    store.addNode(node)
    db.beliefNodes.add(node)
    setAiToast({ visible: false, loading: false, error: false, originalText: '', result: null })
  }

  const handleKeepOriginal = () => {
    if (aiToast.originalText) {
      createSeedNode(aiToast.originalText)
    }
    setAiToast({ visible: false, loading: false, error: false, originalText: '', result: null })
  }

  const handleDismissToast = () => {
    // 重复提示不创建节点，仅关闭
    if (aiToast.originalText && !aiToast.duplicate) {
      createSeedNode(aiToast.originalText)
    }
    setAiToast({ visible: false, loading: false, error: false, originalText: '', result: null })
  }

  // ====== Canvas 渲染（只挂载一次，每帧从 store 读最新状态，不因缩放/数据变化重建循环）======
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let w = window.innerWidth
    let h = window.innerHeight

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      // 每帧直接从 Zustand store 读取最新状态，避免闭包陈旧引用
      const { nodes, edges, viewState, selectedNodeId, focusNodeId } = useBeliefStore.getState()
      const now = Date.now()

      // 有活跃动画时保持 60fps（重置空闲计时器）
      const hasParticles = releaseParticlesRef.current.length > 0
      const hasFadingNodes = releaseTimersRef.current.size > 0
      const hasInertia = inertiaAnimRef.current !== null
      if (hasParticles || hasFadingNodes || hasInertia || forceEnabledRef.current || draggingNodeRef.current) {
        lastActivityRef.current = now
      }
      const { offsetX, offsetY, scale } = viewState
      const focusId = focusNodeId

      // 弹性缩放边界：超出软限制时自动回弹
      const SOFT_MIN = 0.3
      const SOFT_MAX = 2.0
      if (scale < SOFT_MIN || scale > SOFT_MAX) {
        const targetScale = Math.max(SOFT_MIN, Math.min(SOFT_MAX, scale))
        const springScale = scale + (targetScale - scale) * 0.15
        if (Math.abs(springScale - targetScale) < 0.002) {
          store.setViewState({ scale: targetScale })
        } else {
          store.setViewState({ scale: springScale })
        }
      }

      // 聚焦过渡 lerp：平滑淡入/淡出
      const targetFocusAlpha = focusId ? 1 : 0
      const lerpSpeed = 0.08
      focusAlphaRef.current += (targetFocusAlpha - focusAlphaRef.current) * lerpSpeed
      const fa = focusAlphaRef.current

      // 重置变换并清屏
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#FAF7F2'
      ctx.fillRect(0, 0, w, h)

      // 应用画布变换
      ctx.save()
      ctx.translate(w / 2 + offsetX, h / 2 + offsetY)
      ctx.scale(scale, scale)

      // 确定聚焦模式下的相关节点（BFS 整条链路）
      const focusRelatedIds: Set<string> = focusId
        ? getConnectedComponent(focusId, edges)
        : new Set()

      // 画连线
      for (const edge of edges) {
        const source = nodes.find((n) => n.id === edge.sourceId)
        const target = nodes.find((n) => n.id === edge.targetId)
        if (!source || !target) continue
        if (source.deletedAt || target.deletedAt) continue

        const isFocused = focusId && (focusRelatedIds.has(edge.sourceId) && focusRelatedIds.has(edge.targetId))
        const dimOpacity = 0.5 + (0.18 - 0.5) * fa
        const opacity = focusId && !isFocused ? dimOpacity : 0.5
        const width = isFocused && fa > 0.5 ? 2.5 : 1.5
        // 按节点类型连线颜色
        const baseEdgeColor = getEdgeColor(source.type, target.type)
        const color = isFocused && fa > 0.5
          ? '#D4A843'
          : hexToRgba(baseEdgeColor, opacity)

        ctx.beginPath()
        ctx.moveTo(source.position.x, source.position.y)
        ctx.lineTo(target.position.x, target.position.y)
        ctx.strokeStyle = color
        ctx.lineWidth = width / scale
        if (!isDirectionalLink(edge.type)) ctx.setLineDash([5 / scale, 5 / scale])
        ctx.stroke()
        ctx.setLineDash([])

        // 只有用户确认的方向关系才显示箭头。
        if (isDirectionalLink(edge.type)) {
        const ax = target.position.x
        const ay = target.position.y
        const dx = ax - source.position.x
        const dy = ay - source.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0) {
          const ux = dx / dist
          const uy = dy / dist
          const arrowSize = 5 / scale
          // 箭头尖端在目标节点边缘，向后偏移
          const tipX = ax - ux * getNodeRadius(target.type)
          const tipY = ay - uy * getNodeRadius(target.type)
          const baseX = tipX - ux * arrowSize * 2
          const baseY = tipY - uy * arrowSize * 2
          const leftX = baseX - uy * arrowSize
          const leftY = baseY + ux * arrowSize
          const rightX = baseX + uy * arrowSize
          const rightY = baseY - ux * arrowSize
          ctx.beginPath()
          ctx.moveTo(tipX, tipY)
          ctx.lineTo(leftX, leftY)
          ctx.lineTo(rightX, rightY)
          ctx.closePath()
          ctx.fillStyle = color
          ctx.fill()
        }
        }

        // 选中连线高亮
        if (edge.id === selectedEdgeRef.current) {
          ctx.beginPath()
          ctx.moveTo(source.position.x, source.position.y)
          ctx.lineTo(target.position.x, target.position.y)
          ctx.strokeStyle = 'rgba(212, 168, 67, 0.5)'
          ctx.lineWidth = 5 / scale
          ctx.stroke()
        }
      }

      // 视口裁剪：计算世界坐标下的可见区域
      const vpMargin = 80
      const vpLeft = (-w / 2 - offsetX) / scale - vpMargin
      const vpRight = (w / 2 - offsetX) / scale + vpMargin
      const vpTop = (-h / 2 - offsetY) / scale - vpMargin
      const vpBottom = (h / 2 - offsetY) / scale + vpMargin

      // 画节点（按优先级排序：选中/聚焦优先 → z 深优先，保证重要节点文字不被遮挡）
      const renderNodes = [...nodes].sort((a, b) => {
        const aFocused = focusId && focusRelatedIds.has(a.id) ? 1 : 0
        const bFocused = focusId && focusRelatedIds.has(b.id) ? 1 : 0
        const aSelected = a.id === selectedNodeId && !focusId ? 1 : 0
        const bSelected = b.id === selectedNodeId && !focusId ? 1 : 0
        const aPrio = aFocused + aSelected
        const bPrio = bFocused + bSelected
        if (aPrio !== bPrio) return bPrio - aPrio
        return (b.position.z ?? 0.5) - (a.position.z ?? 0.5)
      })
      const renderedTexts: Array<{ left: number; right: number; top: number; bottom: number }> = []
      for (const node of renderNodes) {
        // 跳过已删除/释怀的节点（软删除）
        if (node.deletedAt) continue
        const { x, y } = node.position
        // 跳过视口外的节点
        if (x < vpLeft || x > vpRight || y < vpTop || y > vpBottom) continue
        const isFocused = focusId && focusRelatedIds.has(node.id)
        const isSelected = node.id === selectedNodeId && !focusId
        const baseRadius = getNodeRadius(node.type)
        // 呼吸动画：选中节点 3s 周期 ±6%，聚焦节点 ±3%
        const breathPhase = now * 0.002094 // 2π/3000
        const breathScale = isSelected
          ? 1 + Math.sin(breathPhase) * 0.06
          : isFocused
            ? 1 + Math.sin(breathPhase) * 0.03
            : 1
        const r = (isSelected ? baseRadius + 4 : isFocused ? baseRadius + 5 : baseRadius) * breathScale

        // 释怀动画：fading 节点逐渐透明 + 缩小 + 持续慢飘粒子
        let releaseAlpha = 1
        let releaseScale = 1
        if (node.status === 'fading') {
          const timers = releaseTimersRef.current
          if (!timers.has(node.id)) {
            timers.set(node.id, Date.now())
            // 一次性生成所有粒子（会在整个动画期间慢慢飘散消失）
            const nodeColor = getNodeColor(node.type)
            for (let i = 0; i < 30; i++) {
              const angle = Math.random() * Math.PI * 2
              const speed = 0.15 + Math.random() * 0.5 // 慢速飘出
              releaseParticlesRef.current.push({
                nodeId: node.id,
                x: node.position.x,
                y: node.position.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.2, // 微微上飘
                alpha: 0.3 + Math.random() * 0.5,
                color: nodeColor,
                size: 1.5 + Math.random() * 2.5,
              })
            }
          }
          const elapsed = Date.now() - timers.get(node.id)!
          const progress = Math.min(elapsed / RELEASE_DURATION, 1)
          releaseAlpha = 1 - progress
          releaseScale = 1 - progress * 0.4

          // 动画完成后标记为 released
          if (progress >= 1) {
            store.updateNode(node.id, { status: 'released', deletedAt: new Date() })
            db.beliefNodes.update(node.id, { status: 'released', deletedAt: new Date() })
            timers.delete(node.id)
          }
        }

        // 聚焦模式下非相关节点：保持可见，仅轻微淡化
        const dimOpacity = 1 + (0.40 - 1) * fa
        const focusOpacity = focusId && !isFocused ? dimOpacity : 1

        // 景深：z 影响节点大小和透明度
        const z = node.position.z ?? 0.5
        const depthScale = (0.78 + z * 0.44) * releaseScale // 0.78~1.22
        const depthAlpha = (0.6 + z * 0.4) * releaseAlpha // 0.6~1.0
        const globalOpacity = focusOpacity * depthAlpha
        const displayR = r * depthScale

        // 选中/聚焦光晕
        if ((isSelected || isFocused) && globalOpacity > 0.1) {
          ctx.beginPath()
          ctx.arc(x, y, displayR + 8, 0, Math.PI * 2)
          ctx.fillStyle = isFocused
            ? 'rgba(212, 168, 67, 0.25)'
            : 'rgba(212, 168, 67, 0.18)'
          ctx.globalAlpha = globalOpacity
          ctx.fill()
          ctx.globalAlpha = 1
        }

        // 态度标记光晕
        if (node.attitude && globalOpacity > 0.1) {
          const attitudeColors: Record<string, string> = {
            break: 'rgba(232, 200, 160, 0.4)',
            strengthen: 'rgba(160, 200, 176, 0.4)',
            observe: 'rgba(200, 196, 180, 0.25)',
          }
          ctx.beginPath()
          ctx.arc(x, y, displayR + 5, 0, Math.PI * 2)
          ctx.fillStyle = attitudeColors[node.attitude] || 'transparent'
          ctx.globalAlpha = globalOpacity
          ctx.fill()
          ctx.globalAlpha = 1
        }

        // 主体
        ctx.beginPath()
        ctx.arc(x, y, displayR, 0, Math.PI * 2)
        ctx.globalAlpha = globalOpacity
        ctx.fillStyle = getNodeColor(node.type)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 1 / scale
        ctx.stroke()
        ctx.globalAlpha = 1

        // 文字（碰撞检测：避免重叠）
        if (scale > 0.6 && globalOpacity > 0.1) {
          const fullText = node.content
          const maxWidth = 160 / scale
          const baseFontSize = Math.max(10, Math.min(12 / scale, 14))
          const fontSize = fullText.length > 12
            ? Math.max(8, baseFontSize * (12 / fullText.length) * 1.6)
            : baseFontSize
          ctx.font = `${fontSize}px "Noto Sans SC", sans-serif`

          // 估算文字边界框
          let textW: number, textH: number, textY: number
          if (fullText.length > 20) {
            const line1 = fullText.slice(0, Math.ceil(fullText.length / 2))
            const line2 = fullText.slice(Math.ceil(fullText.length / 2))
            const w1 = ctx.measureText(line1).width
            const w2 = ctx.measureText(line2).width
            textW = Math.max(w1, w2)
            textH = fontSize * 2 + 5
            textY = y + displayR + fontSize + 3
          } else {
            textW = ctx.measureText(fullText).width
            textH = fontSize + 6
            textY = y + displayR + fontSize + 3
          }
          const textLeft = x - textW / 2 - 4
          const textRight = x + textW / 2 + 4
          const textTop = textY - fontSize
          const textBottom = textY + textH - fontSize

          // 碰撞检测
          let collides = false
          for (const rt of renderedTexts) {
            if (
              textLeft < rt.right &&
              textRight > rt.left &&
              textTop < rt.bottom &&
              textBottom > rt.top
            ) {
              collides = true
              break
            }
          }

          if (!collides) {
            ctx.fillStyle = '#4A4036'
            ctx.textAlign = 'center'
            ctx.globalAlpha = globalOpacity
            if (fullText.length > 20) {
              const line1 = fullText.slice(0, Math.ceil(fullText.length / 2))
              const line2 = fullText.slice(Math.ceil(fullText.length / 2))
              ctx.fillText(line1, x, y + displayR + fontSize + 3)
              ctx.fillText(line2, x, y + displayR + fontSize * 2 + 5)
            } else {
              ctx.fillText(fullText, x, y + displayR + fontSize + 3)
            }
            ctx.globalAlpha = 1
            renderedTexts.push({ left: textLeft, right: textRight, top: textTop, bottom: textBottom })
          }
        }
      }

      // 释怀粒子渲染
      const particles = releaseParticlesRef.current
      if (particles.length > 0) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          p.x += p.vx
          p.y += p.vy
          p.alpha -= 0.005
          if (p.alpha <= 0) {
            particles.splice(i, 1)
            continue
          }
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = hexToRgba(p.color, p.alpha)
          ctx.globalAlpha = 1
          ctx.fill()
        }
      }

      // 力导向布局（每 2 帧计算一次，不影响渲染帧率）
      if (forceEnabledRef.current && !focusId && !draggingNodeRef.current) {
        forceFrameCountRef.current++
        if (forceFrameCountRef.current % 2 === 0 && nodes.length > 1) {
          const velocities = forceVelocitiesRef.current
          // 初始化速度
          for (const n of nodes) {
            if (!velocities.has(n.id)) velocities.set(n.id, { x: 0, y: 0 })
          }

          const REPEL = 5000
          const ATTRACT = 0.005
          const CENTER = 0.001
          const MAX_REPEL_DIST = 300
          const DAMPING = 0.7
          const MAX_VEL = 5

          for (const n of nodes) {
            let fx = 0, fy = 0
            // 排斥力
            for (const other of nodes) {
              if (other.id === n.id) continue
              let dx = n.position.x - other.position.x
              let dy = n.position.y - other.position.y
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist < 1) { dx = 1; dy = 0; }
              const d = Math.max(dist, 1)
              if (d < MAX_REPEL_DIST) {
                const force = REPEL / (d * d)
                fx += (dx / d) * force
                fy += (dy / d) * force
              }
            }
            // 吸引力（连线）
            for (const edge of edges) {
              if (edge.sourceId === n.id || edge.targetId === n.id) {
                const otherId = edge.sourceId === n.id ? edge.targetId : edge.sourceId
                const other = nodes.find(o => o.id === otherId)
                if (!other) continue
                const dx = other.position.x - n.position.x
                const dy = other.position.y - n.position.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist > 0) {
                  fx += (dx / dist) * ATTRACT * dist
                  fy += (dy / dist) * ATTRACT * dist
                }
              }
            }
            // 中心引力
            fx -= n.position.x * CENTER
            fy -= n.position.y * CENTER
            // 更新速度
            const v = velocities.get(n.id)!
            v.x = (v.x + fx) * DAMPING
            v.y = (v.y + fy) * DAMPING
            // 限制速度
            const speed = Math.sqrt(v.x * v.x + v.y * v.y)
            if (speed > MAX_VEL) {
              v.x = (v.x / speed) * MAX_VEL
              v.y = (v.y / speed) * MAX_VEL
            }
          }
          // 应用速度更新位置
          for (const n of nodes) {
            const v = velocities.get(n.id)
            if (v && (Math.abs(v.x) > 0.01 || Math.abs(v.y) > 0.01)) {
              store.updateNode(n.id, {
                position: {
                  x: n.position.x + v.x,
                  y: n.position.y + v.y,
                  z: n.position.z,
                },
              })
            }
          }
        }
      }

      ctx.restore()

      // 页面边缘暗角（vignette）：仅聚焦模式下显示，替代节点淡化
      if (focusId && fa > 0.1) {
        const vignetteAlpha = fa * 0.25
        const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75)
        gradient.addColorStop(0, 'rgba(74, 64, 54, 0)')
        gradient.addColorStop(0.5, 'rgba(74, 64, 54, 0)')
        gradient.addColorStop(1, `rgba(74, 64, 54, ${vignetteAlpha})`)
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, w, h)
      }

      if (mountedRef.current) {
        const idle = Date.now() - lastActivityRef.current > IDLE_THRESHOLD
        if (idle) {
          idleFrameRef.current = window.setTimeout(render, 100) // ~10fps
        } else {
          requestAnimationFrame(render)
        }
      }
    }

    mountedRef.current = true
    requestAnimationFrame(render)

    return () => {
      mountedRef.current = false
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ====== 指针事件（统一鼠标+触摸）======
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    lastActivityRef.current = Date.now()
    const canvas = canvasRef.current
    if (!canvas) return

    // 捕获指针以确保后续事件
    canvas.setPointerCapture(e.pointerId)
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // 双指缩放：记录初始距离
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values())
      pinchDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchScaleRef.current = useBeliefStore.getState().viewState.scale
      return
    }

    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const state = useBeliefStore.getState()
    const { offsetX, offsetY, scale } = state.viewState
    const world = screenToWorld(sx, sy, rect.width, rect.height, offsetX, offsetY, scale)
    const hit = hitTest(world.x, world.y, state.nodes)

    if (e.button === 2) {
      // 右键（仅鼠标）
      e.preventDefault()
      if (hit) {
        setContextMenu({ x: e.clientX, y: e.clientY, node: hit })
      }
      return
    }

    if (e.button === 0 || e.pointerType === 'touch') {
      if (hit) {
        // 连接模式：先让用户确认关系，再创建连线
        if (connectMode && hit.id !== connectMode) {
          const existing = state.edges.find(edge => isSamePair(edge, connectMode, hit.id))
          if (existing) {
            setSelectedEdgeId(existing.id)
            setEdgePopup({ edgeId: existing.id, screenX: e.clientX, screenY: e.clientY })
          }
          else setPendingLink({ sourceId: connectMode, targetId: hit.id })
          setConnectMode(null)
          state.selectNode(hit.id)
          return
        }

        // 点击节点：取消连接模式 + 清除连线选中 + 选中 + 准备拖拽 + 启动长按计时
        setConnectMode(null)
        setSelectedEdgeId(null)
        setEdgePopup(null)
        state.selectNode(hit.id)
        draggingNodeRef.current = true
        setIsDraggingNode(true)
        setDragNodeId(hit.id)
        dragPointerStartRef.current = { x: e.clientX, y: e.clientY }
        const chainDists = getConnectedWithDistance(hit.id, state.edges)
        const originMap = new Map<string, { x: number; y: number }>()
        for (const [id] of chainDists) {
          const node = state.nodes.find(item => item.id === id && !item.deletedAt)
          if (node) originMap.set(id, { x: node.position.x, y: node.position.y })
        }
        chainOriginRef.current = originMap
        // 记录点击偏移（光标世界坐标 - 节点中心），拖拽时保持相对位置
        dragOffsetRef.current = { x: world.x - hit.position.x, y: world.y - hit.position.y }
        longPressPosRef.current = { x: e.clientX, y: e.clientY }

        // 清除旧计时器
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = setTimeout(() => {
          // 长按触发聚焦模式
          state.setFocusNode(hit.id)
          draggingNodeRef.current = false
          chainOriginRef.current = new Map()
          setIsDraggingNode(false)
          setDragNodeId(null)
          longPressTimerRef.current = null
        }, LONG_PRESS_DURATION)
      } else {
        // 点击空白：先检测是否点中连线
        const hitEdge = edgeHitTest(world.x, world.y, state.nodes, state.edges)
        if (hitEdge) {
          setSelectedEdgeId(hitEdge)
          setEdgePopup({ edgeId: hitEdge, screenX: e.clientX, screenY: e.clientY })
          state.selectNode(null)
          state.setFocusNode(null)
          setConnectMode(null)
          setContextMenu(null)
          return
        }

        // 点击空白：取消选中 + 取消连接模式 + 取消连线选中 + 退出聚焦 + 开始平移
        state.selectNode(null)
        state.setFocusNode(null)
        setConnectMode(null)
        setContextMenu(null)
        setSelectedEdgeId(null)
        setEdgePopup(null)
        setIsPanning(true)
        setPanStart({ x: e.clientX - offsetX, y: e.clientY - offsetY })
      }
    }
  }, [connectMode])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    lastActivityRef.current = Date.now()
    const canvas = canvasRef.current
    if (!canvas) return

    // 更新指针位置
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // 双指缩放
    if (activePointersRef.current.size === 2) {
      if (inertiaAnimRef.current) {
        cancelAnimationFrame(inertiaAnimRef.current)
        inertiaAnimRef.current = null
      }
      const pts = Array.from(activePointersRef.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      if (pinchDistRef.current > 0) {
        const ratio = dist / pinchDistRef.current
        const newScale = Math.max(0.25, Math.min(2.5, pinchScaleRef.current * ratio))
        store.setViewState({ scale: newScale })
      }
      return
    }

    const rect = canvas.getBoundingClientRect()

    // 长按移动超出阈值 → 取消长按计时
    if (longPressTimerRef.current) {
      const dx = e.clientX - longPressPosRef.current.x
      const dy = e.clientY - longPressPosRef.current.y
      if (Math.abs(dx) > LONG_PRESS_MOVE_THRESHOLD || Math.abs(dy) > LONG_PRESS_MOVE_THRESHOLD) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }

    if (isPanning) {
      const now = performance.now()
      const newOffsetX = e.clientX - panStart.x
      const newOffsetY = e.clientY - panStart.y
      const clamped = clampOffset(newOffsetX, newOffsetY)
      useBeliefStore.getState().setViewState({ offsetX: clamped.ox, offsetY: clamped.oy })

      // 计算速度（px/ms）
      if (lastPanTimeRef.current > 0) {
        const dt = now - lastPanTimeRef.current
        if (dt > 0) {
          velocityRef.current = {
            x: (e.clientX - lastPanPosRef.current.x) / dt,
            y: (e.clientY - lastPanPosRef.current.y) / dt,
          }
        }
      }
      lastPanTimeRef.current = now
      lastPanPosRef.current = { x: e.clientX, y: e.clientY }
    }

    if (isDraggingNode && dragNodeId) {
      const state = useBeliefStore.getState()
      const { offsetX, offsetY, scale } = state.viewState
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, offsetX, offsetY, scale)
      const draggedNode = state.nodes.find(n => n.id === dragNodeId)
      if (!draggedNode) return

      // 计算目标位置（光标世界坐标 - 点击偏移，保持抓取时的相对位置）
      const offset = dragOffsetRef.current
      const targetX = world.x - offset.x
      const targetY = world.y - offset.y

      // 弹簧阻力：lerp 向目标，stiffness 越小阻力感越强
      const stiffness = 0.38
      const oldX = draggedNode.position.x
      const oldY = draggedNode.position.y
      const newX = oldX + (targetX - oldX) * stiffness
      const newY = oldY + (targetY - oldY) * stiffness
      store.updateNode(dragNodeId, { position: { x: newX, y: newY, z: draggedNode.position.z } })

      // 原版手感：相连节点跟随实际移动量，按最短链路距离逐级衰减。
      const originMap = chainOriginRef.current
      const dragOrigin = originMap.get(dragNodeId)
      if (dragOrigin && originMap.size > 1) {
        const dx = newX - dragOrigin.x
        const dy = newY - dragOrigin.y
        const distances = getConnectedWithDistance(dragNodeId, state.edges)
        for (const [id, distance] of distances) {
          if (id === dragNodeId) continue
          const origin = originMap.get(id)
          if (!origin) continue
          const weight = distance <= 1 ? 0.65 : distance <= 2 ? 0.35 : distance <= 3 ? 0.18 : 0.08
          const follower = state.nodes.find(node => node.id === id)
          if (!follower) continue
          store.updateNode(id, {
            position: { x: origin.x + dx * weight, y: origin.y + dy * weight, z: follower.position.z },
          })
        }
      }
    }
  }, [isPanning, panStart, isDraggingNode, dragNodeId])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    lastActivityRef.current = Date.now()

    // 释放指针
    activePointersRef.current.delete(e.pointerId)
    if (canvasRef.current?.hasPointerCapture(e.pointerId)) canvasRef.current.releasePointerCapture(e.pointerId)

    // 清理双指缩放状态
    pinchDistRef.current = 0

    // 取消长按计时
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (isPanning) {
      setIsPanning(false)
      // 启动惯性滑行
      const vx = velocityRef.current.x
      const vy = velocityRef.current.y
      if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
        const startInertia = () => {
          velocityRef.current.x *= 0.94
          velocityRef.current.y *= 0.94
          const { offsetX, offsetY } = useBeliefStore.getState().viewState
          const nextOX = offsetX + velocityRef.current.x * 16
          const nextOY = offsetY + velocityRef.current.y * 16
          const clamped = clampOffset(nextOX, nextOY)
          useBeliefStore.getState().setViewState({ offsetX: clamped.ox, offsetY: clamped.oy })
          // 碰到边界停止惯性
          if (clamped.ox === nextOX && clamped.oy === nextOY &&
              (Math.abs(velocityRef.current.x) > 0.02 || Math.abs(velocityRef.current.y) > 0.02)) {
            inertiaAnimRef.current = requestAnimationFrame(startInertia)
          }
        }
        inertiaAnimRef.current = requestAnimationFrame(startInertia)
      }
      // 重置速度追踪
      velocityRef.current = { x: 0, y: 0 }
      lastPanTimeRef.current = 0
    }

    if (isDraggingNode && dragNodeId) {
      draggingNodeRef.current = false
      const state = useBeliefStore.getState()
      const canvas = canvasRef.current
      const dragDistance = Math.hypot(e.clientX - dragPointerStartRef.current.x, e.clientY - dragPointerStartRef.current.y)
      if (e.type === 'pointerup' && canvas && chainOriginRef.current.size > 0 && dragDistance > 8) {
        // 原版用松手光标位置判断靠近，不受节点弹性滞后影响。
        // 只建立“待厘清”关系，不凭空间距离推断因果方向。
        const rect = canvas.getBoundingClientRect()
        const { offsetX, offsetY, scale } = state.viewState
        const point = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height, offsetX, offsetY, scale)
        const nearest = state.nodes
          .filter(node => node.id !== dragNodeId && !node.deletedAt)
          .map(node => ({ node, distance: Math.hypot(point.x - node.position.x, point.y - node.position.y) }))
          .sort((a, b) => a.distance - b.distance)[0]
        if (nearest && nearest.distance < DRAG_CONNECT_DISTANCE) tryCreateEdge(dragNodeId, nearest.node.id)
      }
      for (const id of chainOriginRef.current.keys()) {
        const node = state.nodes.find(item => item.id === id)
        if (node) void db.beliefNodes.update(id, { position: node.position })
      }
      chainOriginRef.current = new Map()
      setIsDraggingNode(false)
      setDragNodeId(null)
    }
  }, [isPanning, isDraggingNode, dragNodeId])

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    lastActivityRef.current = Date.now()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const state = useBeliefStore.getState()
    const { offsetX, offsetY, scale } = state.viewState
    const world = screenToWorld(sx, sy, rect.width, rect.height, offsetX, offsetY, scale)
    const hit = hitTest(world.x, world.y, state.nodes)

    if (hit) {
      setEditingNodeId(hit.id)
      setEditText(hit.content)
    }
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    lastActivityRef.current = Date.now()
    // 取消惯性动画
    if (inertiaAnimRef.current) {
      cancelAnimationFrame(inertiaAnimRef.current)
      inertiaAnimRef.current = null
    }
    const direction = e.deltaY > 0 ? -1 : 1
    const factor = 1.1
    // 允许略微超出软限制，弹性回弹由渲染循环处理
    const currentScale = useBeliefStore.getState().viewState.scale
    const newScale = Math.max(0.25, Math.min(2.5, currentScale * (direction > 0 ? factor : 1 / factor)))
    store.setViewState({ scale: newScale })
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  // 保存编辑
  const saveEdit = useCallback(() => {
    if (editingNodeId && editText.trim()) {
      store.updateNode(editingNodeId, { content: editText.trim() })
      db.beliefNodes.update(editingNodeId, { content: editText.trim() })
    }
    setEditingNodeId(null)
    setEditText('')
  }, [editingNodeId, editText])

  // 键盘快捷操作
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      lastActivityRef.current = Date.now()
      const target = e.target instanceof HTMLElement ? e.target : null
      const hasBlockingPanel = drawerOpen || settingsOpen || manualOpen || bookQAOpen || dailyPanelOpen || deepInsightOpen || reviewOpen || !!pendingLink || !!contextMenu || !!edgePopup || aiToast.visible
      const hasOverlay = hasBlockingPanel || onboardingStep > 0
      // Editing text and using a panel must never delete a graph item behind it.
      if (e.key === 'Delete' && (hasOverlay || target?.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]'))) return
      if (e.key === 'Escape' && pendingLink) { setPendingLink(null); return }
      if (e.key === 'Escape' && contextMenu) { setContextMenu(null); return }
      if (e.key === 'Escape' && hasBlockingPanel) return
      if (e.key === 'Escape' && onboardingStep > 0 && !store.selectedNodeId && !editingNodeId) {
        setOnboardingStep(0)
        const userId = localStorage.getItem('currentUserId')
        if (userId) void db.userAccounts.update(userId, { hasCompletedOnboarding: true })
        return
      }
      if (editingNodeId) {
        if (e.key === 'Enter') saveEdit()
        if (e.key === 'Escape') {
          setEditingNodeId(null)
          setEditText('')
        }
        return
      }
      if (e.key === 'Escape') {
        store.selectNode(null)
        store.setFocusNode(null)
      }
      if (e.key === 'Delete') {
        if (selectedEdgeId) {
          store.removeEdge(selectedEdgeId)
          db.beliefEdges.delete(selectedEdgeId)
          setSelectedEdgeId(null)
          setEdgePopup(null)
        } else if (store.selectedNodeId) {
          const id = store.selectedNodeId
          store.updateNode(id, { deletedAt: new Date() })
          db.beliefNodes.update(id, { deletedAt: new Date() })
          store.selectNode(null)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingNodeId, store.selectedNodeId, selectedEdgeId, drawerOpen, settingsOpen, manualOpen, bookQAOpen, dailyPanelOpen, deepInsightOpen, reviewOpen, pendingLink, contextMenu, edgePopup, aiToast.visible, onboardingStep, saveEdit])

  // ====== UI 渲染 ======
  const selectedNode = store.nodes.find(n => n.id === store.selectedNodeId)
  const topPanelOpen = drawerOpen || settingsOpen || manualOpen || bookQAOpen || dailyPanelOpen || deepInsightOpen || reviewOpen
  const guideHidden = topPanelOpen || !!pendingLink || !!contextMenu || !!edgePopup || !!store.selectedNodeId || aiToast.visible
  const aiHintActive = onboardingStep === 4 && !guideHidden

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ backgroundColor: '#FAF7F2' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        style={{ cursor: isDraggingNode ? 'grabbing' : isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
      />

      {/* 梳理提醒 */}
      {reviewReminder && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full flex items-center gap-3 cursor-pointer"
          style={{
            backgroundColor: 'rgba(255, 251, 245, 0.92)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #E0D8CC',
            boxShadow: '0 2px 12px rgba(74, 64, 54, 0.06)',
          }}
          onClick={() => {
            if (reviewReminder === 'daily') {
              setDailyPanelOpen(true)
            } else {
              setReviewType(reviewReminder as 'monthly' | 'weekly')
              setReviewOpen(true)
            }
            setReviewReminder(null)
          }}
        >
          <span className="text-sm" style={{ color: '#4A4036' }}>
            {reviewReminder === 'daily'
              ? '昨天还有未完成的待办，要看看吗？ 📌'
              : '又到了看看自己的时候了 🌿'}
          </span>
          <button
            className="text-xs hover:opacity-70 transition-opacity"
            style={{ color: '#9C9088' }}
            onClick={(e) => {
              e.stopPropagation()
              setReviewReminder(null)
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 顶部栏 */}
      <div className={`absolute top-0 left-0 right-0 ${selectedNode ? 'md:right-80' : ''} flex justify-between items-center px-3 sm:px-6 py-3 pointer-events-none ${topPanelOpen ? 'z-10' : 'z-30'}`}>
        <button
          type="button"
          aria-label="将画布视角归位"
          className="hidden sm:inline-block font-serif text-lg tracking-wider text-[#5C4A3A] pointer-events-auto cursor-pointer select-none rounded-md px-1 hover:text-[#8B6B4A] transition-colors"
          onClick={() => store.setViewState({ offsetX: 0, offsetY: 0, scale: 1 })}
        >
          信念
        </button>
        <div role="group" aria-label="画布工具" className="flex gap-1 sm:gap-2 items-center pointer-events-auto">
          <button
            type="button"
            className="canvas-tool-button"
            title="信念总览"
            aria-label="打开信念总览"
            onClick={() => setDrawerOpen(true)}
          >
            <ToolbarIcon name="overview" />
          </button>
          <button
            type="button"
            className="canvas-tool-button"
            title="书本问答"
            aria-label="打开书本问答"
            onClick={() => { setBookQAHasOpened(true); setBookQAOpen(true) }}
          >
            <ToolbarIcon name="books" />
          </button>
          <button
            type="button"
            className="canvas-tool-button"
            title="我的探索：记录、问询与继续思考"
            aria-label="我的探索"
            onClick={() => {
              setExplorationSessionId(undefined)
              setExplorationSourceNodeId(undefined)
              setDeepInsightOpen(true)
            }}
          >
            <ToolbarIcon name="explore" />
          </button>
          <button
            type="button"
            className="canvas-tool-button"
            title="自动梳理布局"
            aria-label="自动梳理布局"
            aria-pressed={forceEnabled}
            onClick={() => setForceEnabled(!forceEnabled)}
          >
            <ToolbarIcon name="arrange" />
          </button>
          <button
            type="button"
            className="canvas-tool-button"
            title="设置"
            aria-label="打开设置"
            onClick={() => setSettingsOpen(true)}
          >
            <ToolbarIcon name="settings" />
          </button>
          <button
            type="button"
            className="canvas-tool-button"
            title="使用手册"
            aria-label="打开使用手册"
            onClick={() => setManualOpen(true)}
          >
            <ToolbarIcon name="help" />
          </button>
        </div>
      </div>

      {/* 选中节点信息条 */}
      {selectedNode && !editingNodeId && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 md:left-0 md:right-80 md:translate-x-0 md:mx-auto ${topPanelOpen ? 'z-10' : 'z-30'} w-max max-w-[calc(100%-2rem)] md:max-w-[calc(100%-22rem)] px-5 py-2.5 rounded-full flex items-center gap-3`}
          style={{
            top: 76,
            backgroundColor: 'rgba(255, 251, 245, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #E0D8CC',
            boxShadow: '0 2px 12px rgba(74, 64, 54, 0.06)',
          }}
        >
          <span className="text-sm max-w-[300px] min-w-0" style={{ color: '#4A4036', wordBreak: 'break-word' }}>
            {selectedNode.content}
          </span>
          <span className="text-xs" style={{ color: '#9C9088' }}>
            {getTypeLabel(selectedNode.type)}
          </span>
          <button
            className="text-xs hover:opacity-70 flex-shrink-0 w-8 h-8 flex items-center justify-center"
            style={{ color: '#9C9088' }}
            title="编辑"
            onClick={() => {
              setEditingNodeId(selectedNode.id)
              setEditText(selectedNode.content)
            }}
          >
            ✏️
          </button>
          <button
            className="text-xs hover:opacity-70 flex-shrink-0 w-8 h-8 flex items-center justify-center"
            style={{ color: connectMode === selectedNode.id ? '#D4A843' : '#9C9088' }}
            title="连接到另一个节点"
            onClick={() => {
              setConnectMode(connectMode === selectedNode.id ? null : selectedNode.id)
              store.selectNode(null)
            }}
          >
            🔗
          </button>
        </div>
      )}

      {/* 连接模式提示 */}
      {connectMode && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full"
          style={{
            top: selectedNode ? 132 : 76,
            backgroundColor: 'rgba(212, 168, 67, 0.12)',
            border: '1px solid rgba(212, 168, 67, 0.25)',
          }}
        >
          <span className="text-xs" style={{ color: '#8B6B3A' }}>
            点击另一个节点建立连接 · 点击空白取消
          </span>
        </div>
      )}

      {/* 聚焦模式提示 */}
      {store.focusNodeId && (
        <div className="absolute top-14 left-4 z-30 flex items-center gap-3">
          <div
            className="px-4 py-1.5 rounded-full flex items-center gap-2"
            style={{
              backgroundColor: 'rgba(212, 168, 67, 0.15)',
              border: '1px solid rgba(212, 168, 67, 0.3)',
            }}
          >
            <span className="text-xs" style={{ color: '#8B6B3A' }}>
              聚焦模式
            </span>
            <button
              className="text-xs px-2 py-0.5 rounded-full transition-all hover:opacity-70"
              style={{
                backgroundColor: 'rgba(212, 168, 67, 0.2)',
                color: '#8B6B3A',
              }}
              onClick={() => {
                setExplorationSessionId(undefined)
                setExplorationSourceNodeId(store.focusNodeId ?? undefined)
                setDeepInsightOpen(true)
              }}
            >
              从这里继续探索
            </button>
            <button
              className="text-xs hover:opacity-70 transition-opacity cursor-pointer"
              style={{ color: '#5C4A3A' }}
              onClick={() => store.setFocusNode(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 编辑浮层 */}
      {editingNodeId && (
        <div className="absolute inset-0 z-20 flex items-center justify-center" onClick={() => saveEdit()}>
          <div
            className="px-6 py-4 rounded-lg"
            style={{
              backgroundColor: 'rgba(255, 251, 245, 0.97)',
              backdropFilter: 'blur(12px)',
              border: '1px solid #E0D8CC',
              boxShadow: '0 4px 24px rgba(74, 64, 54, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="input-underline text-center w-64"
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit()
                if (e.key === 'Escape') {
                  setEditingNodeId(null)
                  setEditText('')
                }
              }}
            />
            <p className="text-xs mt-2 text-center" style={{ color: '#9C9088' }}>
              Enter 保存 · Esc 取消
            </p>
          </div>
        </div>
      )}

      {/* 连线信息浮层 */}
      {edgePopup && (
        <EdgeInfoPopup
          edgeId={edgePopup.edgeId}
          screenX={edgePopup.screenX}
          screenY={edgePopup.screenY}
          onClose={() => {
            setEdgePopup(null)
            setSelectedEdgeId(null)
          }}
        />
      )}

      {pendingLink && (() => {
        const source = store.nodes.find(node => node.id === pendingLink.sourceId)
        const target = store.nodes.find(node => node.id === pendingLink.targetId)
        return source && target ? <CreateLinkDialog
          key={`${source.id}-${target.id}`}
          source={source}
          target={target}
          nodes={store.nodes}
          edges={store.edges}
          onConfirm={type => { tryCreateEdge(source.id, target.id, type); setPendingLink(null) }}
          onClose={() => setPendingLink(null)}
        /> : null
      })()}

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={() => setContextMenu(null)}
          onConnect={(nodeId) => {
            setConnectMode(nodeId)
            store.selectNode(null)
            setContextMenu(null)
          }}
        />
      )}

      {/* 节点详情浮层 */}
      <NodeDetailPanel onOpenExploration={(id) => {
        setExplorationSessionId(id)
        setExplorationSourceNodeId(undefined)
        setDeepInsightOpen(true)
      }} onThinkWithNianNian={(nodeId) => {
        setExplorationSessionId(undefined)
        setExplorationSourceNodeId(nodeId)
        setDeepInsightOpen(true)
      }} />

      {/* 信念总览抽屉 */}
      <BeliefDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* 设置面板 */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onManualReview={(type) => {
          setReviewType(type)
          setReviewOpen(true)
        }}
        onOpenManual={() => setManualOpen(true)}
      />


      {/* 今日待办面板 */}
      <DailyActionPanel
        open={dailyPanelOpen}
        onClose={() => setDailyPanelOpen(false)}
        onTaskCountChange={setDailyTaskCount}
      />

      {/* 使用手册 */}
      <UserManualPanel open={manualOpen} onClose={() => setManualOpen(false)} onRestartGuide={restartOnboarding} />

      {/* 同一个探索入口承接自由书写、节点探索和来源回看。 */}
      <ExplorationPanel open={deepInsightOpen} sessionId={explorationSessionId}
        sourceNodeId={explorationSourceNodeId} onClose={() => setDeepInsightOpen(false)} />

      {/* 书本问答面板 */}
      {bookQAHasOpened && <Suspense fallback={null}>
        <BookQAPanel open={bookQAOpen} onClose={() => setBookQAOpen(false)} />
      </Suspense>}

      {/* 梳理面板 */}
      <ReviewPanel open={reviewOpen} reviewType={reviewType} onClose={() => setReviewOpen(false)} />

      {/* AI 建议浮层 */}
      <AISuggestionToast
        visible={aiToast.visible}
        loading={aiToast.loading}
        error={aiToast.error}
        errorMessage={aiToast.errorMessage}
        originalText={aiToast.originalText}
        result={aiToast.result}
        duplicate={aiToast.duplicate}
        onAcceptAll={handleAcceptAll}
        onAcceptTypeOnly={handleAcceptTypeOnly}
        onKeepOriginal={handleKeepOriginal}
        onDismiss={handleDismissToast}
      />

      <OnboardingGuide
        step={guideHidden ? 0 : onboardingStep}
        hasFirstNode={store.nodes.some(node => !guideStartNodeIdsRef.current.has(node.id))}
        canConnect={store.nodes.length >= 2}
        onStart={() => { setOnboardingStep(2); inputRef.current?.focus() }}
        onNext={() => setOnboardingStep(3)}
        onShowAI={() => setOnboardingStep(4)}
        onSkip={() => void completeOnboarding()}
        onFinish={() => void completeOnboarding()}
        onOpenManual={() => { void completeOnboarding(); setManualOpen(true) }}
      />

      {/* 底部浮动输入框 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-10">
        <div className="relative flex items-center gap-2">
          {/* AI 按钮 */}
          <button
            type="button"
            className="flex-shrink-0 w-11 h-11 rounded-full transition-colors hover:opacity-80 flex items-center justify-center text-base"
            style={{
              color: aiToast.loading ? '#C8A96E' : '#9C9088',
              backgroundColor: aiToast.loading ? 'rgba(200, 169, 110, 0.12)' : 'rgba(200, 200, 190, 0.06)',
              border: aiToast.loading ? '1px solid rgba(200, 169, 110, 0.25)' : '1px solid rgba(200, 200, 190, 0.15)',
              boxShadow: aiHintActive ? '0 0 0 3px rgba(200, 169, 110, 0.24)' : undefined,
            }}
            onClick={() => {
              const content = inputRef.current?.value.trim()
              if (aiToast.loading) return
              if (!content) {
                setOnboardingStep(4)
                inputRef.current?.focus()
                return
              }
              setInputValue('')
              if (onboardingStep === 4) void completeOnboarding()
              void handleInputSubmit(content)
            }}
            disabled={aiToast.loading}
            title="请念念帮我看一眼（分类与润色由你确认）"
            aria-label="请念念帮我看一眼"
            aria-describedby={aiHintActive ? 'onboarding-ai-tip' : undefined}
          >
            <NianNian size={24} />
          </button>
          <div className="relative flex-1">
            {aiToast.loading && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2">
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: '#C8A96E' }}
                />
              </div>
            )}
            <input
              ref={inputRef}
              className="input-underline text-center w-full pr-12"
              type="text"
              aria-label="写下一个念头"
              placeholder="想到了什么...？"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return
                const val = e.currentTarget.value.trim()
                if (!val) return
                if (e.key === 'Enter' && !e.ctrlKey) {
                  // Enter：直接发送（不经过 AI）
                  const content = e.currentTarget.value.trim()
                  e.currentTarget.value = ''
                  setInputValue('')
                  handleSendInput(content)
                } else if (e.key === 'Enter' && e.ctrlKey) {
                  // Ctrl+Enter：存入今日待办
                  const content = e.currentTarget.value.trim()
                  e.currentTarget.value = ''
                  setInputValue('')
                  saveDailyTask(content)
                }
              }}
            />
            {/* 发送按钮（输入框内部右侧） */}
            <button
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-[#F3E9DB]"
              style={{
                color: inputValue.trim() ? '#5A7A68' : '#C4B8B0',
                opacity: inputValue.trim() ? 1 : 0.5,
              }}
              onClick={() => {
                const input = document.querySelector('.input-underline') as HTMLInputElement
                const content = input?.value?.trim()
                if (!content) return
                input.value = ''
                setInputValue('')
                handleSendInput(content)
              }}
              title="发送（Enter）"
              aria-label="发送念头"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 8l12-6-6 12-2-6-4-0z" fill="currentColor" />
              </svg>
            </button>
          </div>
          {/* 今日待办按钮 */}
          <button
            type="button"
            className="flex-shrink-0 min-w-11 min-h-11 text-xs px-2.5 rounded-full transition-colors hover:opacity-80 flex items-center justify-center gap-1"
            style={{
              color: dailyTaskCount > 0 ? '#C8A96E' : '#9C9088',
              backgroundColor: dailyTaskCount > 0 ? 'rgba(200, 169, 110, 0.1)' : 'rgba(200, 200, 190, 0.06)',
              border: dailyTaskCount > 0 ? '1px solid rgba(200, 169, 110, 0.25)' : '1px solid rgba(200, 200, 190, 0.15)',
            }}
            onClick={() => setDailyPanelOpen(true)}
            title="我的待办（Ctrl+Enter 快速添加行动）"
            aria-label={dailyTaskCount > 0 ? `我的待办，${dailyTaskCount} 项` : '打开我的待办'}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m8 4 12 12M14 3l7 7-3 1-7-7 3-1ZM10 8l6 6-5 5-4-4-4 6 6-4-4-4 5-5Z" /></svg>
            {dailyTaskCount > 0 && <span className="font-medium tabular-nums">{dailyTaskCount}</span>}
          </button>
        </div>
      </div>

      {/* 空状态 */}
      {store.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <p className="text-lg text-center tracking-wide leading-relaxed" style={{ color: '#C4B8B0' }}>
            你的信念网络还是一片空白
            <br />
            <span className="text-sm mt-2 block">在下方输入你的第一个念头吧</span>
          </p>
        </div>
      )}

      {/* 左下角提示 */}
      {store.nodes.length > 0 && (
        <div className="absolute bottom-24 left-6 z-10 pointer-events-none">
          <p className="text-xs leading-relaxed" style={{ color: '#C4B8B0' }}>
            {store.focusNodeId ? (
              <>Esc 或点击空白退出聚焦</>
            ) : (
              <>
                拖拽空白平移 · 滚轮缩放
                <br />
                长按节点聚焦 · 右键更多
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
