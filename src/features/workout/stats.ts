import type { Routine, SetLog } from '../../db/types'

/** 1RM estimado (Epley). Con 1 repetición devuelve el propio peso. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

export function volume(sets: Pick<SetLog, 'weightKg' | 'reps' | 'done'>[]): number {
  return sets.reduce((s, x) => (x.done ? s + x.weightKg * x.reps : s), 0)
}

/** Siguiente rutina en la rotación (Push → Pull → Legs → Push…). */
export function nextRoutine(routines: Routine[], lastRoutineId: string | null): Routine | null {
  if (!routines.length) return null
  const sorted = [...routines].sort((a, b) => a.order - b.order)
  const i = sorted.findIndex((r) => r.id === lastRoutineId)
  return sorted[(i + 1) % sorted.length] // i = -1 → la primera
}

export interface PrefillSet {
  weightKg: number
  reps: number
}

/**
 * Valores iniciales de las series: lo que hiciste la última vez en esa misma
 * serie; si hoy hay más series que la última vez, repite la última.
 */
export function prefillSets(count: number, targetReps: number, last: PrefillSet[]): PrefillSet[] {
  return Array.from({ length: count }, (_, i) => {
    const prev = last[i] ?? last.at(-1)
    return prev ? { weightKg: prev.weightKg, reps: prev.reps } : { weightKg: 0, reps: targetReps }
  })
}

export function formatKg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

/** "80×8, 80×8, 77.5×7" */
export function summarizeSets(sets: Pick<SetLog, 'weightKg' | 'reps'>[]): string {
  return sets.map((s) => (s.weightKg > 0 ? `${formatKg(s.weightKg)}×${s.reps}` : `${s.reps} reps`)).join(', ')
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}
