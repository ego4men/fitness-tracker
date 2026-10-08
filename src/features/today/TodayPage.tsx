import { useNavigate } from 'react-router-dom'
import { Button, Card, ComingSoon, Page } from '../../components/ui'
import { formatLongDate } from '../../lib/date'
import { formatDuration } from '../workout/stats'
import { useStartRoutine, useWorkoutOverview } from '../workout/WorkoutPage'
import { InstallHint } from './InstallHint'
import { WaterCard } from './WaterCard'

export function TodayPage() {
  return (
    <Page title="Hoy" subtitle={formatLongDate()}>
      <InstallHint />
      <TodayWorkoutCard />
      <Card title="Calorías y macros">
        <ComingSoon items={['Calorías restantes del día', 'Proteína · Carbohidratos · Grasa']} />
      </Card>
      <WaterCard />
    </Page>
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
