import { ArrowUpRight, Moon, Sun, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession, clearSession } from '../../store/session'
import { toggleTheme, useTheme } from '../../store/theme'
import type { Role } from '../../types'

const roleNames: Record<Role, string> = {
  patient: 'Пациент',
  doctor: 'Врач',
  admin: 'Администратор',
}

export function roleHomePath(role: Role): string {
  return `/${role}`
}

export function SiteHeader() {
  const user = useSession()
  const theme = useTheme()
  const navigate = useNavigate()

  function switchRole(role: Role) {
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
          <a href="/#about">О клинике</a>
          <a href="/#services">Услуги</a>
          <a href="/#doctors">Врачи</a>
          <a href="/#contacts">Контакты</a>
        </nav>

        <div className="site-header__actions">
          <label className="demo-role-switcher" title="Выбрать демо-роль">
            <UserRound size={15} aria-hidden="true" />
            <select
              aria-label="Демо-роль"
              value={user?.role ?? 'patient'}
              onChange={(event) => switchRole(event.target.value as Role)}
            >
              {Object.entries(roleNames).map(([role, name]) => <option key={role} value={role}>{name}</option>)}
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
