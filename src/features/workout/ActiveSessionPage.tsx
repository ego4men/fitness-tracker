import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { confirmDialog } from '../../components/dialog'
import { Button, Page } from '../../components/ui'
import { db } from '../../db/db'
import type { Exercise, GymSettings, Routine, RoutineExercise, SetLog } from '../../db/types'
import { useGym } from './gym'
import { platesPerSide, targetLabel } from './progression'
import { ExercisePicker, ExerciseThumb } from '../exercises/ExerciseBrowser'
import { useRestTimer } from './restTimer'
import {
  addExerciseToSession,
  addSet,
  addWarmups,
  discardSession,
  finishSession,
  getActiveSessionId,
  groupByExercise,
  lastPerformance,
  removeExerciseFromSession,
  switchSession,
} from './session'
import { formatDuration, formatKg, summarizeSets } from './stats'

const DEFAULT_REST = 90

export function ActiveSessionPage() {
  const navigate = useNavigate()
  const [picking, setPicking] = useState(false)
  const [switching, setSwitching] = useState(false)
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
    const ok = await confirmDialog(
      doneCount
        ? {
            title: 'Terminar entreno',
            message: pending ? `${pending} serie(s) sin marcar no se guardarán.` : 'Se guardará en tu historial.',
            confirmText: 'Terminar y guardar',
          }
        : {
            title: 'Terminar entreno',
            message: 'No marcaste ninguna serie, así que el entreno se descartará.',
            confirmText: 'Descartar',
            danger: true,
          },
    )
    if (!ok) return
    useRestTimer.getState().stop()
    const result = await finishSession(session.id)
    navigate(result === 'saved' ? `/entreno/historial/${session.id}` : '/entreno', { replace: true })
  }

  const onDiscard = async () => {
    const ok = await confirmDialog({
      title: 'Descartar entreno',
      message: 'Se borrará todo lo registrado en este entreno.',
      confirmText: 'Descartar',
      danger: true,
    })
    if (!ok) return
    useRestTimer.getState().stop()
    await discardSession(session.id)
    navigate('/entreno', { replace: true })
  }

  const onSwitch = async (target: Routine | null) => {
    setSwitching(false)
    if (doneCount) {
      const ok = await confirmDialog({
        title: `Cambiar a ${target?.name ?? 'entreno libre'}`,
        message: `Ya marcaste ${doneCount} serie(s) en ${session.name}; se descartarán.`,
        confirmText: 'Cambiar',
        danger: true,
      })
      if (!ok) return
    }
    useRestTimer.getState().stop()
    await switchSession(session.id, target)
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
            routineItem={routine?.exercises.find((e) => e.exerciseId === g.exerciseId)}
            onSetDone={() => startRest(restFor(g.exerciseId))}
          />
        )
      })}

      <Button onClick={() => setPicking(true)}>+ Añadir ejercicio</Button>
      <Button onClick={() => setSwitching(true)}>Cambiar de rutina</Button>
      <Button variant="danger" onClick={onDiscard}>
        Descartar entreno
      </Button>

      {picking && <ExercisePicker onSelect={onPick} onClose={() => setPicking(false)} />}
      {switching && (
        <RoutineSwitcher currentId={session.routineId} onSelect={onSwitch} onClose={() => setSwitching(false)} />
      )}
    </Page>
  )
}

function ExerciseBlock({
  sessionId,
  exercise,
  exerciseId,
  sets,
  routineItem,
  onSetDone,
}: {
  sessionId: string
  exercise: Exercise | undefined
  exerciseId: string
  sets: SetLog[]
  routineItem?: RoutineExercise
  onSetDone: () => void
}) {
  const last = useLiveQuery(() => lastPerformance(exerciseId, sessionId), [exerciseId, sessionId])
  const gym = useGym()
  const barbell = exercise?.equipment === 'barbell'
  const target = routineItem ? targetLabel(routineItem) : null
  const canWarmUp = !sets.some((s) => s.warmup) && !sets.some((s) => s.done) && sets.some((s) => s.weightKg > 0)
  let workIndex = 0

  const onRemove = async () => {
    const ok = await confirmDialog({
      title: 'Quitar ejercicio',
      message: `${exercise?.name ?? 'Este ejercicio'} y sus series se quitarán del entreno.`,
      confirmText: 'Quitar',
      danger: true,
    })
    if (ok) await removeExerciseFromSession(sessionId, exerciseId)
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
          {target && <p className="truncate text-xs font-semibold text-accent">{target}</p>}
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
        {sets.map((s) => (
          <SetRow
            key={s.id}
            set={s}
            label={s.warmup ? 'C' : String(++workIndex)}
            plates={barbell ? gym : null}
            onDone={s.warmup ? undefined : onSetDone}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {canWarmUp && (
          <button
            onClick={() => addWarmups(sessionId, exerciseId, gym.barKg, barbell)}
            className="min-h-11 flex-1 rounded-xl text-sm font-semibold text-muted active:bg-surface-2"
          >
            + Calentamiento
          </button>
        )}
        <button onClick={() => addSet(sessionId, exerciseId)} className="min-h-11 flex-1 rounded-xl text-sm font-semibold text-accent active:bg-surface-2">
          + Serie
        </button>
      </div>
    </section>
  )
}

function parseNum(s: string): number | null {
  const n = Number(s.replace(',', '.'))
  return s.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null
}

function SetRow({
  set,
  label,
  plates,
  onDone,
}: {
  set: SetLog
  label: string
  plates: GymSettings | null
  onDone?: () => void
}) {
  // Estado local para no pelear con lo que se escribe ("77," mientras tecleas).
  const [kg, setKg] = useState(set.weightKg ? String(set.weightKg) : '')
  const [reps, setReps] = useState(String(set.reps))

  const save = (patch: Partial<SetLog>) => db.sets.update(set.id, patch)

  const toggle = async () => {
    const w = parseNum(kg) ?? 0
    const r = parseNum(reps) ?? 0
    const done = !set.done
    await save({ done, weightKg: w, reps: Math.round(r) })
    if (done) onDone?.()
  }

  const onDelete = async () => {
    if (set.done) return
    const ok = await confirmDialog({
      title: set.warmup ? 'Borrar serie de calentamiento' : `Borrar la serie ${label}`,
      confirmText: 'Borrar',
      danger: true,
    })
    if (ok) await db.sets.delete(set.id)
  }

  const input = 'min-h-11 w-full rounded-lg border bg-surface-2 text-center text-lg font-semibold tabular-nums focus:border-accent focus:outline-none'
  const weight = parseNum(kg) ?? 0
  const perSide = plates && !set.done && weight > plates.barKg ? platesPerSide(weight, plates.barKg, plates.plates) : null

  return (
    <div>
    <div className={`grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-xl px-1 ${set.done ? 'bg-accent/10' : ''} ${set.warmup ? 'opacity-75' : ''}`}>
      <button onClick={onDelete} className={`min-h-11 text-sm font-semibold ${set.warmup ? 'text-accent/70' : 'text-muted'}`} aria-label={set.warmup ? 'Calentamiento' : `Serie ${label}`}>
        {label}
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
    {perSide && (
      <p className="pl-10 text-[11px] text-muted tabular-nums">
        Por lado: {perSide.plates.length ? perSide.plates.map(formatKg).join(' + ') : 'solo la barra'}
        {perSide.remainder > 0.01 && ` (faltan ${formatKg(perSide.remainder)} kg)`}
      </p>
    )}
    </div>
  )
}

function RoutineSwitcher({
  currentId,
  onSelect,
  onClose,
}: {
  currentId: string | null
  onSelect: (r: Routine | null) => void
  onClose: () => void
}) {
  const routines = useLiveQuery(async () => (await db.routines.toArray()).sort((a, b) => a.order - b.order), [])
  const option = 'min-h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-left font-semibold active:bg-surface disabled:opacity-40'
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="pb-safe w-full max-w-sm rounded-3xl border border-line bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-bold">Cambiar a…</h2>
        <div className="flex flex-col gap-2">
          {routines?.map((r) => (
            <button key={r.id} disabled={r.id === currentId || !r.exercises.length} onClick={() => onSelect(r)} className={option}>
              {r.name} {r.id === currentId && <span className="text-sm font-normal text-muted">(actual)</span>}
            </button>
          ))}
          <button onClick={() => onSelect(null)} className={option}>
            Entreno libre
          </button>
          <Button onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}
