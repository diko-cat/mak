import { ArrowUpRight, Menu, Moon, Sun, UserRound } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useSession, clearSession } from '../../store/session'
import { toggleTheme, useTheme } from '../../store/theme'
import type { Role } from '../../types'

const roleNames: Record<Role, string> = {
  patient: 'Пациент',
  doctor: 'Врач',
  admin: 'Администратор',
}

export const siteLinks = [
  { to: '/about', label: 'О клинике' },
  { to: '/services', label: 'Услуги' },
  { to: '/doctors', label: 'Врачи' },
  { to: '/contacts', label: 'Контакты' },
]

export function roleHomePath(role: Role): string {
  return `/${role}`
}

export function SiteHeader() {
  const user = useSession()
  const theme = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const menuRef = useRef<HTMLDetailsElement>(null)

  // Мобильное меню закрывается после любого перехода.
  useEffect(() => { menuRef.current?.removeAttribute('open') }, [pathname])

  /** «Войти как…»: текущая роль завершается, вход открывается для выбранной. */
  function switchRole(role: Role) {
    if (user) clearSession()
    navigate(`/login?role=${role}`)
  }

  function signOut() {
    clearSession()
    navigate('/', { state: { notice: 'Вы вышли из демо-аккаунта.' } })
  }

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" to="/" aria-label="Клиника Сана — на главную">
          <span className="brand__mark"><span /></span>
          <span className="brand__text">сана<span>клиника здоровья</span></span>
        </Link>

        <nav className="site-nav" aria-label="Основная навигация">
          {siteLinks.map(({ to, label }) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>

        <details className="mobile-menu" ref={menuRef}>
          <summary aria-label="Открыть меню"><Menu size={19} /></summary>
          <nav aria-label="Мобильная навигация">
            {siteLinks.map(({ to, label }) => <NavLink key={to} to={to} onClick={() => menuRef.current?.removeAttribute('open')}>{label}</NavLink>)}
          </nav>
        </details>

        <div className="site-header__actions">
          <label className="demo-role-switcher" title={user ? `Сейчас вы вошли как «${roleNames[user.role]}». Выбор другой роли завершит текущий вход.` : 'Войти в демо-кабинет от имени роли'}>
            <UserRound size={15} aria-hidden="true" />
            <select
              aria-label="Войти как…"
              value=""
              onChange={(event) => switchRole(event.target.value as Role)}
            >
              <option value="" disabled hidden>Войти как…</option>
              {Object.entries(roleNames).map(([role, name]) => <option key={role} value={role}>{name}{user?.role === role ? ' (сейчас)' : ''}</option>)}
            </select>
          </label>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {user ? (
            <div className="header-account">
              <Link className="button button--primary header-account__link" to={roleHomePath(user.role)}>
                Кабинет <ArrowUpRight size={15} />
              </Link>
              <button className="header-account__logout" type="button" onClick={signOut}>Выйти</button>
            </div>
          ) : (
            <Link className="button button--secondary header-login" to="/login">Войти <ArrowUpRight size={15} /></Link>
          )}
        </div>
      </div>
    </header>
  )
}
