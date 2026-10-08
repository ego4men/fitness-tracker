import { Card, ComingSoon, Page } from '../../components/ui'

export function ProgressPage() {
  return (
    <Page title="Progreso" subtitle="Fase 3">
      <Card title="Próximamente">
        <ComingSoon
          items={['Récords personales y 1RM estimado', 'Gráficas por ejercicio', 'Peso corporal y medidas', 'Fotos de progreso', 'Rachas']}
        />
      </Card>
    </Page>
  )
}
