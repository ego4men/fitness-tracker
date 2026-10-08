import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Page } from '../../components/ui'
import { db, newId } from '../../db/db'
import type { Routine } from '../../db/types'
import { getActiveSessionId, lastFinishedRoutineId, startSession } from './session'
import { formatDuration, nextRoutine } from './stats'

export function useWorkoutOverview() {
  return useLiveQuery(async () => {
    const routines = (await db.routines.toArray()).sort((a, b) => a.order - b.order)
    const activeId = await getActiveSessionId()
    const active = activeId ? await db.sessions.get(activeId) : undefined
    const next = nextRoutine(routines, await lastFinishedRoutineId())
    return { routines, active: active ?? null, next }
  }, [])
}

export function useStartRoutine() {
  const navigate = useNavigate()
  return async (routine: Routine | null) => {
    const activeId = await getActiveSessionId()
    if (activeId) return navigate('/entreno/sesion')
    await startSession(routine)
    navigate('/entreno/sesion')
  }
}

export function WorkoutPage() {
  const data = useWorkoutOverview()
  const start = useStartRoutine()
  const navigate = useNavigate()
  const names = useLiveQuery(async () => {
    const all = await db.exercises.toArray()
    return new Map(all.map((e) => [e.id, e.name]))
  }, [])

  if (!data) return null
  const { routines, active, next } = data

  const createRoutine = async () => {
    const id = newId()
    const order = routines.reduce((m, r) => Math.max(m, r.order + 1), 0)
    await db.routines.add({ id, name: 'Nueva rutina', notes: '', exercises: [], order, createdAt: Date.now() })
    navigate(`/entreno/rutina/${id}`)
  }

  return (
    <Page title="Entreno">
      {active ? (
        <Card title="Entreno en curso">
          <p className="mb-3 text-lg font-semibold">
            {active.name} <span className="text-sm font-normal text-muted">· {formatDuration(Date.now() - active.startedAt)}</span>
          </p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/entreno/sesion')}>
            Continuar entreno
          </Button>
        </Card>
      ) : (
        next && (
          <Card title="Te toca">
            <p className="mb-1 text-2xl font-bold">{next.name}</p>
            {next.notes && <p className="mb-3 text-sm text-muted">{next.notes}</p>}
            <Button variant="primary" className="w-full" onClick={() => start(next)}>
              Empezar {next.name}
            </Button>
          </Card>
        )
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/entreno/historial" className="rounded-2xl border border-line bg-surface p-4 font-semibold active:bg-surface-2">
          📅 Historial
        </Link>
        <Link to="/entreno/ejercicios" className="rounded-2xl border border-line bg-surface p-4 font-semibold active:bg-surface-2">
          📖 Ejercicios
        </Link>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Mis rutinas</h2>
        <button onClick={createRoutine} className="min-h-11 px-2 text-sm font-semibold text-accent">
          + Nueva
        </button>
      </div>

      {routines.map((r) => (
        <Card key={r.id}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold">{r.name}</p>
              {r.notes && <p className="text-sm text-muted">{r.notes}</p>}
            </div>
            <Link to={`/entreno/rutina/${r.id}`} className="min-h-11 shrink-0 px-2 py-2 text-sm text-accent">
              Editar
            </Link>
          </div>
          <p className="mb-3 line-clamp-2 text-sm text-text/80">
            {r.exercises.length
              ? r.exercises.map((e) => names?.get(e.exerciseId) ?? '…').join(' · ')
              : 'Sin ejercicios todavía.'}
          </p>
          <Button className="w-full" disabled={!!active || !r.exercises.length} onClick={() => start(r)}>
            Empezar
          </Button>
        </Card>
      ))}

      <Button disabled={!!active} onClick={() => start(null)}>
        Entreno libre (sin rutina)
      </Button>
    </Page>
  )
}
