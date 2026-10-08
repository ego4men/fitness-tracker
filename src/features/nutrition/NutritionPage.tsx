import { Card, ComingSoon, Page } from '../../components/ui'

export function NutritionPage() {
  return (
    <Page title="Comida" subtitle="Fase 2">
      <Card title="Próximamente">
        <ComingSoon
          items={[
            'Diario: desayuno, almuerzo, cena y snacks',
            'Búsqueda en Open Food Facts y USDA',
            'Escáner de código de barras',
            'Quick add de calorías',
            'Recetas propias',
            'Metas de calorías y macros',
          ]}
        />
      </Card>
    </Page>
  )
}
