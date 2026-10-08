import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackLink, Card, Page } from '../../components/ui'
import { db } from '../../db/db'
import { estimate1RM, formatKg, summarizeSets } from '../workout/stats'
import { exerciseImageUrl } from './catalog'
import { CATEGORY_LABELS, equipmentLabel, LEVEL_LABELS, muscleLabel } from './labels'

export function ExerciseDetailPage() {
  const { id = '' } = useParams()
  const exercise = useLiveQuery(() => db.exercises.get(id), [id])
  const [frame, setFrame] = useState(0)

  const history = useLiveQuery(async () => {
    const sets = await db.sets
      .where('[exerciseId+createdAt]')
      .between([id, -Infinity], [id, Infinity])
      .filter((s) => s.done)
      .toArray()
    const bySession = new Map<string, typeof sets>()
    for (const s of sets) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s])
    const sessions = await db.sessions.bulkGet([...bySession.keys()])
    return sessions
      .filter((s) => s?.endedAt)
      .map((s) => ({ session: s!, sets: bySession.get(s!.id)!.sort((a, b) => a.order - b.order) }))
      .sort((a, b) => b.session.startedAt - a.session.startedAt)
  }, [id])

  if (exercise === undefined) return null
  if (exercise === null) return <Page title="Ejercicio no encontrado">{null}</Page>

  const allSets = history?.flatMap((h) => h.sets) ?? []
  const best1RM = allSets.reduce((m, s) => Math.max(m, estimate1RM(s.weightKg, s.reps)), 0)
  const maxWeight = allSets.reduce((m, s) => Math.max(m, s.weightKg), 0)

  return (
    <Page title={exercise.name} subtitle={exercise.nameEn} back={<BackLink to={-1} label="Atrás" />}>
      {exercise.images.length > 0 && (
        <button
          onClick={() => setFrame((f) => (f + 1) % exercise.images.length)}
          className="overflow-hidden rounded-2xl bg-white"
          aria-label="Cambiar imagen"
        >
          <img src={exerciseImageUrl(exercise.images[frame])} alt={exercise.name} className="w-full" />
        </button>
      )}

      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">Músculos</dt>
            <dd>{exercise.primaryMuscles.map(muscleLabel).join(', ')}</dd>
          </div>
          {exercise.secondaryMuscles.length > 0 && (
            <div>
              <dt className="text-muted">Secundarios</dt>
              <dd>{exercise.secondaryMuscles.map(muscleLabel).join(', ')}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">Equipo</dt>
            <dd>{equipmentLabel(exercise.equipment)}</dd>
          </div>
          <div>
            <dt className="text-muted">Tipo · Nivel</dt>
            <dd>
              {CATEGORY_LABELS[exercise.category] ?? exercise.category}
              {exercise.level && ` · ${LEVEL_LABELS[exercise.level] ?? exercise.level}`}
            </dd>
          </div>
        </dl>
      </Card>

      {allSets.length > 0 && (
        <Card title="Tus marcas">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Stat label="Peso máximo" value={`${formatKg(maxWeight)} kg`} />
            <Stat label="1RM estimado" value={`${formatKg(Math.round(best1RM * 2) / 2)} kg`} />
          </div>
          <ul className="space-y-2 text-sm">
            {history!.slice(0, 8).map(({ session, sets }) => (
              <li key={session.id} className="flex justify-between gap-3">
                <span className="shrink-0 text-muted">
                  {new Date(session.startedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                </span>
                <span className="text-right tabular-nums">{summarizeSets(sets)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {exercise.instructions.length > 0 && (
        <Card title="Instrucciones (en inglés)">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-text/90">
            {exercise.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Card>
      )}
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
