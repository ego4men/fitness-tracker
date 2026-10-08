import type { ReactNode } from 'react'

/** Hoja inferior modal (estilo iOS). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pb-safe max-h-[90%] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface px-4 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="min-h-11 shrink-0 px-2 text-accent">
            Cerrar
          </button>
        </div>
        <div className="flex flex-col gap-3 pb-4">{children}</div>
      </div>
    </div>
  )
}
