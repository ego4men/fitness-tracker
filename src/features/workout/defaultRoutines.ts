import { db, newId } from '../../db/db'
import type { Routine, RoutineExercise } from '../../db/types'

const ex = (exerciseId: string, sets: number, reps: number, restSec: number): RoutineExercise => ({
  exerciseId,
  sets,
  reps,
  restSec,
})

/** Plantilla Push/Pull/Legs clásica. El usuario puede editarla libremente. */
export const PPL_TEMPLATE: Pick<Routine, 'name' | 'notes' | 'exercises'>[] = [
  {
    name: 'Push',
    notes: 'Pecho, hombros y tríceps',
    exercises: [
      ex('Barbell_Bench_Press_-_Medium_Grip', 4, 8, 150),
      ex('Incline_Dumbbell_Press', 3, 10, 120),
      ex('Dumbbell_Shoulder_Press', 3, 10, 120),
      ex('Side_Lateral_Raise', 3, 15, 60),
      ex('Triceps_Pushdown', 3, 12, 60),
      ex('Cable_Rope_Overhead_Triceps_Extension', 3, 12, 60),
    ],
  },
  {
    name: 'Pull',
    notes: 'Espalda, deltoides posterior y bíceps',
    exercises: [
      ex('Pullups', 4, 8, 150),
      ex('Bent_Over_Barbell_Row', 4, 8, 120),
      ex('Seated_Cable_Rows', 3, 12, 90),
      ex('Face_Pull', 3, 15, 60),
      ex('Barbell_Curl', 3, 10, 60),
      ex('Hammer_Curls', 3, 12, 60),
    ],
  },
  {
    name: 'Legs',
    notes: 'Cuádriceps, isquios, glúteos y gemelos',
    exercises: [
      ex('Barbell_Squat', 4, 6, 180),
      ex('Romanian_Deadlift', 3, 8, 150),
      ex('Leg_Press', 3, 12, 120),
      ex('Lying_Leg_Curls', 3, 12, 60),
      ex('Leg_Extensions', 3, 15, 60),
      ex('Standing_Calf_Raises', 4, 15, 60),
    ],
  },
]

/** Crea las rutinas PPL una sola vez (si el usuario las borra, no reaparecen). */
export async function ensureDefaultRoutines(): Promise<void> {
  await db.transaction('rw', db.routines, db.settings, async () => {
    if ((await db.settings.get('defaultRoutinesSeeded'))?.value) return
    const now = Date.now()
    await db.routines.bulkAdd(PPL_TEMPLATE.map((r, i) => ({ ...r, id: newId(), order: i, createdAt: now + i })))
    await db.settings.put({ key: 'defaultRoutinesSeeded', value: true })
  })
}
