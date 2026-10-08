import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { ensureCatalog } from './features/exercises/catalog'
import { ExerciseDetailPage } from './features/exercises/ExerciseDetailPage'
import { ExercisesPage } from './features/exercises/ExercisesPage'
import { NutritionPage } from './features/nutrition/NutritionPage'
import { ProgressPage } from './features/progress/ProgressPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { TodayPage } from './features/today/TodayPage'
import { ActiveSessionPage } from './features/workout/ActiveSessionPage'
import { ensureDefaultRoutines } from './features/workout/defaultRoutines'
import { HistoryPage } from './features/workout/HistoryPage'
import { RestTimerBar } from './features/workout/RestTimerBar'
import { RoutineEditorPage } from './features/workout/RoutineEditorPage'
import { SessionDetailPage } from './features/workout/SessionDetailPage'
import { WorkoutPage } from './features/workout/WorkoutPage'

export function App() {
  useEffect(() => {
    ensureCatalog().catch((e) => console.error('Catálogo:', e))
    ensureDefaultRoutines().catch((e) => console.error('Rutinas:', e))
  }, [])

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/entreno" element={<WorkoutPage />} />
          <Route path="/entreno/sesion" element={<ActiveSessionPage />} />
          <Route path="/entreno/rutina/:id" element={<RoutineEditorPage />} />
          <Route path="/entreno/ejercicios" element={<ExercisesPage />} />
          <Route path="/entreno/ejercicios/:id" element={<ExerciseDetailPage />} />
          <Route path="/entreno/historial" element={<HistoryPage />} />
          <Route path="/entreno/historial/:id" element={<SessionDetailPage />} />
          <Route path="/nutricion" element={<NutritionPage />} />
          <Route path="/progreso" element={<ProgressPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <UpdatePrompt />
      <RestTimerBar />
      <TabBar />
    </div>
  )
}
