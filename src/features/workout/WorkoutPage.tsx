import { Card, ComingSoon, Page } from '../../components/ui'

export function WorkoutPage() {
  return (
    <Page title="Entreno" subtitle="Fase 1">
      <Card title="Próximamente">
        <ComingSoon
          items={[
            'Catálogo de +800 ejercicios con imágenes',
            'Rutinas y días de entreno',
            'Sesión en vivo: series, reps, peso y RPE',
            'Temporizador de descanso',
            '"La última vez hiciste…"',
            'Historial de sesiones',
          ]}
        />
      </Card>
    </Page>
  )
}
