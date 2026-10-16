import test from 'node:test'
import assert from 'node:assert/strict'
import type { BeliefEdge, BeliefNode } from '../src/db'
import { isSamePair, isDirectionalLink, sharedTargets } from '../src/utils/beliefLinks'

const node = (id: string) => ({ id, content: id, type: 'seed', position: { x: 0, y: 0, z: 0 } }) as BeliefNode
const edge = (sourceId: string, targetId: string, type: BeliefEdge['type'] = 'leads_to') => ({ sourceId, targetId, type }) as BeliefEdge

test('two beliefs may share a target without a direct relationship', () => {
  const nodes = ['A', 'B', 'C'].map(node)
  const edges = [edge('A', 'C'), edge('B', 'C')]
  assert.deepEqual(sharedTargets('A', 'B', edges, nodes).map(item => item.id), ['C'])
  assert.equal(edges.some(item => isSamePair(item, 'A', 'B')), false)
})

test('a direct relationship can coexist with the shared target', () => {
  const nodes = ['A', 'B', 'C'].map(node)
  const edges = [edge('A', 'C'), edge('B', 'C'), edge('A', 'B', 'related_to')]
  assert.equal(edges.length, 3)
  assert.deepEqual(sharedTargets('A', 'B', edges, nodes).map(item => item.id), ['C'])
  assert.equal(edges.some(item => isSamePair(item, 'B', 'A')), true)
  assert.equal(isDirectionalLink(edges[2].type), false)
})

test('undirected associations do not count as shared causal targets', () => {
  const edges = [edge('A', 'C', 'related_to'), edge('B', 'C', 'manual')]
  assert.deepEqual(sharedTargets('A', 'B', edges, ['A', 'B', 'C'].map(node)), [])
})
