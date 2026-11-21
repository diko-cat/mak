import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, HeartPulse, LogOut, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { Role } from '../../types'

const roles: { role: Role; title: string; short?: string; detail: string; icon: typeof UserRound }[] = [
  { role: 'patient', title: 'Пациент', detail: 'Запись и история здоровья', icon: HeartPulse },
  { role: 'doctor', title: 'Врач', detail: 'Расписание и пациенты', icon: Stethoscope },
  { role: 'admin', title: 'Администратор', short: 'Админ', detail: 'Управление клиникой', icon: ShieldCheck },
]

interface RoleMenuProps {
  currentRole?: Role
  onSelect: (role: Role) => void
  onSignOut: () => void
}

/**
 * «Войти как…» — своё меню вместо системного <select>: список системы
 * в тёмном режиме браузера рисовался тёмным текстом на чёрном фоне.
 * Выбор роли сразу входит в демо-аккаунт; после входа на кнопке видна текущая роль.
 */
export function RoleMenu({ currentRole, onSelect, onSignOut }: RoleMenuProps) {
  const current = roles.find(({ role }) => role === currentRole)
  const currentTitle = current?.title
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
      <button ref={buttonRef} type="button" className="demo-role-switcher" aria-haspopup="menu" aria-expanded={open} aria-label={currentTitle ? `Вы вошли как «${currentTitle}». Сменить роль` : 'Войти как…'} onClick={() => setOpen((value) => !value)}>
        <UserRound size={15} aria-hidden="true" />
        <span className="role-menu__label">{currentTitle ?? 'Войти как…'}</span>
        {current?.short && <span className="role-menu__label role-menu__label--short">{current.short}</span>}
        <ChevronDown className="role-menu__chevron" size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="role-menu__list" role="menu" aria-label="Войти как">
          <p className="role-menu__hint">{currentRole ? 'Сменить роль — вход произойдёт сразу.' : 'Войти как… — вход произойдёт сразу, без пароля.'}</p>
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
          {currentRole && (
            <button type="button" role="menuitem" className="role-menu__item role-menu__item--logout" onClick={() => { setOpen(false); onSignOut() }}>
              <span className="role-menu__icon"><LogOut size={17} /></span>
              <span className="role-menu__copy"><strong>Выйти</strong><small>Завершить демо-вход</small></span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
