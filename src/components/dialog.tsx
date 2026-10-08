import { create } from 'zustand'
import { Button } from './ui'

// Diálogo propio en lugar de window.confirm(): en las apps instaladas en la
// pantalla de inicio de iOS el diálogo nativo puede no mostrarse y devolver
// false, dejando botones que "no hacen nada".

interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface DialogState {
  current: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
}

const useDialog = create<DialogState>(() => ({ current: null }))

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    useDialog.getState().current?.resolve(false)
    useDialog.setState({ current: { ...options, resolve } })
  })
}

export function DialogHost() {
  const current = useDialog((s) => s.current)
  if (!current) return null

  const close = (ok: boolean) => {
    useDialog.setState({ current: null })
    current.resolve(ok)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={() => close(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="pb-safe w-full max-w-sm rounded-3xl border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title" className="text-lg font-bold">
          {current.title}
        </h2>
        {current.message && <p className="mt-2 text-sm text-text/80">{current.message}</p>}
        <div className="mt-5 flex flex-col gap-2">
          <Button variant={current.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
            {current.confirmText ?? 'Aceptar'}
          </Button>
          <Button onClick={() => close(false)}>{current.cancelText ?? 'Cancelar'}</Button>
        </div>
      </div>
    </div>
  )
}
