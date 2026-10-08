import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Page } from '../../components/ui'
import { db } from '../../db/db'
import type { Exercise, SetLog } from '../../db/types'
import { ExercisePicker, ExerciseThumb } from '../exercises/ExerciseBrowser'
import { useRestTimer } from './restTimer'
import {
  addExerciseToSession,
  addSet,
  discardSession,
  finishSession,
  getActiveSessionId,
  groupByExercise,
  lastPerformance,
  removeExerciseFromSession,
} from './session'
import { formatDuration, summarizeSets } from './stats'

const DEFAULT_REST = 90

export function ActiveSessionPage() {
  const navigate = useNavigate()
  const [picking, setPicking] = useState(false)
  const [, tick] = useState(0)
  const startRest = useRestTimer((s) => s.start)

  const data = useLiveQuery(async () => {
    const id = await getActiveSessionId()
    const session = id ? await db.sessions.get(id) : undefined
    if (!session) return { session: null }
    const sets = await db.sets.where('sessionId').equals(session.id).toArray()
    const routine = session.routineId ? await db.routines.get(session.routineId) : undefined
    const exercises = await db.exercises.bulkGet([...new Set(sets.map((s) => s.exerciseId))])
    return {
      session,
      groups: groupByExercise(sets),
      routine: routine ?? null,
      exercises: new Map(exercises.filter(Boolean).map((e) => [e!.id, e!])),
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!data) return null
  if (!data.session) return <Navigate to="/entreno" replace />
  const { session, groups, routine, exercises } = data

  const doneCount = groups.reduce((n, g) => n + g.sets.filter((s) => s.done).length, 0)
  const totalCount = groups.reduce((n, g) => n + g.sets.length, 0)

  const restFor = (exerciseId: string) =>
    routine?.exercises.find((e) => e.exerciseId === exerciseId)?.restSec ?? DEFAULT_REST

  const onFinish = async () => {
    const pending = totalCount - doneCount
    const msg = doneCount
      ? pending
        ? `¿Terminar? ${pending} serie(s) sin marcar no se guardarán.`
        : '¿Terminar y guardar el entreno?'
      : 'No marcaste ninguna serie: el entreno se descartará. ¿Terminar?'
    if (!confirm(msg)) return
    useRestTimer.getState().stop()
    const result = await finishSession(session.id)
    navigate(result === 'saved' ? `/entreno/historial/${session.id}` : '/entreno', { replace: true })
  }

  const onDiscard = async () => {
    if (!confirm('¿Descartar este entreno? Se borrará todo lo registrado.')) return
    useRestTimer.getState().stop()
    await discardSession(session.id)
    navigate('/entreno', { replace: true })
  }

  const onPick = async (e: Exercise) => {
    setPicking(false)
    await addExerciseToSession(session.id, e.id)
  }

  return (
    <Page
      title={session.name}
      subtitle={`${formatDuration(Date.now() - session.startedAt)} · ${doneCount}/${totalCount} series`}
      action={
        <Button variant="primary" onClick={onFinish}>
          Terminar
        </Button>
      }
    >
      {groups.map((g) => {
        const ex = exercises.get(g.exerciseId)
        return (
          <ExerciseBlock
            key={g.exerciseId}
            sessionId={session.id}
            exercise={ex}
            exerciseId={g.exerciseId}
            sets={g.sets}
            onSetDone={() => startRest(restFor(g.exerciseId))}
          />
        )
      })}

      <Button onClick={() => setPicking(true)}>+ Añadir ejercicio</Button>
      <Button variant="danger" onClick={onDiscard}>
        Descartar entreno
      </Button>

      {picking && <ExercisePicker onSelect={onPick} onClose={() => setPicking(false)} />}
    </Page>
  )
}

function ExerciseBlock({
  sessionId,
  exercise,
  exerciseId,
  sets,
  onSetDone,
}: {
  sessionId: string
  exercise: Exercise | undefined
  exerciseId: string
  sets: SetLog[]
  onSetDone: () => void
}) {
  const last = useLiveQuery(() => lastPerformance(exerciseId, sessionId), [exerciseId, sessionId])

  const onRemove = async () => {
    if (confirm(`¿Quitar ${exercise?.name ?? 'este ejercicio'} del entreno?`)) {
      await removeExerciseFromSession(sessionId, exerciseId)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center gap-3">
        {exercise && <ExerciseThumb exercise={exercise} size={44} />}
        <div className="min-w-0 flex-1">
          <Link to={`/entreno/ejercicios/${encodeURIComponent(exerciseId)}`} className="block truncate font-semibold">
            {exercise?.name ?? exerciseId}
          </Link>
          <p className="truncate text-xs text-muted">
            {last?.length ? `Última vez: ${summarizeSets(last)}` : 'Primera vez con este ejercicio'}
          </p>
        </div>
        <button onClick={onRemove} className="min-h-11 px-2 text-muted" aria-label="Quitar ejercicio">
          ✕
        </button>
      </div>

      <div className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 px-1 pb-1 text-xs text-muted">
        <span>#</span>
        <span>kg</span>
        <span>reps</span>
        <span />
      </div>
      <div className="flex flex-col gap-1.5">
        {sets.map((s, i) => (
          <SetRow key={s.id} set={s} index={i + 1} onDone={onSetDone} />
        ))}
      </div>
      <button onClick={() => addSet(sessionId, exerciseId)} className="mt-2 min-h-11 w-full rounded-xl text-sm font-semibold text-accent active:bg-surface-2">
        + Serie
      </button>
    </section>
  )
}

function parseNum(s: string): number | null {
  const n = Number(s.replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null
}

function SetRow({ set, index, onDone }: { set: SetLog; index: number; onDone: () => void }) {
  // Estado local para no pelear con lo que se escribe ("77," mientras tecleas).
  const [kg, setKg] = useState(set.weightKg ? String(set.weightKg) : '')
  const [reps, setReps] = useState(String(set.reps))

  const save = (patch: Partial<SetLog>) => db.sets.update(set.id, patch)

  const toggle = async () => {
    const w = parseNum(kg) ?? 0
    const r = parseNum(reps) ?? 0
    const done = !set.done
    await save({ done, weightKg: w, reps: Math.round(r) })
    if (done) onDone()
  }

  const onDelete = async () => {
    if (!set.done && confirm(`¿Borrar la serie ${index}?`)) await db.sets.delete(set.id)
  }

  const input = 'min-h-11 w-full rounded-lg border bg-surface-2 text-center text-lg font-semibold tabular-nums focus:border-accent focus:outline-none'

  return (
    <div className={`grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-xl px-1 ${set.done ? 'bg-accent/10' : ''}`}>
      <button onClick={onDelete} className="min-h-11 text-sm font-semibold text-muted">
        {index}
      </button>
      <input
        inputMode="decimal"
        value={kg}
        placeholder="0"
        onChange={(e) => {
          setKg(e.target.value)
          const n = parseNum(e.target.value)
          if (n != null) void save({ weightKg: n })
        }}
        onFocus={(e) => e.target.select()}
        className={`${input} ${set.done ? 'border-transparent' : 'border-line'}`}
      />
      <input
        inputMode="numeric"
        value={reps}
        onChange={(e) => {
          setReps(e.target.value)
          const n = parseNum(e.target.value)
          if (n != null) void save({ reps: Math.round(n) })
        }}
        onFocus={(e) => e.target.select()}
        className={`${input} ${set.done ? 'border-transparent' : 'border-line'}`}
      />
      <button
        onClick={toggle}
        aria-label={set.done ? 'Desmarcar serie' : 'Marcar serie hecha'}
        className={`min-h-11 rounded-lg text-xl font-bold ${set.done ? 'bg-accent text-accent-ink' : 'border border-line bg-surface-2 text-muted'}`}
      >
        ✓
      </button>
    </div>
  )
}
