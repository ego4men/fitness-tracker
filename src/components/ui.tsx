import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="pt-safe mx-auto max-w-lg px-4 pb-6">
      <header className="mb-4 pt-2">
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
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
