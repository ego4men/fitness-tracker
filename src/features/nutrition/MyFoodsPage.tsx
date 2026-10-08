import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { BackLink, Button, Page } from '../../components/ui'
import { db } from '../../db/db'
import { FoodRow } from './FoodSearch'

export function MyFoodsPage() {
  const navigate = useNavigate()
  const foods = useLiveQuery(
    async () =>
      (await db.foods.where('source').anyOf('custom', 'recipe').toArray()).sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [],
  )
  const recipes = foods?.filter((f) => f.source === 'recipe') ?? []
  const custom = foods?.filter((f) => f.source === 'custom') ?? []

  return (
    <Page title="Mis alimentos" back={<BackLink to="/nutricion" label="Comida" />}>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => navigate('/nutricion/alimento/nuevo')}>+ Alimento</Button>
        <Button onClick={() => navigate('/nutricion/receta/nueva')}>+ Receta</Button>
      </div>
      {(
        [
          ['Recetas', recipes, 'receta'],
          ['Alimentos propios', custom, 'alimento'],
        ] as const
      ).map(([title, list, route]) => (
        <section key={title}>
          <h2 className="mb-2 mt-2 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
          {list.length === 0 ? (
            <p className="text-sm text-muted">Todavía no tienes.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {list.map((f) => (
                <li key={f.id}>
                  <FoodRow food={f} onClick={() => navigate(`/nutricion/${route}/${f.id}`)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </Page>
  )
}
