import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarClock, CalendarOff, DoorOpen, GraduationCap, Star } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getAvailableSlots, getCalendarAvailability } from '../../api'
import { daysOffUntil, describeHours } from '../../api/schedule'
import { buttonStyles } from '../../components/ui'
import type { Doctor, Service } from '../../types'
import { addDays, dateFormat, formatPrice, formatTime, shortDateFormat, toDateKey, weekdayFormat } from '../cabinet/format'
import { BookLink } from './BookLink'
import { NotFoundPage } from './NotFoundPage'
import { countLabel, usePublicData } from './usePublicData'

const SEARCH_DAYS = 30
const NEAREST_COUNT = 4

/** Первые свободные слоты врача в ближайшие `SEARCH_DAYS` дней. */
function useNearestSlots(doctor: Doctor | undefined, durationMinutes: number) {
  const [slots, setSlots] = useState<string[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!doctor) return
    let active = true
    setSlots(null)
    setError('')
    const dates = Array.from({ length: SEARCH_DAYS }, (_, index) => toDateKey(addDays(index)))
    ;(async () => {
      const availability = await getCalendarAvailability(doctor.id, dates, durationMinutes)
      const found: string[] = []
      for (const date of dates.filter((key) => availability[key] > 0)) {
        found.push(...await getAvailableSlots(doctor.id, date, durationMinutes))
        if (found.length >= NEAREST_COUNT) break
      }
      if (active) setSlots(found.slice(0, NEAREST_COUNT))
    })().catch(() => { if (active) setError('Не удалось загрузить свободное время.') })
    return () => { active = false }
  }, [doctor, durationMinutes])

  return { slots, error }
}

export function DoctorPage() {
  const { id } = useParams()
  const { doctors, services, loaded } = usePublicData()
  const doctor = doctors.find((entry) => entry.id === id)
  const doctorServices: Service[] = doctor ? services.filter((service) => service.specialty === doctor.specialty) : []
  const duration = doctorServices.length ? Math.min(...doctorServices.map((service) => service.durationMinutes)) : 30
  const { slots, error } = useNearestSlots(doctor, duration)

  if (!loaded) return <main className="public-page section"><div className="container"><p className="loading-note">Загружаем карточку врача…</p></div></main>
  if (!doctor) return <NotFoundPage title="Такого врача нет или он сейчас не принимает." />

  const vacationUntil = daysOffUntil(doctor, toDateKey(new Date()))

  return (
    <main className="public-page section doctor-page">
      <div className="container">
        <Link className="doctor-page__back" to="/doctors"><ArrowLeft size={15} /> Все врачи</Link>
        <div className="doctor-page__grid">
          <aside className="doctor-profile">
            <div className={`doctor-portrait doctor-portrait--${doctor.accent}`}>
              {doctor.photoUrl
                ? <img className="doctor-profile__photo" src={doctor.photoUrl} alt={doctor.name} />
                : <div className="doctor-portrait__circle" aria-hidden="true"><span>{doctor.initials}</span></div>}
            </div>
            <div className="doctor-profile__body">
              <p className="eyebrow">{doctor.specialty}</p>
              <h1>{doctor.name}</h1>
              <ul className="doctor-profile__facts">
                <li><CalendarClock size={16} /> Стаж {countLabel(doctor.experienceYears, ['год', 'года', 'лет'])}</li>
                <li><Star size={16} /> Рейтинг {doctor.rating.toFixed(1)}</li>
                {doctor.room && <li><DoorOpen size={16} /> Кабинет {doctor.room}</li>}
              </ul>
              {vacationUntil && <p className="doctor-profile__away" role="status"><CalendarOff size={16} /> Не принимает до {dateFormat.format(new Date(`${vacationUntil}T00:00:00`))} включительно</p>}
              <BookLink className={buttonStyles('primary', 'doctor-profile__book')}>Записаться <ArrowRight size={16} /></BookLink>
            </div>
          </aside>

          <div className="doctor-details">
            <section>
              <h2>О враче</h2>
              <p>{doctor.description}</p>
            </section>
            <section>
              <h2><GraduationCap size={19} /> Образование</h2>
              <p>{doctor.education || 'Сведения об образовании уточняются.'}</p>
            </section>
            <section>
              <h2>График приёма</h2>
              <p>{describeHours(doctor.workingHours)}{!doctor.workingHours && ' (общий график клиники)'}</p>
            </section>
            <section>
              <h2>Ближайшее свободное время</h2>
              {error && <p className="form-message form-message--error" role="alert">{error}</p>}
              {!error && slots === null && <p className="loading-note">Ищем свободное время…</p>}
              {slots?.length === 0 && <p>В ближайшие {SEARCH_DAYS} дней свободного времени нет. Оставьте заявку на звонок — администратор подберёт время.</p>}
              {slots && slots.length > 0 && (
                <ul className="doctor-slots">
                  {slots.map((slot) => (
                    <li key={slot}>
                      <BookLink className="doctor-slot">
                        <small>{weekdayFormat.format(new Date(slot))}, {shortDateFormat.format(new Date(slot))}</small>
                        <strong>{formatTime(slot)}</strong>
                      </BookLink>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h2>Услуги и цены</h2>
              {doctorServices.length === 0 ? <p>Услуги уточняйте у администратора.</p> : (
                <ul className="doctor-services">
                  {doctorServices.map((service) => (
                    <li key={service.id}>
                      <span><strong>{service.name}</strong><small>{service.durationMinutes} мин · {service.description}</small></span>
                      <b>{formatPrice(service.price)}</b>
                      <BookLink className="service-row__arrow" aria-label={`Записаться: ${service.name}`}><ArrowUpRight size={16} /></BookLink>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
