import { useState } from 'react'

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/** En Safari (no instalada) explica cómo agregar la app a la pantalla de inicio. */
export function InstallHint() {
  const [hidden, setHidden] = useState(false)
  if (!isIOS || isStandalone || hidden) return null
  return (
    <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm">
      <p className="mb-1 font-semibold text-accent">Instala la app en tu iPhone</p>
      <p className="text-text/90">
        Toca <b>Compartir</b> (el cuadro con flecha ↑) y luego <b>Agregar a pantalla de inicio</b>. Así funciona sin
        internet y a pantalla completa.
      </p>
      <button onClick={() => setHidden(true)} className="mt-2 text-muted">
        Ocultar
      </button>
    </div>
  )
}
