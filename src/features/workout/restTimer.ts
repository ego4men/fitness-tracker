import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Basado en marcas de tiempo (no en un contador): sigue siendo correcto si
// iOS suspende la app o la pantalla se bloquea durante el descanso.

interface RestTimerState {
  endsAt: number | null
  duration: number
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
}

export const useRestTimer = create<RestTimerState>()(
  persist(
    (set, get) => ({
      endsAt: null,
      duration: 0,
      start: (seconds) => {
        unlockAudio()
        set({ endsAt: Date.now() + seconds * 1000, duration: seconds })
      },
      add: (seconds) => {
        const { endsAt, duration } = get()
        if (endsAt) set({ endsAt: Math.max(Date.now(), endsAt + seconds * 1000), duration: Math.max(1, duration + seconds) })
      },
      stop: () => set({ endsAt: null }),
    }),
    { name: 'rest-timer' },
  ),
)

// iOS solo permite sonido si el AudioContext se creó en un gesto del usuario.
let audio: AudioContext | null = null
function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

export function beep() {
  if (!audio) return
  const t = audio.currentTime
  for (const [offset, freq] of [
    [0, 880],
    [0.18, 880],
    [0.36, 1320],
  ] as const) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t + offset)
    gain.gain.exponentialRampToValueAtTime(0.3, t + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.15)
    osc.connect(gain).connect(audio.destination)
    osc.start(t + offset)
    osc.stop(t + offset + 0.16)
  }
  navigator.vibrate?.(200)
}
