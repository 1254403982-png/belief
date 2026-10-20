import type { BeliefEdge, BeliefNode } from '../db'
import { tr } from '../i18n'

export type ChosenLinkType = 'leads_to' | 'related_to' | 'manual'

export function isSamePair(edge: Pick<BeliefEdge, 'sourceId' | 'targetId'>, firstId: string, secondId: string): boolean {
  return (edge.sourceId === firstId && edge.targetId === secondId)
    || (edge.sourceId === secondId && edge.targetId === firstId)
}

export function linkTypeLabel(type: BeliefEdge['type']): string {
  switch (type) {
    case 'leads_to': return tr('可能影响')
    case 'derives_from': return tr('可能派生')
    case 'related_to': return tr('有关联')
    case 'suggested_by_ai': return tr('旧 AI 建议 · 待确认')
    case 'manual': return tr('关系待厘清')
  }
}

export function isDirectionalLink(type: BeliefEdge['type']): boolean {
  return type === 'leads_to' || type === 'derives_from'
}

/** 两个节点共同指向同一处，只是一个结构事实，不推断它们彼此影响。 */
export function sharedTargets(firstId: string, secondId: string, edges: BeliefEdge[], nodes: BeliefNode[]): BeliefNode[] {
  const firstTargets = new Set(edges.filter(edge => isDirectionalLink(edge.type) && edge.sourceId === firstId).map(edge => edge.targetId))
  const secondTargets = new Set(edges.filter(edge => isDirectionalLink(edge.type) && edge.sourceId === secondId).map(edge => edge.targetId))
  return nodes.filter(node => !node.deletedAt && firstTargets.has(node.id) && secondTargets.has(node.id))
}
