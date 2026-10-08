import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { BackLink, Page } from '../../components/ui'
import { db } from '../../db/db'
import { formatDuration, formatKg, volume } from './stats'

export function HistoryPage() {
  const sessions = useLiveQuery(async () => {
    const list = (await db.sessions.orderBy('startedAt').reverse().toArray()).filter((s) => s.endedAt)
    return Promise.all(
      list.map(async (s) => {
        const sets = await db.sets.where('sessionId').equals(s.id).toArray()
        return { session: s, sets: sets.length, volume: volume(sets), exercises: new Set(sets.map((x) => x.exerciseId)).size }
      }),
    )
  }, [])

  return (
    <Page title="Historial" back={<BackLink to="/entreno" label="Entreno" />}>
      {sessions?.length === 0 && <p className="py-8 text-center text-sm text-muted">Aún no has terminado ningún entreno.</p>}
      <ul className="flex flex-col gap-2">
        {sessions?.map(({ session, sets, volume, exercises }) => (
          <li key={session.id}>
            <Link to={`/entreno/historial/${session.id}`} className="block rounded-2xl border border-line bg-surface p-4 active:bg-surface-2">
              <div className="flex items-baseline justify-between">
                <p className="text-lg font-semibold">{session.name}</p>
                <p className="text-sm text-muted">
                  {new Date(session.startedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <p className="text-sm text-muted">
                {formatDuration(session.endedAt! - session.startedAt)} · {exercises} ejercicios · {sets} series · {formatKg(Math.round(volume))} kg
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  )
}
