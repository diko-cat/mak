import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, HeartPulse, ShieldCheck, Sparkles, Stethoscope, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getDemoCredentials, login } from '../../api'
import { Button } from '../../components/ui'
import { setSession } from '../../store/session'
import type { LoginCredentials, Role } from '../../types'
import { roleHomePath } from './SiteHeader'

const roleOptions: { role: Role; title: string; detail: string; icon: typeof UserRound }[] = [
  { role: 'patient', title: 'Пациент', detail: 'Запись и история здоровья', icon: HeartPulse },
  { role: 'doctor', title: 'Врач', detail: 'Расписание и пациенты', icon: Stethoscope },
  { role: 'admin', title: 'Администратор', detail: 'Управление клиникой', icon: ShieldCheck },
]

interface LoginPageState {
  message?: string
  from?: { pathname?: string; search?: string; hash?: string }
}

function roleFromPath(pathname = ''): Role | null {
  if (pathname.startsWith('/patient')) return 'patient'
  if (pathname.startsWith('/doctor')) return 'doctor'
  if (pathname.startsWith('/admin')) return 'admin'
  return null
}

export function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const role: Role = roleParam === 'doctor' || roleParam === 'admin' ? roleParam : 'patient'
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as LoginPageState | null) ?? null
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '', role })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setError('')
    getDemoCredentials(role).then(setCredentials).catch(() => setCredentials({ email: '', password: '', role }))
  }, [role])

  function selectRole(nextRole: Role) {
    setSearchParams({ role: nextRole }, { state: location.state })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await login({ ...credentials, role })
      setSession(user)
      const requestedPath = state?.from?.pathname
      const requestedRole = roleFromPath(requestedPath)
      const destination = requestedPath && requestedRole === user.role
        ? `${requestedPath}${state?.from?.search ?? ''}${state?.from?.hash ?? ''}`
        : roleHomePath(user.role)
      navigate(destination, { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Не удалось войти. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="container login-layout">
        <aside className="login-story">
          <Link className="login-back" to="/"><ArrowLeft size={16} /> На главную</Link>
          <div className="login-story__content">
            <span className="login-story__icon"><Sparkles size={22} /></span>
            <p className="eyebrow">ДОБРО ПОЖАЛОВАТЬ В САНА</p>
            <h1>Всё о вашем здоровье — <em>в одном месте.</em></h1>
            <p>Записи, результаты и рекомендации врачей собраны в удобном личном кабинете.</p>
            <div className="login-story__quote"><span>“</span><div><p>Здесь вас помнят, слышат и всегда рады помочь.</p><small>Команда клиники «Сана»</small></div></div>
          </div>
          <span className="login-story__watermark">сана</span>
        </aside>

        <section className="login-card">
          <div className="login-card__heading"><p className="eyebrow">ДЕМО-ДОСТУП</p><h2>Войти в кабинет</h2><p>Выберите роль, чтобы посмотреть сайт от её имени.</p></div>
          {state?.message && <div className="login-notice" role="status"><span><ShieldCheck size={18} /></span><p>{state.message}</p></div>}

          <div className="role-picker" role="group" aria-label="Выберите роль">
            {roleOptions.map(({ role: optionRole, title, detail, icon: Icon }) => (
              <button className={`role-option ${role === optionRole ? 'role-option--active' : ''}`} type="button" key={optionRole} onClick={() => selectRole(optionRole)} aria-pressed={role === optionRole}>
                <span className="role-option__icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{detail}</small></span><span className="role-option__radio" />
              </button>
            ))}
          </div>

          <form className="login-form" onSubmit={submit}>
            <label className="form-field"><span>Email</span><input type="email" autoComplete="username" required value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} /></label>
            <label className="form-field"><span>Пароль</span><input type="password" autoComplete="current-password" required value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /></label>
            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
            <Button className="login-submit" type="submit" disabled={loading}>{loading ? 'Входим…' : 'Войти в демо-кабинет'} <ArrowRight size={17} /></Button>
          </form>
          <div className="demo-hint"><span><ShieldCheck size={15} /></span><p>Демо-данные для выбранной роли подставляются автоматически. Можно нажать «Войти» сразу.</p></div>
          <div className="login-card__footer"><span>Не нужно регистрироваться</span><span><UserRound size={14} /> Данные сохраняются только в этом браузере</span></div>
        </section>
      </div>
    </main>
  )
}
