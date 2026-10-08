import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarHeatmap } from '../../components/charts'
import { Card } from '../../components/ui'
import { db } from '../../db/db'
import type { ISODate } from '../../db/types'
import { toISODate } from '../../lib/date'
import { addDays, calendarGrid, currentStreak, longestStreak, shortDate, weekStart } from './stats'
import { Stat } from './StrengthTab'

const WEEKS = 16

/** Semanas seguidas (terminando en la actual o la anterior) con al menos `min` entrenos. */
function weekStreak(trainingDays: Set<ISODate>, min = 2, today = toISODate()): number {
  const perWeek = new Map<ISODate, number>()
  for (const d of trainingDays) perWeek.set(weekStart(d), (perWeek.get(weekStart(d)) ?? 0) + 1)
  let w = weekStart(today)
  if ((perWeek.get(w) ?? 0) < min) w = addDays(w, -7) // la semana actual aún puede completarse
  let n = 0
  while ((perWeek.get(w) ?? 0) >= min) {
    n++
    w = addDays(w, -7)
  }
  return n
}

export function ConsistencyTab() {
  const data = useLiveQuery(async () => {
    const sessions = (await db.sessions.toArray()).filter((s) => s.endedAt)
    const sets = await db.sets.toArray()
    const setsBySession = new Map<string, number>()
    for (const s of sets) if (s.done) setsBySession.set(s.sessionId, (setsBySession.get(s.sessionId) ?? 0) + 1)
    const training = new Map<ISODate, { names: string[]; sets: number }>()
    for (const s of sessions) {
      const d = toISODate(new Date(s.startedAt))
      const cur = training.get(d) ?? { names: [], sets: 0 }
      training.set(d, { names: [...cur.names, s.name], sets: cur.sets + (setsBySession.get(s.id) ?? 0) })
    }
    const foodDays = new Set((await db.diary.toArray()).map((e) => e.date))
    return { training, foodDays }
  }, [])

  if (!data) return null
  const { training, foodDays } = data
  const today = toISODate()
  const trainingDays = new Set(training.keys())
  const monthStart = today.slice(0, 8) + '01'
  const thisWeek = [...trainingDays].filter((d) => d >= weekStart(today)).length
  const thisMonth = [...trainingDays].filter((d) => d >= monthStart).length

  const level = (d: ISODate): 0 | 1 | 2 | 3 | 4 => {
    const n = training.get(d)?.sets ?? 0
    if (!n) return 0
    if (n < 10) return 1
    if (n < 18) return 2
    if (n < 26) return 3
    return 4
  }
  const describe = (d: ISODate) => {
    const t = training.get(d)
    const parts = [shortDate(d)]
    parts.push(t ? `${t.names.join(' + ')} · ${t.sets} series` : 'sin entreno')
    if (foodDays.has(d)) parts.push('comida registrada')
    return parts.join(' · ')
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-center">
        <Stat label="Entrenos esta semana" value={String(thisWeek)} />
        <Stat label="Entrenos este mes" value={String(thisMonth)} />
        <Stat label="Semanas seguidas (≥2 entrenos)" value={String(weekStreak(trainingDays))} />
        <Stat label="Días seguidos registrando comida" value={`${currentStreak(foodDays)} (mejor ${longestStreak(foodDays)})`} />
      </div>

      <Card title={`Entrenos · últimas ${WEEKS} semanas`}>
        <CalendarHeatmap grid={calendarGrid(WEEKS, today)} level={level} describe={describe} />
        <p className="mt-2 text-xs text-muted">Más intenso = más series hechas ese día.</p>
      </Card>

      <Card title="Registro de comida · últimos 30 días">
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 30 }, (_, i) => addDays(today, i - 29)).map((d) => (
            <div
              key={d}
              title={`${shortDate(d)}: ${foodDays.has(d) ? 'registrado' : 'sin registro'}`}
              className={`aspect-square rounded ${foodDays.has(d) ? 'bg-[var(--color-heat-3)]' : 'bg-surface-2'}`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Cada cuadro es un día; azul = registraste al menos una comida.</p>
      </Card>
    </>
  )
}
