import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import type { Routine } from '../../db/types'
import { finishSession, getActiveSessionId, lastPerformance, startSession, addSet, switchSession } from './session'
import { estimate1RM, nextRoutine, prefillSets, summarizeSets } from './stats'

const routine = (id: string, order: number, exercises: Routine['exercises'] = []): Routine => ({
  id,
  name: id,
  notes: '',
  exercises,
  order,
  createdAt: 0,
})

describe('stats', () => {
  it('estima el 1RM con Epley', () => {
    expect(estimate1RM(100, 1)).toBe(100)
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1)
    expect(estimate1RM(0, 10)).toBe(0)
  })

  it('rota Push → Pull → Legs → Push', () => {
    const rs = [routine('legs', 2), routine('push', 0), routine('pull', 1)]
    expect(nextRoutine(rs, null)?.id).toBe('push')
    expect(nextRoutine(rs, 'push')?.id).toBe('pull')
    expect(nextRoutine(rs, 'legs')?.id).toBe('push')
    expect(nextRoutine(rs, 'borrada')?.id).toBe('push')
    expect(nextRoutine([], null)).toBeNull()
  })

  it('rellena series con la última vez y repite la última si hay más', () => {
    expect(prefillSets(2, 8, [])).toEqual([
      { weightKg: 0, reps: 8 },
      { weightKg: 0, reps: 8 },
    ])
    expect(prefillSets(3, 8, [{ weightKg: 80, reps: 8 }, { weightKg: 77.5, reps: 7 }])).toEqual([
      { weightKg: 80, reps: 8 },
      { weightKg: 77.5, reps: 7 },
      { weightKg: 77.5, reps: 7 },
    ])
  })

  it('resume series', () => {
    expect(summarizeSets([{ weightKg: 80, reps: 8 }, { weightKg: 0, reps: 12 }])).toBe('80×8, 12 reps')
  })
})

describe('sesión de entreno', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('crea series desde la rutina, guarda solo las hechas y las usa como "última vez"', async () => {
    const push = routine('push', 0, [{ exerciseId: 'bench', sets: 3, reps: 8, restSec: 120 }])
    await db.routines.add(push)

    const s1 = await startSession(push)
    expect(await getActiveSessionId()).toBe(s1)
    const sets1 = await db.sets.where('sessionId').equals(s1).sortBy('order')
    expect(sets1).toHaveLength(3)
    expect(sets1[0]).toMatchObject({ weightKg: 0, reps: 8, done: false })

    await db.sets.update(sets1[0].id, { weightKg: 80, reps: 8, done: true })
    await db.sets.update(sets1[1].id, { weightKg: 80, reps: 7, done: true })
    expect(await finishSession(s1)).toBe('saved')
    expect(await getActiveSessionId()).toBeNull()
    expect(await db.sets.where('sessionId').equals(s1).count()).toBe(2)

    const last = await lastPerformance('bench')
    expect(last.map((s) => [s.weightKg, s.reps])).toEqual([
      [80, 8],
      [80, 7],
    ])

    const s2 = await startSession(push)
    const sets2 = await db.sets.where('sessionId').equals(s2).sortBy('order')
    expect(sets2.map((s) => [s.weightKg, s.reps])).toEqual([
      [80, 8],
      [80, 7],
      [80, 7],
    ])
  })

  it('añade una serie copiando la anterior, justo después de ese ejercicio', async () => {
    const r = routine('r', 0, [
      { exerciseId: 'a', sets: 1, reps: 5, restSec: 60 },
      { exerciseId: 'b', sets: 1, reps: 10, restSec: 60 },
    ])
    const id = await startSession(r)
    const [a] = await db.sets.where('sessionId').equals(id).sortBy('order')
    await db.sets.update(a.id, { weightKg: 50 })
    await addSet(id, 'a')
    const sets = await db.sets.where('sessionId').equals(id).sortBy('order')
    expect(sets.map((s) => [s.exerciseId, s.weightKg])).toEqual([
      ['a', 50],
      ['a', 50],
      ['b', 0],
    ])
  })

  it('cambia de rutina sin dejar un estado sin entreno activo', async () => {
    const push = routine('push', 0, [{ exerciseId: 'bench', sets: 2, reps: 8, restSec: 60 }])
    const legs = routine('legs', 1, [{ exerciseId: 'squat', sets: 3, reps: 5, restSec: 60 }])
    const old = await startSession(push)
    const id = await switchSession(old, legs)
    expect(await getActiveSessionId()).toBe(id)
    expect(await db.sessions.get(old)).toBeUndefined()
    expect(await db.sets.where('sessionId').equals(id).count()).toBe(3)
    expect((await db.sessions.get(id))?.name).toBe('legs')
  })

  it('descarta un entreno sin series hechas', async () => {
    const id = await startSession(routine('r', 0, [{ exerciseId: 'a', sets: 2, reps: 5, restSec: 60 }]))
    expect(await finishSession(id)).toBe('discarded')
    expect(await db.sessions.get(id)).toBeUndefined()
  })
})
