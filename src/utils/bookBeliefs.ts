import type { BeliefNode } from '../db'

/** 仅在用户主动选择个人模式时，挑选当前账号仍在使用的少量记录。 */
export function selectBookBeliefs(nodes: BeliefNode[], userId: string): string[] {
  const priority: Record<BeliefNode['type'], number> = {
    core_belief: 0, sub_belief: 1, thought_emotion_pattern: 2,
    thought: 3, emotion: 3, behavior: 4, material_reality: 4, seed: 5,
  }
  return nodes
    .filter(node => node.userId === userId && !node.deletedAt
      && (node.status === 'active' || node.status === 'observed') && node.content.trim())
    .sort((a, b) => priority[a.type] - priority[b.type] || b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8)
    .map(node => node.content.slice(0, 160))
}
