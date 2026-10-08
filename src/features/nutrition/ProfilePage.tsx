import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackLink, Button, Card, Page } from '../../components/ui'
import type { ActivityLevel, Goal, NutritionGoals, Profile, Sex } from '../../db/types'
import { getGoals, getProfile, latestWeight, saveProfile } from './foods'
import { ACTIVITY, GOALS, recommendedGoals } from './goals'

const field = 'min-h-11 w-full rounded-xl border border-line bg-surface-2 px-4 text-lg tabular-nums focus:border-accent focus:outline-none'

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | null
  options: { id: T; label: string; hint?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`min-h-12 rounded-xl border px-4 py-2 text-left ${value === o.id ? 'border-accent bg-accent/10' : 'border-line bg-surface-2'}`}
        >
          <span className="font-semibold">{o.label}</span>
          {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
        </button>
      ))}
    </div>
  )
}

export function ProfilePage() {
  const navigate = useNavigate()
  const initial = useLiveQuery(async () => ({ profile: await getProfile(), weight: await latestWeight(), goals: await getGoals() }), [])

  const [sex, setSex] = useState<Sex | null>(null)
  const [birthYear, setBirthYear] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activity, setActivity] = useState<ActivityLevel | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [manual, setManual] = useState<NutritionGoals | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!initial || loaded) return
    const p = initial.profile
    if (p) {
      setSex(p.sex)
      setBirthYear(String(p.birthYear))
      setHeight(String(p.heightCm))
      setActivity(p.activity)
      setGoal(p.goal)
    }
    if (initial.weight) setWeight(String(initial.weight))
    if (initial.goals?.custom) setManual(initial.goals)
    setLoaded(true)
  }, [initial, loaded])

  const year = new Date().getFullYear()
  const parsed = {
    birthYear: Number(birthYear),
    heightCm: Number(height.replace(',', '.')),
    weightKg: Number(weight.replace(',', '.')),
  }
  const valid =
    sex && activity && goal &&
    parsed.birthYear >= year - 100 && parsed.birthYear <= year - 13 &&
    parsed.heightCm >= 120 && parsed.heightCm <= 230 &&
    parsed.weightKg >= 30 && parsed.weightKg <= 300

  const profile: Profile | null = valid
    ? { sex: sex!, birthYear: parsed.birthYear, heightCm: parsed.heightCm, activity: activity!, goal: goal! }
    : null
  const recommended = useMemo(() => (profile ? recommendedGoals(profile, parsed.weightKg) : null), [JSON.stringify(profile), parsed.weightKg])
  const shown = manual ?? recommended

  const onSave = async () => {
    if (!profile) return
    await saveProfile(profile, parsed.weightKg, manual ?? undefined)
    navigate('/nutricion', { replace: true })
  }

  if (!initial) return null
  const isFirstTime = !initial.profile

  return (
    <Page
      title={isFirstTime ? 'Tus datos' : 'Perfil y metas'}
      subtitle={isFirstTime ? 'Para calcular tus calorías y macros' : undefined}
      back={isFirstTime ? undefined : <BackLink to={-1} label="Atrás" />}
    >
      {isFirstTime && (
        <p className="text-sm text-muted">Solo se guardan en tu iPhone. Puedes cambiarlos cuando quieras en Ajustes.</p>
      )}
      <Card title="Sexo">
        <Choice<Sex>
          value={sex}
          onChange={setSex}
          options={[
            { id: 'male', label: 'Hombre' },
            { id: 'female', label: 'Mujer' },
          ]}
        />
      </Card>
      <Card title="Medidas">
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-muted">
            Año de nacimiento
            <input inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1995" className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-muted">
            Estatura (cm)
            <input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className={`${field} mt-1`} />
          </label>
          <label className="text-xs text-muted">
            Peso (kg)
            <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75" className={`${field} mt-1`} />
          </label>
        </div>
      </Card>
      <Card title="Actividad">
        <Choice<ActivityLevel>
          value={activity}
          onChange={setActivity}
          options={(Object.keys(ACTIVITY) as ActivityLevel[]).map((id) => ({ id, label: ACTIVITY[id].label, hint: ACTIVITY[id].hint }))}
        />
      </Card>
      <Card title="Objetivo">
        <Choice<Goal>
          value={goal}
          onChange={(g) => {
            setGoal(g)
            setManual(null)
          }}
          options={(Object.keys(GOALS) as Goal[]).map((id) => ({ id, label: GOALS[id].label, hint: GOALS[id].hint }))}
        />
      </Card>

      {shown && (
        <Card
          title={manual ? 'Tus metas (manuales)' : 'Metas recomendadas'}
          action={
            manual ? (
              <button onClick={() => setManual(null)} className="text-sm text-accent">
                Usar recomendadas
              </button>
            ) : undefined
          }
        >
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['kcal', 'Calorías', 'kcal'],
                ['protein', 'Proteína', 'g'],
                ['carbs', 'Carbohidratos', 'g'],
                ['fat', 'Grasa', 'g'],
                ['waterMl', 'Agua', 'ml'],
              ] as const
            ).map(([key, label, unit]) => (
              <label key={key} className="text-xs text-muted">
                {label} ({unit})
                <input
                  inputMode="numeric"
                  value={shown[key]}
                  onChange={(e) => {
                    const n = Math.max(0, Math.round(Number(e.target.value) || 0))
                    setManual({ ...shown, [key]: n, custom: true })
                  }}
                  className={`${field} mt-1`}
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            Calculado con la ecuación de Mifflin-St Jeor y tu nivel de actividad. Proteína {profile && GOALS[profile.goal].proteinPerKg} g por kg, grasa 25 % y el resto carbohidratos. Es una estimación: ajústala según tu progreso.
          </p>
        </Card>
      )}

      <Button variant="primary" disabled={!valid} onClick={onSave}>
        {isFirstTime ? 'Empezar' : 'Guardar'}
      </Button>
      {!valid && <p className="text-center text-xs text-muted">Completa todos los datos para continuar.</p>}
    </Page>
  )
}
