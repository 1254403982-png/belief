import test from 'node:test'
import assert from 'node:assert/strict'
import { getElasticFollowers, stepElasticAxis } from '../src/utils/elasticDrag'

test('elastic followers use shortest graph distance and stop after three links', () => {
  const edges = [
    { sourceId: 'a', targetId: 'b' },
    { sourceId: 'b', targetId: 'c' },
    { sourceId: 'c', targetId: 'd' },
    { sourceId: 'd', targetId: 'e' },
    { sourceId: 'a', targetId: 'c' },
  ]
  assert.deepEqual(getElasticFollowers('a', edges, new Set('abcde')), [
    { id: 'b', weight: 0.58 },
    { id: 'c', weight: 0.58 },
    { id: 'd', weight: 0.29 },
    { id: 'e', weight: 0.12 },
  ])
})

test('each of ten drags settles at a new position instead of losing elasticity', () => {
  let position = 180
  let velocity = 0
  for (let drag = 1; drag <= 10; drag++) {
    const target = 180 + drag * 20 * 0.58
    let settled = false
    for (let frame = 0; frame < 120; frame++) {
      const step = stepElasticAxis(position, velocity, target)
      position = step.position
      velocity = step.velocity
      if (step.settled) { settled = true; break }
    }
    assert.equal(settled, true, `drag ${drag} should settle`)
    assert.equal(position, target)
  }
})
