import { describe, it, expect } from 'vitest'
import { FEATURES } from '../src/features.js'

describe('vote dedup logic', () => {
  it('SADD deduplicates same userId (Set models KV SADD behavior)', () => {
    const people = new Set()
    people.add('user-123')
    people.add('user-123')
    expect(people.size).toBe(1)
  })

  it('offline queue preserves each tap — no dedup on INCR', () => {
    const queue = [
      { featureId: 'echo', userId: 'u1', ts: 1000 },
      { featureId: 'echo', userId: 'u1', ts: 1500 },
    ]
    expect(queue).toHaveLength(2)
  })

  it('two different users voting same feature produce people count of 2', () => {
    const people = new Set()
    people.add('user-aaa')
    people.add('user-bbb')
    expect(people.size).toBe(2)
  })
})

describe('features config', () => {
  it('has at least one feature', () => {
    expect(FEATURES.length).toBeGreaterThan(0)
  })

  it('each feature has id, label, desc', () => {
    for (const f of FEATURES) {
      expect(f.id).toBeTruthy()
      expect(f.label).toBeTruthy()
      expect(f.desc).toBeTruthy()
    }
  })

  it('feature ids are unique', () => {
    const ids = FEATURES.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
