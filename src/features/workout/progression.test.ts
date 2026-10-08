import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import type { Routine, RoutineExercise } from '../../db/types'
import { evaluateProgression, platesPerSide, roundTo, warmupSets } from './progression'
import { finishSession, startSession } from './session'

const set = (weightKg: number, reps: number, extra: Partial<{ done: boolean; warmup: boolean }> = {}) => ({ weightKg, reps, done: true, ...extra })

describe('progresión lineal (5x5)', () => {
  const item: RoutineExercise = { exerciseId: 'sq', sets: 5, reps: 5, restSec: 180, progression: { type: 'linear', incrementKg: 2.5, deloadAfter: 3 }, state: { weightKg: 100, failures: 0 } }

  it('sube si completa todas las series', () => {
    const r = evaluateProgression(item, Array(5).fill(set(100, 5)))!
    expect(r.state).toEqual({ weightKg: 102.5, failures: 0 })
    expect(r.note.outcome).toBe('up')
  })

  it('repite si falla y descarga al 90 % al tercer fallo', () => {
    const fail = [...Array(4).fill(set(100, 5)), set(100, 3)]
    const r1 = evaluateProgression(item, fail)!
    expect(r1.state).toEqual({ weightKg: 100, failures: 1 })
    const r3 = evaluateProgression({ ...item, state: { weightKg: 100, failures: 2 } }, fail)!
    expect(r3.note.outcome).toBe('deload')
    expect(r3.state).toEqual({ weightKg: 90, failures: 0 })
  })

  it('ignora calentamientos y series sin hacer', () => {
    const r = evaluateProgression(item, [set(60, 5, { warmup: true }), ...Array(5).fill(set(100, 5)), set(100, 5, { done: false })])!
    expect(r.note.outcome).toBe('up')
    expect(evaluateProgression(item, [set(60, 5, { warmup: true })])).toBeNull()
  })

  it('sin estado previo usa el peso que hiciste', () => {
    const r = evaluateProgression({ ...item, state: undefined }, Array(5).fill(set(80, 5)))!
    expect(r.state.weightKg).toBe(82.5)
  })
})

describe('doble progresión', () => {
  const item: RoutineExercise = { exerciseId: 'bp', sets: 3, reps: 8, restSec: 90, progression: { type: 'double', repMax: 12, incrementKg: 2.5 }, state: { weightKg: 60, failures: 0 } }

  it('mantiene el peso hasta llegar al tope en todas las series', () => {
    const r = evaluateProgression(item, [set(60, 12), set(60, 11), set(60, 10)])!
    expect(r.note.outcome).toBe('same')
    expect(r.state.weightKg).toBe(60)
    expect(r.note.message).toContain('mínimo hoy: 10')
  })

  it('sube cuando todas llegan a repMax', () => {
    const r = evaluateProgression(item, [set(60, 12), set(60, 12), set(60, 13)])!
    expect(r.note.outcome).toBe('up')
    expect(r.state.weightKg).toBe(62.5)
  })
})

describe('calentamiento y discos', () => {
  it('series de aproximación con barra', () => {
    expect(warmupSets(100, 20, true)).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 40, reps: 5 },
      { weightKg: 60, reps: 3 },
      { weightKg: 80, reps: 2 },
    ])
    expect(warmupSets(25, 20, true)).toEqual([{ weightKg: 20, reps: 10 }])
    expect(warmupSets(20, 20, false)).toEqual([
      { weightKg: 10, reps: 8 },
      { weightKg: 15, reps: 4 },
    ])
  })

  it('discos por lado', () => {
    expect(platesPerSide(102.5, 20, [25, 20, 15, 10, 5, 2.5, 1.25])).toEqual({ plates: [25, 15, 1.25], remainder: 0 })
    expect(platesPerSide(61, 20, [20, 10, 5, 2.5])?.remainder).toBeCloseTo(1)
    expect(platesPerSide(15, 20, [20])).toBeNull()
    expect(roundTo(91.2, 2.5)).toBe(90)
    expect(roundTo(91.3, 2.5)).toBe(92.5)
  })
})

describe('al terminar el entreno', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
  })

  it('guarda el siguiente peso en la rutina y la nota en la sesión; el próximo entreno lo usa', async () => {
    const routine: Routine = {
      id: 'r',
      name: '5x5 A',
      notes: '',
      order: 0,
      createdAt: 0,
      exercises: [{ exerciseId: 'sq', sets: 2, reps: 5, restSec: 60, progression: { type: 'linear', incrementKg: 2.5, deloadAfter: 3 }, state: { weightKg: 100, failures: 0 } }],
    }
    await db.routines.add(routine)
    const s1 = await startSession(routine)
    const sets = await db.sets.where('sessionId').equals(s1).toArray()
    expect(sets.map((s) => s.weightKg)).toEqual([100, 100])
    for (const s of sets) await db.sets.update(s.id, { done: true, reps: 5 })
    await finishSession(s1)

    const updated = (await db.routines.get('r'))!
    expect(updated.exercises[0].state).toEqual({ weightKg: 102.5, failures: 0 })
    expect((await db.sessions.get(s1))?.progression?.[0]).toMatchObject({ outcome: 'up', toKg: 102.5 })

    const s2 = await startSession(updated)
    expect((await db.sets.where('sessionId').equals(s2).toArray()).map((s) => [s.weightKg, s.reps])).toEqual([
      [102.5, 5],
      [102.5, 5],
    ])
  })

  it('en lineal sin estado usa el peso más alto de la última vez y las reps objetivo', async () => {
    const lin = { type: 'linear' as const, incrementKg: 2.5, deloadAfter: 3 }
    const free: Routine = { id: 'f', name: 'x', notes: '', order: 0, createdAt: 0, exercises: [{ exerciseId: 'sq', sets: 2, reps: 8, restSec: 60 }] }
    const s0 = await startSession(free)
    const sets0 = await db.sets.where('sessionId').equals(s0).toArray()
    await db.sets.update(sets0[0].id, { done: true, weightKg: 90, reps: 8 })
    await db.sets.update(sets0[1].id, { done: true, weightKg: 95, reps: 6 })
    await finishSession(s0)
    const s1 = await startSession({ ...free, id: 'g', exercises: [{ exerciseId: 'sq', sets: 3, reps: 5, restSec: 60, progression: lin }] })
    expect((await db.sets.where('sessionId').equals(s1).toArray()).map((s) => [s.weightKg, s.reps])).toEqual([
      [95, 5],
      [95, 5],
      [95, 5],
    ])
  })
})
