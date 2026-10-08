import { describe, expect, it } from 'vitest'
import { calendarGrid, currentStreak, longestStreak, movingAverage, setsPerMuscle, weekStart, weeklyRate } from './stats'

describe('progreso', () => {
  it('media móvil por días naturales, no por registros', () => {
    const ma = movingAverage([
      { date: '2026-10-01', value: 80 },
      { date: '2026-10-02', value: 82 },
      { date: '2026-10-10', value: 78 }, // más de 7 días después: ventana propia
    ])
    expect(ma.map((p) => p.value)).toEqual([80, 81, 78])
  })

  it('ritmo semanal por regresión', () => {
    const pts = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      value: 80 + i * (0.5 / 7), // +0.5 kg/semana
    }))
    expect(weeklyRate(pts, 28, '2026-10-15')).toBeCloseTo(0.5, 5)
    expect(weeklyRate(pts.slice(0, 2), 28, '2026-10-15')).toBeNull()
  })

  it('rachas', () => {
    const days = new Set(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'])
    expect(currentStreak(days, '2026-10-06')).toBe(2)
    expect(currentStreak(days, '2026-10-07')).toBe(2) // hoy aún sin registro
    expect(currentStreak(days, '2026-10-08')).toBe(0)
    expect(longestStreak(days)).toBe(3)
  })

  it('calendario por semanas de lunes a domingo', () => {
    expect(weekStart('2026-10-07')).toBe('2026-10-05') // miércoles → lunes
    const g = calendarGrid(2, '2026-10-07')
    expect(g[0][0]).toBe('2026-09-28')
    expect(g[1][2]).toBe('2026-10-07')
    expect(g[1][3]).toBeNull()
  })

  it('cuenta series por músculo principal', () => {
    const muscles = new Map([
      ['bench', ['chest']],
      ['row', ['middle back', 'lats']],
    ])
    expect(setsPerMuscle([{ exerciseId: 'bench' }, { exerciseId: 'bench' }, { exerciseId: 'row' }], muscles)).toEqual([
      { muscle: 'chest', sets: 2 },
      { muscle: 'middle back', sets: 1 },
      { muscle: 'lats', sets: 1 },
    ])
  })
})
