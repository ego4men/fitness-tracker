import { isWorkSet } from '../workout/progression'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HBarChart, LineChart } from '../../components/charts'
import { Card } from '../../components/ui'
import { db } from '../../db/db'
import { toISODate } from '../../lib/date'
import { muscleLabel } from '../exercises/labels'
import { estimate1RM, formatKg } from '../workout/stats'
import { addDays, setsPerMuscle, shortDate, type Point } from './stats'

interface ExerciseProgress {
  exerciseId: string
  name: string
  best1RM: number
  maxWeight: number
  lastDate: string
  sessions: { date: string; e1rm: number; maxWeight: number }[]
}

function useStrengthData() {
  return useLiveQuery(async () => {
    const sessions = (await db.sessions.toArray()).filter((s) => s.endedAt)
    const dateOf = new Map(sessions.map((s) => [s.id, toISODate(new Date(s.startedAt))]))
    const sets = (await db.sets.toArray()).filter((s) => isWorkSet(s) && dateOf.has(s.sessionId))
    const exercises = await db.exercises.bulkGet([...new Set(sets.map((s) => s.exerciseId))])
    const info = new Map(exercises.filter(Boolean).map((e) => [e!.id, e!]))

    // Por ejercicio y sesión: mejor 1RM estimado y peso máximo.
    const map = new Map<string, Map<string, { e1rm: number; maxWeight: number }>>()
    for (const s of sets) {
      if (s.weightKg <= 0) continue
      const bySession = map.get(s.exerciseId) ?? new Map()
      const date = dateOf.get(s.sessionId)!
      const cur = bySession.get(date) ?? { e1rm: 0, maxWeight: 0 }
      bySession.set(date, { e1rm: Math.max(cur.e1rm, estimate1RM(s.weightKg, s.reps)), maxWeight: Math.max(cur.maxWeight, s.weightKg) })
      map.set(s.exerciseId, bySession)
    }
    const progress: ExerciseProgress[] = [...map.entries()].map(([exerciseId, bySession]) => {
      const list = [...bySession.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date))
      return {
        exerciseId,
        name: info.get(exerciseId)?.name ?? exerciseId,
        best1RM: Math.max(...list.map((l) => l.e1rm)),
        maxWeight: Math.max(...list.map((l) => l.maxWeight)),
        lastDate: list.at(-1)!.date,
        sessions: list,
      }
    })
    progress.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.sessions.length - a.sessions.length)

    const weekAgo = addDays(toISODate(), -6)
    const recentSets = sets.filter((s) => dateOf.get(s.sessionId)! >= weekAgo)
    const muscles = new Map([...info.values()].map((e) => [e.id, e.primaryMuscles]))
    return { progress, perMuscle: setsPerMuscle(recentSets, muscles) }
  }, [])
}

export function StrengthTab() {
  const data = useStrengthData()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  if (!data) return null
  const { progress, perMuscle } = data

  if (!progress.length) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Termina tu primer entreno con pesos registrados y aquí verás tus récords y su evolución. <Link to="/entreno" className="text-accent">Ir a Entreno</Link>
        </p>
      </Card>
    )
  }

  const selected = progress.find((p) => p.exerciseId === selectedId) ?? progress[0]
  const e1rm: Point[] = selected.sessions.map((s) => ({ date: s.date, value: Math.round(s.e1rm * 2) / 2 }))
  const maxW: Point[] = selected.sessions.map((s) => ({ date: s.date, value: s.maxWeight }))
  const first = selected.sessions[0]
  const gain = selected.sessions.length > 1 ? selected.best1RM - first.e1rm : null

  return (
    <>
      <Card title="Evolución">
        <select
          value={selected.exerciseId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mb-3 min-h-11 w-full rounded-xl border border-line bg-surface-2 px-3 focus:border-accent focus:outline-none"
        >
          {progress.map((p) => (
            <option key={p.exerciseId} value={p.exerciseId}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="1RM estimado" value={`${formatKg(Math.round(selected.best1RM * 2) / 2)} kg`} />
          <Stat label="Peso máximo" value={`${formatKg(selected.maxWeight)} kg`} />
          <Stat label="Desde el inicio" value={gain != null ? `${gain >= 0 ? '+' : ''}${formatKg(Math.round(gain * 2) / 2)} kg` : '—'} />
        </div>
        {selected.sessions.length > 1 ? (
          <LineChart
            unit="kg"
            series={[
              { label: 'Peso máximo', color: 'var(--color-series-soft)', points: maxW, kind: 'dots' },
              { label: '1RM estimado', color: 'var(--color-series)', points: e1rm, kind: 'line' },
            ]}
          />
        ) : (
          <p className="text-sm text-muted">Con dos o más entrenos de este ejercicio verás la gráfica.</p>
        )}
        <p className="mt-2 text-xs text-muted">1RM estimado = el máximo que podrías levantar una vez, calculado con la fórmula de Epley a partir de tus series.</p>
      </Card>

      <Card title="Series por músculo · últimos 7 días">
        {perMuscle.length ? (
          <>
            <HBarChart rows={perMuscle.map((m) => ({ label: muscleLabel(m.muscle), value: m.sets }))} color="var(--color-series)" unit="series" band={[10, 20]} />
            <p className="mt-3 text-xs text-muted">Números = series hechas. La franja gris marca 10–20 series semanales por músculo, el rango habitual para ganar músculo. Cuenta solo el músculo principal de cada ejercicio.</p>
          </>
        ) : (
          <p className="text-sm text-muted">Sin series esta semana.</p>
        )}
      </Card>

      <Card title="Récords">
        <ul className="divide-y divide-line">
          {progress.map((p) => (
            <li key={p.exerciseId}>
              <Link to={`/entreno/ejercicios/${encodeURIComponent(p.exerciseId)}`} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.sessions.length} {p.sessions.length === 1 ? 'entreno' : 'entrenos'} · último {shortDate(p.lastDate)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatKg(p.maxWeight)} kg</p>
                  <p className="text-[11px] text-muted tabular-nums">1RM ~{formatKg(Math.round(p.best1RM * 2) / 2)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  )
}
