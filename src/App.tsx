import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DialogHost } from './components/dialog'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { ensureCatalog } from './features/exercises/catalog'
import { ExerciseDetailPage } from './features/exercises/ExerciseDetailPage'
import { ExercisesPage } from './features/exercises/ExercisesPage'
import { AddFoodPage } from './features/nutrition/AddFoodPage'
import { FoodEditorPage } from './features/nutrition/FoodEditorPage'
import { MyFoodsPage } from './features/nutrition/MyFoodsPage'
import { NutritionPage } from './features/nutrition/NutritionPage'
import { ProfilePage } from './features/nutrition/ProfilePage'
import { RecipeEditorPage } from './features/nutrition/RecipeEditorPage'
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
          <Route path="/nutricion/perfil" element={<ProfilePage />} />
          <Route path="/nutricion/agregar/:meal" element={<AddFoodPage />} />
          <Route path="/nutricion/mis-alimentos" element={<MyFoodsPage />} />
          <Route path="/nutricion/alimento/:id" element={<FoodEditorPage />} />
          <Route path="/nutricion/receta/:id" element={<RecipeEditorPage />} />
          <Route path="/progreso" element={<ProgressPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <DialogHost />
      <UpdatePrompt />
      <RestTimerBar />
      <TabBar />
    </div>
  )
}
