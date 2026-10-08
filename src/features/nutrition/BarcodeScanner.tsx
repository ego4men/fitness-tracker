import { useEffect, useRef, useState } from 'react'
import { getDetector } from './barcode'

/** Vista de cámara que llama a onDetected con el primer código leído. */
export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')
  const done = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    ;(async () => {
      try {
        const [s, detector] = await Promise.all([
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false }),
          getDetector(),
        ])
        stream = s
        if (cancelled || !video.current) return
        video.current.srcObject = s
        await video.current.play()
        const scan = async () => {
          if (cancelled || done.current) return
          try {
            const v = video.current
            if (v && v.readyState >= 2) {
              const [hit] = await detector.detect(v)
              if (hit?.rawValue && !done.current) {
                done.current = true
                navigator.vibrate?.(80)
                onDetected(hit.rawValue)
                return
              }
            }
          } catch {
            // un fotograma fallido no es grave; se reintenta
          }
          timer = setTimeout(scan, 200)
        }
        void scan()
      } catch (e) {
        const name = e instanceof DOMException ? e.name : ''
        setError(
          name === 'NotAllowedError'
            ? 'Sin permiso para usar la cámara. Actívalo en Ajustes de iOS → Safari → Cámara, o escribe el código abajo.'
            : 'No se pudo abrir la cámara. Escribe el código abajo.',
        )
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetected])

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">{error}</p>
      ) : (
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black">
          <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-xl border-2 border-accent/80" />
          <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white/80">Apunta al código de barras</p>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const code = manual.replace(/\D/g, '')
          if (code.length >= 6) onDetected(code)
        }}
      >
        <input
          inputMode="numeric"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="O escribe el código"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-4 focus:border-accent focus:outline-none"
        />
        <button className="min-h-11 rounded-xl bg-surface-2 px-4 font-semibold">Buscar</button>
      </form>
    </div>
  )
}
