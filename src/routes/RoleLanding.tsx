import { ArrowRight, CalendarDays, ClipboardList, Settings2, ShieldCheck, Stethoscope } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { buttonStyles } from '../components/ui'
import { useSession } from '../store/session'
import type { Role } from '../types'

const roleCopy: Record<Role, { title: string; description: string; icon: typeof Stethoscope; features: string[] }> = {
  patient: {
    title: 'Ваше здоровье — под рукой',
    description: 'Выберите врача и удобное время. Здесь будут собраны ваши записи и рекомендации команды клиники.',
    icon: CalendarDays,
    features: ['Запись на приём', 'История визитов', 'Заключения и анализы'],
  },
  doctor: {
    title: 'Здравствуйте, доктор',
    description: 'В демо-кабинете врача собраны расписание приёма и информация о пациентах.',
    icon: Stethoscope,
    features: ['Расписание', 'Карты пациентов', 'Заключения и назначения'],
  },
  admin: {
    title: 'Рабочее пространство клиники',
    description: 'Демо-кабинет администратора поможет управлять основными данными и заявками клиники.',
    icon: Settings2,
    features: ['Врачи и пациенты', 'Расписание и услуги', 'Заявки на звонок'],
  },
}

export function RoleLanding({ role }: { role: Role }) {
  const user = useSession()
  const location = useLocation()
  const copy = roleCopy[role]
  const Icon = copy.icon
  const notice = (location.state as { notice?: string } | null)?.notice

  return (
    <main className="role-landing">
      <div className="container role-landing__inner">
        {notice && <div className="notice-bar notice-bar--inline" role="status">{notice}</div>}
        <div className="role-welcome-card">
          <span className="role-welcome-card__icon"><Icon size={27} /></span>
          <p className="eyebrow">КАБИНЕТ · {role === 'patient' ? 'ПАЦИЕНТ' : role === 'doctor' ? 'ВРАЧ' : 'АДМИНИСТРАТОР'}</p>
          <h1>{copy.title}</h1>
          <p className="role-welcome-card__description">{user?.name ? `${user.name}, ` : ''}{copy.description}</p>
          <div className="role-feature-list">
            {copy.features.map((feature) => <span key={feature}><ShieldCheck size={15} />{feature}</span>)}
          </div>
          {role === 'patient' ? (
            <Link className={buttonStyles('primary', 'button--large')} to="/patient/appointments/new">Записаться к врачу <ArrowRight size={16} /></Link>
          ) : (
            <div className="role-placeholder-note"><ClipboardList size={17} /><span>Основные экраны этого кабинета подключаются в следующей части проекта.</span></div>
          )}
        </div>
        <div className="role-side-card"><span className="role-side-card__icon"><CalendarDays size={21} /></span><p className="eyebrow">МЫ РЯДОМ</p><h2>Нужна помощь?</h2><p>Позвоните нам — администратор поможет выбрать врача и ответит на вопросы.</p><a className={buttonStyles('secondary')} href="tel:+77273551414">Связаться с клиникой <ArrowRight size={15} /></a></div>
      </div>
      {role === 'patient' && <div className="container role-back-link"><Link to="/"><ArrowRight size={14} /> Вернуться на главную</Link></div>}
    </main>
  )
}
