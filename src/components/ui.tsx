import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function Page({
  title,
  subtitle,
  back,
  action,
  children,
}: {
  title: string
  subtitle?: string
  back?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="pt-safe mx-auto max-w-lg px-4 pb-6">
      {back && <div className="-ml-2 pt-1">{back}</div>}
      <header className="mb-4 flex items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
        {action}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }

export function Button({ variant = 'secondary', className = '', ...props }: BtnProps) {
  const styles = {
    primary: 'bg-accent text-accent-ink',
    secondary: 'bg-surface-2 text-text border border-line',
    danger: 'bg-danger/15 text-danger border border-danger/30',
  }[variant]
  return (
    <button
      {...props}
      className={`min-h-11 rounded-xl px-4 font-semibold transition active:scale-[0.97] disabled:opacity-50 ${styles} ${className}`}
    />
  )
}

export function BackLink({ to, label }: { to: string | -1; label: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => (to === -1 ? navigate(-1) : navigate(to))}
      className="flex min-h-11 items-center gap-1 px-2 text-accent"
    >
      <span aria-hidden>‹</span> {label}
    </button>
  )
}

/** Número con botones − / + (objetivos táctiles grandes, sin teclado). */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  suffix?: string
}) {
  return (
    <div className="flex items-center rounded-xl border border-line bg-surface-2">
      <button onClick={() => onChange(Math.max(min, value - step))} className="min-h-10 w-10 text-lg text-muted">
        −
      </button>
      <span className="min-w-12 text-center font-semibold tabular-nums">
        {value}
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </span>
      <button onClick={() => onChange(value + step)} className="min-h-10 w-10 text-lg text-muted">
        +
      </button>
    </div>
  )
}

export function ComingSoon({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm text-muted">
      {items.map((i) => (
        <li key={i} className="flex gap-2">
          <span className="text-accent">○</span>
          {i}
        </li>
      ))}
    </ul>
  )
}
