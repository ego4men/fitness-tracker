import { useSearchParams } from 'react-router-dom'
import { Page } from '../../components/ui'
import { BodyTab } from './BodyTab'
import { ConsistencyTab } from './ConsistencyTab'
import { NutritionTrendsTab } from './NutritionTrendsTab'
import { StrengthTab } from './StrengthTab'

const TABS = [
  { id: 'cuerpo', label: 'Cuerpo' },
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'comida', label: 'Comida' },
  { id: 'constancia', label: 'Constancia' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ProgressPage() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.id === params.get('vista')) ? params.get('vista') : 'cuerpo') as TabId

  return (
    <Page title="Progreso">
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ vista: t.id }, { replace: true })}
            className={`min-h-10 rounded-lg text-[13px] font-semibold ${tab === t.id ? 'bg-accent text-accent-ink' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'cuerpo' && <BodyTab />}
      {tab === 'fuerza' && <StrengthTab />}
      {tab === 'comida' && <NutritionTrendsTab />}
      {tab === 'constancia' && <ConsistencyTab />}
    </Page>
  )
}
