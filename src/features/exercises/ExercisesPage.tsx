import { useNavigate } from 'react-router-dom'
import { BackLink, Page } from '../../components/ui'
import { ExerciseBrowser } from './ExerciseBrowser'

export function ExercisesPage() {
  const navigate = useNavigate()
  return (
    <Page title="Ejercicios" back={<BackLink to="/entreno" label="Entreno" />}>
      <ExerciseBrowser onSelect={(e) => navigate(`/entreno/ejercicios/${encodeURIComponent(e.id)}`)} />
    </Page>
  )
}
