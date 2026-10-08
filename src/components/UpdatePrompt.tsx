import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

/** Avisa cuando hay una versión nueva publicada y la aplica al tocar. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Revisa actualizaciones cada hora mientras la app está abierta.
      if (reg) setInterval(() => reg.update(), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null
  return (
    <div className="mx-auto mb-2 flex w-[calc(100%-2rem)] max-w-lg items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-surface-2 p-3 text-sm">
      <span>Hay una versión nueva disponible.</span>
      <div className="flex gap-2">
        <Button onClick={() => setNeedRefresh(false)}>Luego</Button>
        <Button variant="primary" onClick={() => updateServiceWorker(true)}>
          Actualizar
        </Button>
      </div>
    </div>
  )
}
