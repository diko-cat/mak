import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Stethoscope, UsersRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { getAppointments, getDoctors, getPatients, getServices } from '../api'
import { buttonStyles } from '../components/ui'
import { useSession } from '../store/session'
import type { Appointment, Doctor, Patient, Role, Service } from '../types'

type CalendarView = 'day' | 'week'

const timeLabel = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dateLabel = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
const currency = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 })

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfWeek(value: string): Date {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return date
}

const roleHeading: Record<Role, { eyebrow: string; title: string; description: string }> = {
  patient: { eyebrow: 'КАБИНЕТ · ПАЦИЕНТ', title: 'Ваши приёмы и планы.', description: 'Записывайтесь к врачам и следите за визитами в одном месте.' },
  doctor: { eyebrow: 'КАБИНЕТ · ВРАЧ', title: 'Расписание приёма.', description: 'Выберите день или неделю, чтобы посмотреть визиты и пациентов.' },
  admin: { eyebrow: 'КАБИНЕТ · АДМИНИСТРАТОР', title: 'Запись клиники.', description: 'Общее расписание всех врачей и записи пациентов на выбранный период.' },
}

export function RoleLanding({ role }: { role: Role }) {
  const user = useSession()
  const location = useLocation()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [view, setView] = useState<CalendarView>('day')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const notice = (location.state as { notice?: string } | null)?.notice
  const copy = roleHeading[role]

  useEffect(() => {
    let active = true
    Promise.all([getAppointments(), getDoctors(), getPatients(), getServices()])
      .then(([appointmentData, doctorData, patientData, serviceData]) => {
        if (!active) return
        setAppointments(appointmentData)
        setDoctors(doctorData)
        setPatients(patientData)
        setServices(serviceData)
      })
      .catch(() => { if (active) setLoadError('Не удалось загрузить расписание. Обновите страницу.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const period = useMemo(() => {
    const start = view === 'week' ? startOfWeek(selectedDate) : new Date(`${selectedDate}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + (view === 'week' ? 7 : 1))
    return { start: start.getTime(), end: end.getTime(), startDate: start, endDate: end }
  }, [selectedDate, view])

  const visibleAppointments = useMemo(() => appointments
    .filter((appointment) => {
      const time = new Date(appointment.startsAt).getTime()
      if (time < period.start || time >= period.end) return false
      if (role === 'patient') return appointment.patientId === user?.patientId
      if (role === 'doctor') return appointment.doctorId === user?.doctorId
      return true
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt)), [appointments, period, role, user?.doctorId, user?.patientId])

  function movePeriod(direction: -1 | 1) {
    const next = new Date(`${selectedDate}T00:00:00`)
    next.setDate(next.getDate() + direction * (view === 'week' ? 7 : 1))
    setSelectedDate(dateKey(next))
  }

  const periodLabel = view === 'day'
    ? dateLabel.format(new Date(`${selectedDate}T12:00:00`))
    : `${dateLabel.format(period.startDate)} — ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(period.endDate.getTime() - 1))}`

  return (
    <main className="role-landing">
      <div className="container role-landing__content">
        {notice && <div className="schedule-notice" role="status">{notice}</div>}
        <section className="schedule-heading">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{user?.name ? `${user.name.split(' ')[0]}, ` : ''}{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          {role === 'patient' && <Link className={buttonStyles('primary')} to="/patient/appointments/new">Записаться · демо <ArrowRight size={16} /></Link>}
        </section>

        <section className="schedule-panel" aria-label="Расписание приёмов">
          <div className="schedule-toolbar">
            <div className="schedule-period">
              <span className="schedule-icon"><CalendarDays size={19} /></span>
              <div><strong>{role === 'doctor' ? 'Моё расписание' : role === 'admin' ? 'Все врачи клиники' : 'Мои записи'}</strong><span>{periodLabel}</span></div>
            </div>
            <div className="schedule-controls">
              <div className="schedule-view-toggle" role="group" aria-label="Период расписания">
                <button className={view === 'day' ? 'is-active' : ''} type="button" onClick={() => setView('day')}>День</button>
                <button className={view === 'week' ? 'is-active' : ''} type="button" onClick={() => setView('week')}>Неделя</button>
              </div>
              <button className="schedule-nav" type="button" onClick={() => movePeriod(-1)} aria-label="Предыдущий период"><ArrowLeft size={16} /></button>
              <input aria-label="Выберите дату расписания" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              <button className="schedule-nav" type="button" onClick={() => movePeriod(1)} aria-label="Следующий период"><ArrowRight size={16} /></button>
            </div>
          </div>

          {loading ? <p className="schedule-empty" role="status">Загружаем записи…</p> : loadError ? <p className="schedule-empty" role="alert">{loadError}</p> : visibleAppointments.length ? (
            <div className="schedule-list">
              {visibleAppointments.map((appointment) => {
                const doctor = doctors.find((entry) => entry.id === appointment.doctorId)
                const patient = patients.find((entry) => entry.id === appointment.patientId)
                const service = services.find((entry) => entry.id === appointment.serviceId)
                const starts = new Date(appointment.startsAt)
                const statusLabel = { requested: 'Ожидает подтверждения', confirmed: 'Подтверждён', completed: 'Завершён', cancelled: 'Отменён' }[appointment.status]
                return (
                  <article className={`schedule-appointment schedule-appointment--${appointment.status}`} key={appointment.id}>
                    <div className="schedule-time"><strong>{timeLabel.format(starts)}</strong><span>{dateLabel.format(starts)}</span></div>
                    <span className="schedule-appointment__icon">{role === 'admin' ? <UsersRound size={18} /> : <Stethoscope size={18} />}</span>
                    <div className="schedule-appointment__details">
                      <strong>{service?.name ?? 'Приём'}</strong>
                      <span>{role === 'doctor' ? patient?.name ?? 'Пациент' : doctor?.name ?? 'Врач'}{role === 'admin' && patient ? ` · ${patient.name}` : ''}</span>
                    </div>
                    <div className="schedule-appointment__meta">
                      <span className={`appointment-status appointment-status--${appointment.status}`}>{statusLabel}</span>
                      {service && <small>{currency.format(service.price)} ₸ · {service.durationMinutes} мин</small>}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="schedule-empty">
              <span className="schedule-icon"><Clock3 size={19} /></span>
              <strong>На этот период записей пока нет</strong>
              <span>{role === 'patient' ? 'Выберите время для первого визита.' : 'Новые записи появятся здесь после бронирования.'}</span>
              {role === 'patient' && <Link to="/patient/appointments/new">Выбрать свободное время <ArrowRight size={15} /></Link>}
            </div>
          )}
          <footer className="schedule-footer">{visibleAppointments.length} {visibleAppointments.length === 1 ? 'запись' : 'записей'} за период · Демо-расписание клиники</footer>
        </section>
        <p className="schedule-demo-note">Данные расписания хранятся только в этом браузере и используются для демонстрации.</p>
        <Link className="schedule-home-link" to="/"><ArrowLeft size={14} /> На главную</Link>
      </div>
    </main>
  )
}
