import { Navigate, Route, Routes } from 'react-router-dom'
import { TabBar } from './components/TabBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { TodayPage } from './features/today/TodayPage'
import { WorkoutPage } from './features/workout/WorkoutPage'
import { NutritionPage } from './features/nutrition/NutritionPage'
import { ProgressPage } from './features/progress/ProgressPage'
import { SettingsPage } from './features/settings/SettingsPage'

export function App() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/entreno" element={<WorkoutPage />} />
          <Route path="/nutricion" element={<NutritionPage />} />
          <Route path="/progreso" element={<ProgressPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <UpdatePrompt />
      <TabBar />
    </div>
  )
}
