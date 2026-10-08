import { db, newId } from '../../db/db'
import type { ProgressionNote, Routine, SetLog, WorkoutSession } from '../../db/types'
import { evaluateProgression, isWorkSet, warmupSets } from './progression'
import { prefillSets } from './stats'

const ACTIVE_KEY = 'activeSessionId'

export async function getActiveSessionId(): Promise<string | null> {
  return ((await db.settings.get(ACTIVE_KEY))?.value as string | undefined) ?? null
}

/** Series completadas del último entreno (terminado) en que hiciste este ejercicio. */
export async function lastPerformance(exerciseId: string, excludeSessionId?: string): Promise<SetLog[]> {
  const recent = await db.sets
    .where('[exerciseId+createdAt]')
    .between([exerciseId, -Infinity], [exerciseId, Infinity])
    .reverse()
    .filter((s) => isWorkSet(s) && s.sessionId !== excludeSessionId)
    .first()
  if (!recent) return []
  const all = await db.sets.where('sessionId').equals(recent.sessionId).toArray()
  return all.filter((s) => s.exerciseId === exerciseId && isWorkSet(s)).sort((a, b) => a.order - b.order)
}

async function buildSets(
  sessionId: string,
  exerciseId: string,
  count: number,
  targetReps: number,
  startOrder: number,
  baseTime: number,
  targetWeightKg?: number,
  fixedReps = false,
): Promise<SetLog[]> {
  const last = await lastPerformance(exerciseId, sessionId)
  // Con progresión, el peso lo marca la regla; las reps, lo que hiciste la última vez a ese peso
  // (o el objetivo fijo en la lineal, p. ej. 5x5).
  let prefilled =
    targetWeightKg != null
      ? prefillSets(count, targetReps, last.filter((s) => s.weightKg === targetWeightKg)).map((p) => ({ ...p, weightKg: targetWeightKg }))
      : prefillSets(count, targetReps, last)
  if (fixedReps) {
    const top = targetWeightKg ?? Math.max(0, ...last.map((s) => s.weightKg))
    prefilled = prefilled.map(() => ({ weightKg: top, reps: targetReps }))
  }
  return prefilled.map((p, i) => ({
    id: newId(),
    sessionId,
    exerciseId,
    order: startOrder + i,
    weightKg: p.weightKg,
    reps: p.reps,
    rpe: null,
    done: false,
    createdAt: baseTime + startOrder + i,
  }))
}

export async function startSession(routine: Routine | null): Promise<string> {
  const id = newId()
  const now = Date.now()
  const session: WorkoutSession = {
    id,
    routineId: routine?.id ?? null,
    name: routine?.name ?? 'Entreno libre',
    startedAt: now,
    endedAt: null,
    notes: '',
  }
  const sets: SetLog[] = []
  let order = 0
  for (const re of routine?.exercises ?? []) {
    sets.push(
      ...(await buildSets(id, re.exerciseId, re.sets, re.reps, order, now, re.progression ? re.state?.weightKg : undefined, re.progression?.type === 'linear')),
    )
    order += re.sets
  }
  await db.transaction('rw', db.sessions, db.sets, db.settings, async () => {
    await db.sessions.add(session)
    await db.sets.bulkAdd(sets)
    await db.settings.put({ key: ACTIVE_KEY, value: id })
  })
  return id
}

async function nextOrder(sessionId: string): Promise<number> {
  const sets = await db.sets.where('sessionId').equals(sessionId).toArray()
  return sets.reduce((m, s) => Math.max(m, s.order + 1), 0)
}

export async function addExerciseToSession(sessionId: string, exerciseId: string, sets = 3, reps = 10) {
  const order = await nextOrder(sessionId)
  await db.sets.bulkAdd(await buildSets(sessionId, exerciseId, sets, reps, order, Date.now()))
}

/** Añade una serie copiando la última de ese ejercicio. */
export async function addSet(sessionId: string, exerciseId: string) {
  const sets = (await db.sets.where('sessionId').equals(sessionId).toArray())
    .filter((s) => s.exerciseId === exerciseId)
    .sort((a, b) => a.order - b.order)
  const prev = sets.at(-1)
  const lastOrder = prev?.order ?? (await nextOrder(sessionId)) - 1
  // Desplaza las series posteriores para insertar justo después de este ejercicio.
  const after = (await db.sets.where('sessionId').equals(sessionId).toArray()).filter((s) => s.order > lastOrder)
  await db.transaction('rw', db.sets, async () => {
    for (const s of after) await db.sets.update(s.id, { order: s.order + 1 })
    await db.sets.add({
      id: newId(),
      sessionId,
      exerciseId,
      order: lastOrder + 1,
      weightKg: prev?.weightKg ?? 0,
      reps: prev?.reps ?? 10,
      rpe: null,
      done: false,
      createdAt: Date.now(),
    })
  })
}

export async function removeExerciseFromSession(sessionId: string, exerciseId: string) {
  const ids = (await db.sets.where('sessionId').equals(sessionId).toArray())
    .filter((s) => s.exerciseId === exerciseId)
    .map((s) => s.id)
  await db.sets.bulkDelete(ids)
}

/**
 * Guarda solo las series completadas (sin ninguna, descarta el entreno) y
 * aplica la progresión de la rutina: calcula el peso de la próxima sesión.
 */
export async function finishSession(sessionId: string): Promise<'saved' | 'discarded'> {
  return db.transaction('rw', db.sessions, db.sets, db.settings, db.routines, async () => {
    const session = await db.sessions.get(sessionId)
    const sets = await db.sets.where('sessionId').equals(sessionId).toArray()
    const pending = sets.filter((s) => !s.done).map((s) => s.id)
    await db.sets.bulkDelete(pending)
    await db.settings.delete(ACTIVE_KEY)
    if (pending.length === sets.length) {
      await db.sessions.delete(sessionId)
      return 'discarded'
    }

    const notes: ProgressionNote[] = []
    const routine = session?.routineId ? await db.routines.get(session.routineId) : undefined
    if (routine) {
      let changed = false
      const exercises = routine.exercises.map((item) => {
        const result = evaluateProgression(item, sets.filter((s) => s.exerciseId === item.exerciseId && s.done))
        if (!result) return item
        changed = true
        notes.push({ exerciseId: item.exerciseId, ...result.note })
        return { ...item, state: result.state }
      })
      if (changed) await db.routines.update(routine.id, { exercises })
    }
    await db.sessions.update(sessionId, { endedAt: Date.now(), ...(notes.length ? { progression: notes } : {}) })
    return 'saved'
  })
}

/** Inserta series de calentamiento antes de la primera serie de trabajo del ejercicio. */
export async function addWarmups(sessionId: string, exerciseId: string, barKg: number, barbell: boolean) {
  const all = (await db.sets.where('sessionId').equals(sessionId).toArray()).sort((a, b) => a.order - b.order)
  const mine = all.filter((s) => s.exerciseId === exerciseId)
  if (!mine.length || mine.some((s) => s.warmup)) return
  const workKg = Math.max(...mine.map((s) => s.weightKg))
  const warm = warmupSets(workKg, barKg, barbell)
  if (!warm.length) return
  const firstOrder = mine[0].order
  await db.transaction('rw', db.sets, async () => {
    for (const s of all.filter((x) => x.order >= firstOrder)) await db.sets.update(s.id, { order: s.order + warm.length })
    await db.sets.bulkAdd(
      warm.map((w, i) => ({
        id: newId(),
        sessionId,
        exerciseId,
        order: firstOrder + i,
        weightKg: w.weightKg,
        reps: w.reps,
        rpe: null,
        done: false,
        warmup: true,
        createdAt: mine[0].createdAt - warm.length + i,
      })),
    )
  })
}

export async function discardSession(sessionId: string) {
  await db.transaction('rw', db.sessions, db.sets, db.settings, async () => {
    await db.sets.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
    await db.settings.delete(ACTIVE_KEY)
  })
}

/** Descarta el entreno actual y empieza otro en una sola transacción (sin estado intermedio vacío). */
export async function switchSession(oldId: string, routine: Routine | null): Promise<string> {
  return db.transaction('rw', db.sessions, db.sets, db.settings, async () => {
    await discardSession(oldId)
    return startSession(routine)
  })
}

export async function deleteSession(sessionId: string) {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

/** Rutina del último entreno terminado (para sugerir la siguiente en la rotación). */
export async function lastFinishedRoutineId(): Promise<string | null> {
  const s = await db.sessions
    .orderBy('startedAt')
    .reverse()
    .filter((x) => x.endedAt != null && x.routineId != null)
    .first()
  return s?.routineId ?? null
}

/** Agrupa las series por ejercicio, en el orden en que aparecen. */
export function groupByExercise(sets: SetLog[]): { exerciseId: string; sets: SetLog[] }[] {
  const groups: { exerciseId: string; sets: SetLog[] }[] = []
  for (const s of [...sets].sort((a, b) => a.order - b.order)) {
    const g = groups.find((x) => x.exerciseId === s.exerciseId)
    if (g) g.sets.push(s)
    else groups.push({ exerciseId: s.exerciseId, sets: [s] })
  }
  return groups
}
