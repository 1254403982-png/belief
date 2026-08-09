/**
 * 组件间共享的工具函数
 */

import type { BeliefNode } from '../db'

/** 节点类型 → 颜色 */
export function getNodeColor(type: string): string {
  switch (type) {
    case 'core_belief': return '#C8A96E'
    case 'sub_belief': return '#8BA4BC'
    case 'thought_emotion_pattern': return '#B8A0C8'
    case 'thought':
    case 'emotion': return '#C4B8B0'
    case 'behavior': return '#A0B89A'
    case 'material_reality': return '#B8A898'
    case 'seed': return '#E8E0D8'
    default: return '#C4B8B0'
  }
}

/** 节点类型 → 中文标签 */
export function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    core_belief: '核心信念',
    sub_belief: '附属信念',
    thought_emotion_pattern: '思维/情绪模式',
    thought: '想法',
    emotion: '情绪',
    behavior: '行为',
    material_reality: '物质现实',
    seed: '未分类',
  }
  return map[type] || type
}

/** 节点类型 → 半径 */
export function getNodeRadius(type: string): number {
  switch (type) {
    case 'core_belief': return 16
    case 'sub_belief': return 13
    case 'thought_emotion_pattern': return 12
    case 'material_reality': return 14
    case 'seed': return 8
    default: return 9
  }
}

/** 六位 hex → rgba */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 格式化日期 */
export function formatDate(d: Date): string {
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 类型层级（数字越小层级越高） */
export const TYPE_HIERARCHY: Record<string, number> = {
  core_belief: 0,
  sub_belief: 1,
  thought_emotion_pattern: 2,
  thought: 3,
  emotion: 3,
  behavior: 4,
  material_reality: 5,
  seed: 6,
}

/** 连线规则：seed 可连任意，手动连线始终允许 */
export function canConnect(_typeA: string, _typeB: string): boolean {
  // 手动连线不限制类型层级，用户可以自由连接任意节点
  return true
}

/**
 * 规范化连线方向：按信念层级，深层（低 level）→ 浅层（高 level）
 * core_belief(0) → sub_belief(1) → thought_emotion_pattern(2) → thought/emotion(3) → behavior(4) → material_reality(5)
 * 如果用户反向连接（如 behavior→core_belief），自动调整为 core_belief→behavior
 */
export function normalizeEdgeDirection(
  sourceId: string, targetId: string,
  sourceType: string, targetType: string,
): { sourceId: string; targetId: string } {
  const sourceLevel = TYPE_HIERARCHY[sourceType] ?? 99
  const targetLevel = TYPE_HIERARCHY[targetType] ?? 99
  // 层级数字越小越深层（根本），连线应从深层指向浅层
  if (sourceLevel > targetLevel) {
    return { sourceId: targetId, targetId: sourceId }
  }
  return { sourceId, targetId }
}

/** 连线颜色：由更高层级决定 */
export function getEdgeColor(typeA: string, typeB: string): string {
  const levelA = TYPE_HIERARCHY[typeA] ?? 6
  const levelB = TYPE_HIERARCHY[typeB] ?? 6
  const higherType = levelA <= levelB ? typeA : typeB
  switch (higherType) {
    case 'core_belief': return '#C8A96E'
    case 'sub_belief': return '#8BA4BC'
    case 'thought_emotion_pattern': return '#B8A0C8'
    case 'thought':
    case 'emotion': return '#C4B8B0'
    case 'behavior': return '#A0B89A'
    case 'material_reality': return '#B8A898'
    case 'seed': return '#D8CCBC'
    default: return '#D8CCBC'
  }
}

// ====== 领域分类 ======

export const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  study:       { label: '学习', emoji: '📚', color: '#8BA4BC' },
  work:        { label: '工作', emoji: '💼', color: '#A0B89A' },
  life:        { label: '生活', emoji: '🏠', color: '#C8A96E' },
  money:       { label: '金钱', emoji: '💰', color: '#B8A898' },
  love:        { label: '感情', emoji: '💕', color: '#D4A0A0' },
  friendship:  { label: '友情', emoji: '🤝', color: '#A0C8B8' },
  family:      { label: '家庭', emoji: '👨‍👩‍👧', color: '#D4C0A0' },
  health:      { label: '健康', emoji: '💚', color: '#A0C8A0' },
  self:        { label: '自我', emoji: '🧘', color: '#C0B0D0' },
  other:       { label: '其他', emoji: '🏷️', color: '#C4B8B0' },
}

export function getCategoryLabel(cat: string): string {
  return CATEGORY_CONFIG[cat]?.label ?? cat
}

export function getCategoryEmoji(cat: string): string {
  return CATEGORY_CONFIG[cat]?.emoji ?? '🏷️'
}

// ====== 图遍历 ======

/** BFS 获取与 startNodeId 连通的所有节点 ID（包括自身） */
export function getConnectedComponent(
  startNodeId: string,
  edges: Array<{ sourceId: string; targetId: string }>,
): Set<string> {
  const visited = new Set<string>()
  const queue = [startNodeId]
  visited.add(startNodeId)

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of edges) {
      if (edge.sourceId === current && !visited.has(edge.targetId)) {
        visited.add(edge.targetId)
        queue.push(edge.targetId)
      }
      if (edge.targetId === current && !visited.has(edge.sourceId)) {
        visited.add(edge.sourceId)
        queue.push(edge.sourceId)
      }
    }
  }
  return visited
}

/** BFS 获取带图距离的连通节点（用于链式拖拽权重计算） */
export function getConnectedWithDistance(
  startNodeId: string,
  edges: Array<{ sourceId: string; targetId: string }>,
): Map<string, number> {
  const distances = new Map<string, number>()
  const queue: Array<[string, number]> = [[startNodeId, 0]]
  distances.set(startNodeId, 0)

  while (queue.length > 0) {
    const [current, dist] = queue.shift()!
    const nextDist = dist + 1
    for (const edge of edges) {
      const neighbor = edge.sourceId === current ? edge.targetId
        : edge.targetId === current ? edge.sourceId
        : null
      if (neighbor && !distances.has(neighbor)) {
        distances.set(neighbor, nextDist)
        queue.push([neighbor, nextDist])
      }
    }
  }
  return distances
}

/** 连线类型 → 中文标签 */
export function edgeTypeLabel(type: string): string {
  const map: Record<string, string> = {
    derives_from: '派生自',
    leads_to: '导向',
    related_to: '相关',
    suggested_by_ai: 'AI 建议',
    manual: '手动连接',
  }
  return map[type] || type
}
