import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Page } from '../../components/ui'
import { db } from '../../db/db'
import { formatLongDate, toISODate } from '../../lib/date'
import { getGoals, mealForHour, totals } from '../nutrition/foods'
import { MacroSummary } from '../nutrition/MacroSummary'
import { formatDuration } from '../workout/stats'
import { useStartRoutine, useWorkoutOverview } from '../workout/WorkoutPage'
import { InstallHint } from './InstallHint'
import { WaterCard } from './WaterCard'

export function TodayPage() {
  return (
    <Page title="Hoy" subtitle={formatLongDate()}>
      <InstallHint />
      <TodayWorkoutCard />
      <TodayNutritionCard />
      <WaterCard />
    </Page>
  )
}

function TodayNutritionCard() {
  const navigate = useNavigate()
  const data = useLiveQuery(async () => ({
    goals: await getGoals(),
    entries: await db.diary.where('date').equals(toISODate()).toArray(),
  }), [])
  if (!data) return null

  if (!data.goals) {
    return (
      <Card title="Calorías y macros">
        <p className="mb-3 text-sm text-muted">Configura tus datos para calcular tus metas diarias.</p>
        <Button variant="primary" className="w-full" onClick={() => navigate('/nutricion/perfil')}>
          Configurar
        </Button>
      </Card>
    )
  }

  return (
    <Card
      title="Calorías y macros"
      action={
        <button onClick={() => navigate(`/nutricion/agregar/${mealForHour()}`)} className="min-h-11 px-2 text-sm font-semibold text-accent">
          + Comida
        </button>
      }
    >
      <button onClick={() => navigate('/nutricion')} className="block w-full text-left">
        <MacroSummary consumed={totals(data.entries)} goals={data.goals} />
      </button>
    </Card>
  )
}

function TodayWorkoutCard() {
  const data = useWorkoutOverview()
  const start = useStartRoutine()
  const navigate = useNavigate()
  if (!data) return null
  const { active, next } = data

  return (
    <Card title="Entreno de hoy">
      {active ? (
        <>
          <p className="mb-3 text-lg font-semibold">
            {active.name} en curso <span className="text-sm font-normal text-muted">· {formatDuration(Date.now() - active.startedAt)}</span>
          </p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/entreno/sesion')}>
            Continuar
          </Button>
        </>
      ) : next ? (
        <>
          <p className="text-2xl font-bold">{next.name}</p>
          {next.notes && <p className="mb-3 text-sm text-muted">{next.notes}</p>}
          <Button variant="primary" className="w-full" onClick={() => start(next)}>
            Empezar {next.name}
          </Button>
        </>
      ) : (
        <Button className="w-full" onClick={() => navigate('/entreno')}>
          Crear una rutina
        </Button>
      )}
    </Card>
  )
}
