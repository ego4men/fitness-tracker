import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { confirmDialog } from '../../components/dialog'
import { BackLink, Button, Card, Page, Stepper } from '../../components/ui'
import { db } from '../../db/db'
import type { Exercise, Routine, RoutineExercise } from '../../db/types'
import { ExercisePicker, ExerciseThumb } from '../exercises/ExerciseBrowser'

export function RoutineEditorPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [picking, setPicking] = useState(false)
  const routine = useLiveQuery(() => db.routines.get(id), [id])
  const exercises = useLiveQuery(async () => {
    if (!routine) return new Map<string, Exercise>()
    const list = await db.exercises.bulkGet(routine.exercises.map((e) => e.exerciseId))
    return new Map(list.filter(Boolean).map((e) => [e!.id, e!]))
  }, [routine])

  if (routine === undefined) return null
  if (routine === null) return <Page title="Rutina no encontrada" back={<BackLink to="/entreno" label="Entreno" />}>{null}</Page>

  const save = (patch: Partial<Routine>) => db.routines.update(id, patch)
  const setItems = (items: RoutineExercise[]) => save({ exercises: items })
  const updateItem = (i: number, patch: Partial<RoutineExercise>) =>
    setItems(routine.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const move = (i: number, dir: -1 | 1) => {
    const items = [...routine.exercises]
    const j = i + dir
    if (j < 0 || j >= items.length) return
    ;[items[i], items[j]] = [items[j], items[i]]
    setItems(items)
  }

  const onPick = (e: Exercise) => {
    setPicking(false)
    const compound = e.mechanic === 'compound'
    setItems([...routine.exercises, { exerciseId: e.id, sets: 3, reps: compound ? 8 : 12, restSec: compound ? 120 : 60 }])
  }

  const onDelete = async () => {
    const ok = await confirmDialog({
      title: `Borrar "${routine.name}"`,
      message: 'Tu historial de entrenos no se borra.',
      confirmText: 'Borrar rutina',
      danger: true,
    })
    if (!ok) return
    await db.routines.delete(id)
    navigate('/entreno', { replace: true })
  }

  const field = 'min-h-11 w-full rounded-xl border border-line bg-surface-2 px-4 focus:border-accent focus:outline-none'

  return (
    <Page title="Editar rutina" back={<BackLink to="/entreno" label="Entreno" />}>
      <Card>
        <label className="mb-1 block text-sm text-muted">Nombre</label>
        <input defaultValue={routine.name} onChange={(e) => save({ name: e.target.value || 'Rutina' })} className={`${field} mb-3`} />
        <label className="mb-1 block text-sm text-muted">Notas</label>
        <input defaultValue={routine.notes} onChange={(e) => save({ notes: e.target.value })} placeholder="Ej.: pecho, hombros y tríceps" className={field} />
      </Card>

      {routine.exercises.map((item, i) => {
        const ex = exercises?.get(item.exerciseId)
        return (
          <section key={`${item.exerciseId}-${i}`} className="rounded-2xl border border-line bg-surface p-3">
            <div className="mb-3 flex items-center gap-3">
              {ex && <ExerciseThumb exercise={ex} size={40} />}
              <p className="min-w-0 flex-1 truncate font-semibold">{ex?.name ?? item.exerciseId}</p>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="min-h-11 w-8 text-muted disabled:opacity-30" aria-label="Subir">
                ↑
              </button>
              <button onClick={() => move(i, 1)} disabled={i === routine.exercises.length - 1} className="min-h-11 w-8 text-muted disabled:opacity-30" aria-label="Bajar">
                ↓
              </button>
              <button onClick={() => setItems(routine.exercises.filter((_, j) => j !== i))} className="min-h-11 w-8 text-muted" aria-label="Quitar">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted">
              <div className="flex flex-col items-center gap-1">
                Series
                <Stepper value={item.sets} min={1} onChange={(v) => updateItem(i, { sets: v })} />
              </div>
              <div className="flex flex-col items-center gap-1">
                {item.progression?.type === 'double' ? 'Reps mín.' : 'Reps'}
                <Stepper value={item.reps} min={1} onChange={(v) => updateItem(i, { reps: v })} />
              </div>
              <div className="flex flex-col items-center gap-1">
                Descanso
                <Stepper value={item.restSec} min={15} step={15} suffix="s" onChange={(v) => updateItem(i, { restSec: v })} />
              </div>
            </div>
            <ProgressionEditor item={item} onChange={(patch) => updateItem(i, patch)} />
          </section>
        )
      })}

      <Button variant="primary" onClick={() => setPicking(true)}>
        + Añadir ejercicio
      </Button>
      {routine.exercises.some((e) => !e.progression) && (
        <Button
          onClick={() =>
            setItems(
              routine.exercises.map((e) =>
                e.progression ? e : { ...e, progression: { type: 'double', repMax: e.reps + 4, incrementKg: defaultIncrement(exercises?.get(e.exerciseId)) } },
              ),
            )
          }
        >
          Activar doble progresión en todos
        </Button>
      )}
      <Button onClick={() => save({ archived: !routine.archived })}>
        {routine.archived ? 'Volver a la rotación' : 'Archivar (sacar de la rotación)'}
      </Button>
      <Button variant="danger" onClick={onDelete}>
        Borrar rutina
      </Button>

      {picking && <ExercisePicker onSelect={onPick} onClose={() => setPicking(false)} />}
    </Page>
  )
}

/** Barra: +2.5 kg; resto (mancuernas, poleas, máquinas): +2 kg. */
export function defaultIncrement(ex: Exercise | undefined): number {
  return ex?.equipment === 'barbell' ? 2.5 : 2
}

const INCREMENTS = [1, 1.25, 2, 2.5, 5]

function ProgressionEditor({ item, onChange }: { item: RoutineExercise; onChange: (patch: Partial<RoutineExercise>) => void }) {
  const rule = item.progression
  const [weight, setWeight] = useState(item.state ? String(item.state.weightKg) : '')
  const select = 'min-h-10 rounded-lg border border-line bg-surface-2 px-2 text-sm focus:border-accent focus:outline-none'

  const setType = (type: string) => {
    if (type === 'none') onChange({ progression: undefined, state: undefined })
    else if (type === 'double') onChange({ progression: { type: 'double', repMax: Math.max(item.reps + 4, item.reps + 1), incrementKg: rule?.incrementKg ?? 2.5 } })
    else onChange({ progression: { type: 'linear', incrementKg: rule?.incrementKg ?? 2.5, deloadAfter: 3 } })
  }

  return (
    <div className="mt-3 border-t border-line pt-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted">Progresión</span>
        <select value={rule?.type ?? 'none'} onChange={(e) => setType(e.target.value)} className={select}>
          <option value="none">Manual</option>
          <option value="double">Doble progresión</option>
          <option value="linear">Lineal (tipo 5x5)</option>
        </select>
      </div>
      {rule && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            {rule.type === 'double' && (
              <label className="flex items-center gap-2 text-xs text-muted">
                Reps máx.
                <Stepper value={rule.repMax} min={item.reps + 1} onChange={(v) => onChange({ progression: { ...rule, repMax: v } })} />
              </label>
            )}
            <label className="flex items-center gap-2 text-xs text-muted">
              Subir
              <select
                value={rule.incrementKg}
                onChange={(e) => onChange({ progression: { ...rule, incrementKg: Number(e.target.value) } })}
                className={select}
              >
                {INCREMENTS.map((n) => (
                  <option key={n} value={n}>
                    +{String(n).replace('.', ',')} kg
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-muted">
              Peso actual
              <input
                inputMode="decimal"
                value={weight}
                placeholder="auto"
                onChange={(e) => {
                  setWeight(e.target.value)
                  const n = Number(e.target.value.replace(',', '.'))
                  if (e.target.value.trim() === '') onChange({ state: undefined })
                  else if (Number.isFinite(n) && n >= 0) onChange({ state: { weightKg: n, failures: item.state?.failures ?? 0 } })
                }}
                className="min-h-10 w-20 rounded-lg border border-line bg-surface-2 px-2 text-center tabular-nums focus:border-accent focus:outline-none"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">
            {rule.type === 'double'
              ? `Trabaja entre ${item.reps} y ${rule.repMax} reps. Cuando hagas ${rule.repMax} en todas las series, sube ${String(rule.incrementKg).replace('.', ',')} kg.`
              : `Si completas ${item.sets}×${item.reps}, sube ${String(rule.incrementKg).replace('.', ',')} kg. Tras ${rule.deloadAfter} fallos seguidos, baja al 90 %.`}
            {!item.state && ' "Auto" = toma el peso de tu próximo entreno.'}
          </p>
        </>
      )}
    </div>
  )
}
