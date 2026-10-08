import type { ISODate } from '../../db/types'
import { toISODate } from '../../lib/date'

export interface Point {
  date: ISODate
  value: number
}

export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)
}

/** Media de los registros de los últimos `windowDays` días naturales (incluido el propio). */
export function movingAverage(points: Point[], windowDays = 7): Point[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  return sorted.map((p) => {
    const from = addDays(p.date, -(windowDays - 1))
    const win = sorted.filter((q) => q.date >= from && q.date <= p.date)
    return { date: p.date, value: win.reduce((s, q) => s + q.value, 0) / win.length }
  })
}

/** Ritmo en kg/semana por regresión lineal sobre los últimos `days` días (null si hay pocos datos). */
export function weeklyRate(points: Point[], days = 28, today: ISODate = toISODate()): number | null {
  const from = addDays(today, -days)
  const recent = points.filter((p) => p.date >= from && p.date <= today)
  if (recent.length < 3) return null
  const xs = recent.map((p) => daysBetween(from, p.date))
  if (Math.max(...xs) - Math.min(...xs) < 7) return null
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = recent.reduce((a, p) => a + p.value, 0) / recent.length
  let num = 0
  let den = 0
  recent.forEach((p, i) => {
    num += (xs[i] - mx) * (p.value - my)
    den += (xs[i] - mx) ** 2
  })
  return den ? (num / den) * 7 : null
}

/** Días consecutivos con actividad que terminan hoy (o ayer, si hoy aún no hay registro). */
export function currentStreak(days: Set<ISODate>, today: ISODate = toISODate()): number {
  let d = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function longestStreak(days: Set<ISODate>): number {
  const sorted = [...days].sort()
  let best = 0
  let run = 0
  sorted.forEach((d, i) => {
    run = i > 0 && daysBetween(sorted[i - 1], d) === 1 ? run + 1 : 1
    best = Math.max(best, run)
  })
  return best
}

/** Lunes de la semana de `iso`. */
export function weekStart(iso: ISODate): ISODate {
  const d = parseISO(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

/**
 * Cuadrícula de calendario: columnas = semanas (lunes a domingo), de la más
 * antigua a la actual. Los días futuros quedan como null.
 */
export function calendarGrid(weeks: number, today: ISODate = toISODate()): (ISODate | null)[][] {
  const first = addDays(weekStart(today), -(weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const iso = addDays(first, w * 7 + d)
      return iso <= today ? iso : null
    }),
  )
}

/** Series hechas por músculo principal. */
export function setsPerMuscle(
  sets: { exerciseId: string }[],
  muscles: Map<string, string[]>,
): { muscle: string; sets: number }[] {
  const count = new Map<string, number>()
  for (const s of sets) for (const m of muscles.get(s.exerciseId) ?? []) count.set(m, (count.get(m) ?? 0) + 1)
  return [...count.entries()].map(([muscle, n]) => ({ muscle, sets: n })).sort((a, b) => b.sets - a.sets)
}

/** Fecha corta para ejes y tooltips: "7 oct". */
export function shortDate(iso: ISODate): string {
  return parseISO(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')
}
