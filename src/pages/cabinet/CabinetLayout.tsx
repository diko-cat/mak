import type { PropsWithChildren, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import type { AppointmentStatus } from '../../types'
import { statusLabel } from './format'
import './cabinet.css'

export interface CabinetTab {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface CabinetLayoutProps extends PropsWithChildren {
  eyebrow: string
  title: string
  subtitle?: ReactNode
  tabs: CabinetTab[]
}

export function CabinetLayout({ eyebrow, title, subtitle, tabs, children }: CabinetLayoutProps) {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice

  return (
    <main className="cabinet">
      <div className="container">
        {notice && <div className="notice-bar notice-bar--inline" role="status">{notice}</div>}
        <header className="cabinet-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {subtitle && <p className="cabinet-head__subtitle">{subtitle}</p>}
          </div>
        </header>
        <nav className="cabinet-tabs" aria-label="Разделы кабинета">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `cabinet-tab ${isActive ? 'cabinet-tab--active' : ''}`}>
              <Icon size={16} aria-hidden="true" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="cabinet-body">{children}</div>
      </div>
    </main>
  )
}

export function Panel({ title, action, children, className = '' }: PropsWithChildren<{ title?: ReactNode; action?: ReactNode; className?: string }>) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || action) && <div className="panel__head">{title && <h2>{title}</h2>}{action}</div>}
      {children}
    </section>
  )
}

export function EmptyState({ children }: PropsWithChildren) {
  return <p className="empty-state">{children}</p>
}

export function LoadingNote({ children = 'Загружаем данные…' }: PropsWithChildren) {
  return <p className="empty-state" aria-live="polite">{children}</p>
}

export function StatusPill({ status }: { status: AppointmentStatus }) {
  return <span className={`status-pill status-pill--${status}`}>{statusLabel[status]}</span>
}
