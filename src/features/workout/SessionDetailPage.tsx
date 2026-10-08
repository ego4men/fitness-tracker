import { isWorkSet } from './progression'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { confirmDialog } from '../../components/dialog'
import { BackLink, Button, Card, Page } from '../../components/ui'
import { db } from '../../db/db'
import { deleteSession, groupByExercise } from './session'
import { estimate1RM, formatDuration, formatKg, summarizeSets, volume } from './stats'

export function SessionDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = useLiveQuery(async () => {
    const session = await db.sessions.get(id)
    if (!session) return { session: null }
    const sets = await db.sets.where('sessionId').equals(id).toArray()
    const groups = groupByExercise(sets)
    const exercises = await db.exercises.bulkGet(groups.map((g) => g.exerciseId))
    // Récord: 1RM estimado de hoy mayor que el de cualquier entreno anterior.
    const prs = new Set<string>()
    for (const g of groups) {
      const work = g.sets.filter(isWorkSet)
      if (!work.length) continue
      const today = Math.max(...work.map((s) => estimate1RM(s.weightKg, s.reps)))
      const before = await db.sets
        .where('[exerciseId+createdAt]')
        .between([g.exerciseId, -Infinity], [g.exerciseId, session.startedAt], true, false)
        .filter((s) => isWorkSet(s) && s.sessionId !== id)
        .toArray()
      const best = Math.max(0, ...before.map((s) => estimate1RM(s.weightKg, s.reps)))
      if (before.length && today > best) prs.add(g.exerciseId)
    }
    return { session, groups, sets, names: exercises.map((e, i) => e?.name ?? groups[i].exerciseId), prs }
  }, [id])

  if (!data) return null
  if (!data.session) return <Page title="Entreno no encontrado" back={<BackLink to="/entreno/historial" label="Historial" />}>{null}</Page>
  const { session, groups, sets, names, prs } = data

  const onDelete = async () => {
    const ok = await confirmDialog({ title: 'Borrar este entreno', message: 'Se quitará de tu historial.', confirmText: 'Borrar', danger: true })
    if (!ok) return
    await deleteSession(id)
    navigate('/entreno/historial', { replace: true })
  }

  return (
    <Page
      title={session.name}
      subtitle={new Date(session.startedAt).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      back={<BackLink to="/entreno/historial" label="Historial" />}
    >
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Duración" value={session.endedAt ? formatDuration(session.endedAt - session.startedAt) : '—'} />
        <Stat label="Series" value={String(sets.filter(isWorkSet).length)} />
        <Stat label="Volumen" value={`${formatKg(Math.round(volume(sets)))} kg`} />
      </div>
      {prs.size > 0 && (
        <p className="rounded-2xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
          🏆 ¡{prs.size === 1 ? 'Nuevo récord' : `${prs.size} récords nuevos`} de 1RM estimado!
        </p>
      )}
      {session.progression && session.progression.length > 0 && (
        <Card title="Próximo entreno">
          <ul className="space-y-2 text-sm">
            {session.progression.map((p) => {
              const i = groups.findIndex((g) => g.exerciseId === p.exerciseId)
              const icon = p.outcome === 'up' ? '⬆️' : p.outcome === 'deload' ? '⬇️' : '➡️'
              return (
                <li key={p.exerciseId} className="flex gap-2">
                  <span aria-hidden>{icon}</span>
                  <span>
                    <span className="font-semibold">{i >= 0 ? names[i] : p.exerciseId}:</span> {p.message}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
      {groups.map((g, i) => {
        const warm = g.sets.filter((s) => s.warmup).length
        return (
          <Card key={g.exerciseId}>
            <Link to={`/entreno/ejercicios/${encodeURIComponent(g.exerciseId)}`} className="mb-1 block font-semibold">
              {names[i]} {prs.has(g.exerciseId) && '🏆'}
            </Link>
            <p className="text-sm tabular-nums text-text/80">{summarizeSets(g.sets.filter(isWorkSet))}</p>
            {warm > 0 && <p className="text-xs text-muted">+ {warm} de calentamiento</p>}
          </Card>
        )
      })}
      <Button variant="danger" onClick={onDelete}>
        Borrar entreno
      </Button>
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-bold tabular-nums">{value}</p>
    </div>
  )
}
