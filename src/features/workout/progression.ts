import type { ProgressionNote, ProgressionState, RoutineExercise, SetLog } from '../../db/types'
import { formatKg } from './stats'

/** Redondea al múltiplo de `step` más cercano (p. ej. 2.5 kg). */
export function roundTo(weight: number, step: number): number {
  if (step <= 0) return weight
  return Math.round(Math.round(weight / step) * step * 100) / 100
}

export const isWorkSet = (s: Pick<SetLog, 'done' | 'warmup'>) => s.done && !s.warmup

/**
 * Decide el peso de la próxima sesión a partir de las series de trabajo hechas hoy.
 * Devuelve null si el ejercicio no tiene progresión o no se hizo.
 */
export function evaluateProgression(
  item: RoutineExercise,
  sets: Pick<SetLog, 'weightKg' | 'reps' | 'done' | 'warmup'>[],
): { state: ProgressionState; note: Omit<ProgressionNote, 'exerciseId'> } | null {
  const rule = item.progression
  const work = sets.filter(isWorkSet)
  if (!rule || work.length === 0) return null

  const used = Math.max(...work.map((s) => s.weightKg))
  const target = item.state?.weightKg ?? used
  const atWeight = work.filter((s) => s.weightKg >= target)
  const enoughSets = atWeight.length >= item.sets
  const step = Math.min(rule.incrementKg, 2.5) || 2.5

  if (rule.type === 'double') {
    const topped = enoughSets && atWeight.slice(0, item.sets).every((s) => s.reps >= rule.repMax)
    if (topped) {
      const next = roundTo(target + rule.incrementKg, step)
      return {
        state: { weightKg: next, failures: 0 },
        note: { outcome: 'up', fromKg: target, toKg: next, message: `¡Rango completado! Sube a ${formatKg(next)} kg y vuelve a ${item.reps} reps.` },
      }
    }
    const best = Math.min(...atWeight.slice(0, item.sets).map((s) => s.reps), rule.repMax)
    return {
      state: { weightKg: target, failures: 0 },
      note: {
        outcome: 'same',
        fromKg: target,
        toKg: target,
        message: `Mantén ${formatKg(target)} kg y busca ${rule.repMax} reps en todas las series${enoughSets ? ` (mínimo hoy: ${best})` : ''}.`,
      },
    }
  }

  // Lineal
  const success = enoughSets && atWeight.slice(0, item.sets).every((s) => s.reps >= item.reps)
  if (success) {
    const next = roundTo(target + rule.incrementKg, step)
    return {
      state: { weightKg: next, failures: 0 },
      note: { outcome: 'up', fromKg: target, toKg: next, message: `Completado. Próxima vez: ${formatKg(next)} kg.` },
    }
  }
  const failures = (item.state?.failures ?? 0) + 1
  if (failures >= rule.deloadAfter) {
    const next = roundTo(target * 0.9, step)
    return {
      state: { weightKg: next, failures: 0 },
      note: { outcome: 'deload', fromKg: target, toKg: next, message: `${failures} fallos seguidos: descarga al 90 % (${formatKg(next)} kg).` },
    }
  }
  return {
    state: { weightKg: target, failures },
    note: { outcome: 'same', fromKg: target, toKg: target, message: `Repite ${formatKg(target)} kg (intento ${failures + 1} de ${rule.deloadAfter}).` },
  }
}

/** Texto corto del objetivo para mostrar en el entreno. */
export function targetLabel(item: RoutineExercise): string | null {
  if (!item.progression) return null
  const reps = item.progression.type === 'double' ? `${item.reps}–${item.progression.repMax}` : String(item.reps)
  const w = item.state ? `${formatKg(item.state.weightKg)} kg × ` : ''
  return `Objetivo: ${w}${item.sets}×${reps}`
}

/** Series de aproximación hasta el peso de trabajo. */
export function warmupSets(workKg: number, barKg: number, barbell: boolean): { weightKg: number; reps: number }[] {
  if (barbell) {
    if (workKg <= barKg + 10) return [{ weightKg: barKg, reps: 10 }]
    const steps = [
      { pct: 0, reps: 10 },
      { pct: 0.4, reps: 5 },
      { pct: 0.6, reps: 3 },
      { pct: 0.8, reps: 2 },
    ]
    const out: { weightKg: number; reps: number }[] = []
    for (const s of steps) {
      const w = s.pct === 0 ? barKg : Math.max(barKg, roundTo(workKg * s.pct, 2.5))
      if (w >= workKg) continue
      if (out.some((o) => o.weightKg === w)) continue
      out.push({ weightKg: w, reps: s.reps })
    }
    return out
  }
  if (workKg <= 0) return []
  return [
    { weightKg: roundTo(workKg * 0.5, 1), reps: 8 },
    { weightKg: roundTo(workKg * 0.75, 1), reps: 4 },
  ].filter((s) => s.weightKg > 0 && s.weightKg < workKg)
}

/** Discos por lado (greedy con los discos disponibles, en pares ilimitados). */
export function platesPerSide(totalKg: number, barKg: number, plates: number[]): { plates: number[]; remainder: number } | null {
  if (totalKg < barKg) return null
  let side = Math.round(((totalKg - barKg) / 2) * 1000) / 1000
  const out: number[] = []
  for (const p of [...plates].sort((a, b) => b - a)) {
    while (side >= p - 1e-9) {
      out.push(p)
      side = Math.round((side - p) * 1000) / 1000
    }
  }
  return { plates: out, remainder: side * 2 }
}
