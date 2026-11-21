import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, HeartPulse, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { Role } from '../../types'

const roles: { role: Role; title: string; detail: string; icon: typeof UserRound }[] = [
  { role: 'patient', title: 'Пациент', detail: 'Запись и история здоровья', icon: HeartPulse },
  { role: 'doctor', title: 'Врач', detail: 'Расписание и пациенты', icon: Stethoscope },
  { role: 'admin', title: 'Администратор', detail: 'Управление клиникой', icon: ShieldCheck },
]

/**
 * «Войти как…» — своё меню вместо системного <select>: список системы
 * в тёмном режиме браузера рисовался тёмным текстом на чёрном фоне.
 */
export function RoleMenu({ currentRole, onSelect }: { currentRole?: Role; onSelect: (role: Role) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() } }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    rootRef.current?.querySelector<HTMLButtonElement>('.role-menu__item:not(:disabled)')?.focus()
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div className="role-menu" ref={rootRef}>
      <button ref={buttonRef} type="button" className="demo-role-switcher" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <UserRound size={15} aria-hidden="true" />
        <span>Войти как…</span>
        <ChevronDown className="role-menu__chevron" size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="role-menu__list" role="menu" aria-label="Войти как">
          <p className="role-menu__hint">{currentRole ? 'Текущий вход завершится, откроется вход выбранной роли.' : 'Демо-вход: данные подставятся сами.'}</p>
          {roles.map(({ role, title, detail, icon: Icon }) => {
            const current = role === currentRole
            return (
              <button key={role} type="button" role="menuitem" className="role-menu__item" disabled={current} onClick={() => { setOpen(false); onSelect(role) }}>
                <span className="role-menu__icon"><Icon size={17} /></span>
                <span className="role-menu__copy"><strong>{title}</strong><small>{current ? 'Вы вошли в этой роли' : detail}</small></span>
                {current && <Check className="role-menu__check" size={16} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
