import { Link } from 'react-router-dom'
import { Card, ComingSoon, Page } from '../../components/ui'
import { formatLongDate } from '../../lib/date'
import { InstallHint } from './InstallHint'
import { WaterCard } from './WaterCard'

export function TodayPage() {
  return (
    <Page title="Hoy" subtitle={formatLongDate()}>
      <InstallHint />
      <Card title="Entreno de hoy">
        <p className="text-sm text-muted">
          Aquí verás tu rutina del día. <Link to="/entreno" className="text-accent">Entreno</Link> llega en la fase 1.
        </p>
      </Card>
      <Card title="Calorías y macros">
        <ComingSoon items={['Calorías restantes del día', 'Proteína · Carbohidratos · Grasa']} />
      </Card>
      <WaterCard />
    </Page>
  )
}
