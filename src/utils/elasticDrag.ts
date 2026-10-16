import type { BeliefEdge } from '../db'

export interface ElasticFollower {
  id: string
  weight: number
}

const FOLLOW_WEIGHTS = [0, 0.58, 0.29, 0.12]

/** 连线只用于决定视觉联动范围，不推断信念之间的因果关系。 */
export function getElasticFollowers(
  startId: string,
  edges: Pick<BeliefEdge, 'sourceId' | 'targetId'>[],
  activeNodeIds: Set<string>,
): ElasticFollower[] {
  const distances = new Map<string, number>([[startId, 0]])
  const queue = [startId]
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]
    const distance = distances.get(current)!
    if (distance >= 3) continue
    for (const edge of edges) {
      const other = edge.sourceId === current ? edge.targetId : edge.targetId === current ? edge.sourceId : null
      if (!other || !activeNodeIds.has(other) || distances.has(other)) continue
      distances.set(other, distance + 1)
      queue.push(other)
    }
  }
  return [...distances].filter(([id]) => id !== startId).map(([id, distance]) => ({ id, weight: FOLLOW_WEIGHTS[distance] }))
}

export function stepElasticAxis(position: number, velocity: number, target: number): { position: number; velocity: number; settled: boolean } {
  const nextVelocity = (velocity + (target - position) * 0.14) * 0.72
  const nextPosition = position + nextVelocity
  const settled = Math.abs(target - nextPosition) < 0.25 && Math.abs(nextVelocity) < 0.08
  return settled ? { position: target, velocity: 0, settled: true } : { position: nextPosition, velocity: nextVelocity, settled: false }
}
