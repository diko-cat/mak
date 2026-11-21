import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createAppointment, getCalendarAvailability, getDaySlots } from '../../api'
import { Button, buttonStyles } from '../../components/ui'
import type { Appointment, DaySlot } from '../../types'
import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { addDays, errorMessage, formatPrice, formatTime, longDayFormat, toDateKey, weekdayFormat } from '../cabinet/format'
import { AppointmentTicket } from './components'
import type { usePatientData } from './usePatientData'

const BOOKING_DAYS = 60
const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const STEPS = ['Услуга', 'Специалист', 'Дата', 'Время', 'Причина'] as const
const STEP_HINTS = ['Выберите услугу, чтобы продолжить.', 'Выберите специалиста, чтобы продолжить.', 'Выберите дату, чтобы продолжить.', 'Выберите время, чтобы продолжить.', 'Опишите причину обращения, чтобы подтвердить запись.']

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthCells(month: Date): (Date | null)[] {
  const first = startOfMonth(month)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1)),
  ]
}

export function PatientBooking({ patient, patientId }: { patient: ReturnType<typeof usePatientData>; patientId: string }) {
  const { data, reload, doctorOf, serviceOf } = patient
  const [serviceId, setServiceId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [reason, setReason] = useState('')
  const [slots, setSlots] = useState<DaySlot[]>([])
  const [availability, setAvailability] = useState<Record<string, number>>({})
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsVersion, setSlotsVersion] = useState(0)
  const [calendarVersion, setCalendarVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<Appointment | null>(null)
  /** Мастер записи: на экране один шаг, переход — кнопками «Назад» и «Продолжить». */
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  const bookingDays = useMemo(() => Array.from({ length: BOOKING_DAYS }, (_, index) => addDays(index)), [])
  const bookingDateKeys = useMemo(() => bookingDays.map(toDateKey), [bookingDays])
  const calendarDates = useMemo(() => monthCells(visibleMonth), [visibleMonth])
  const firstMonth = startOfMonth(bookingDays[0])
  const lastMonth = startOfMonth(bookingDays[bookingDays.length - 1])
  const service = serviceOf(serviceId)
  const doctor = doctorOf(doctorId)
  const doctors = useMemo(
    () => (data?.doctors ?? []).filter((entry) => entry.active !== false && (!service?.specialty || entry.specialty === service.specialty)),
    [data, service],
  )

  useEffect(() => {
    if (!doctorId || !service) {
      setAvailability({})
      setCalendarLoading(false)
      setCalendarError('')
      return
    }
    let active = true
    setCalendarLoading(true)
    setCalendarError('')
    getCalendarAvailability(doctorId, bookingDateKeys, service.durationMinutes)
      .then((result) => { if (active) setAvailability(result) })
      .catch((availabilityError: unknown) => { if (active) setCalendarError(errorMessage(availabilityError, 'Не удалось загрузить свободные даты.')) })
      .finally(() => { if (active) setCalendarLoading(false) })
    return () => { active = false }
  }, [doctorId, service, bookingDateKeys, calendarVersion])

  useEffect(() => {
    if (!doctorId || !date || !service) return
    let active = true
    setLoadingSlots(true)
    getDaySlots(doctorId, date, service.durationMinutes)
      .then((result) => { if (active) setSlots(result) })
      .catch((slotError: unknown) => { if (active) setError(errorMessage(slotError, 'Не удалось загрузить расписание врача.')) })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [doctorId, date, service, slotsVersion])

  if (!data) return <LoadingNote />

  function chooseService(id: string) {
    setServiceId(id)
    setDoctorId('')
    setDate('')
    setSlot('')
    setSlots([])
    setAvailability({})
    setVisibleMonth(firstMonth)
    setError('')
  }
  function chooseDoctor(id: string) {
    setDoctorId(id)
    setDate('')
    setSlot('')
    setSlots([])
    setAvailability({})
    setVisibleMonth(firstMonth)
    setError('')
  }
  function chooseDate(key: string) {
    if ((availability[key] ?? 0) < 1) return
    setDate(key)
    setSlot('')
    setSlots([])
    setError('')
  }
  function changeMonth(offset: number) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1))
  }

  const ready = Boolean(service && doctor && date && slot && reason.trim())
  const stepDone = [Boolean(service), Boolean(doctor), Boolean(date), Boolean(slot), ready]
  const canContinue = stepDone[step - 1]

  function goTo(next: number) {
    setDirection(next > step ? 'forward' : 'back')
    setStep(next)
    setError('')
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => document.getElementById('booking-top')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }))
  }

  const choices = [
    { step: 1, label: 'Услуга', value: service && `${service.name} · ${formatPrice(service.price)}` },
    { step: 2, label: 'Специалист', value: doctor && `${doctor.name}, ${doctor.specialty.toLowerCase()}` },
    { step: 3, label: 'Дата', value: date && longDayFormat.format(new Date(`${date}T00:00:00`)) },
    { step: 4, label: 'Время', value: slot && `${formatTime(slot)}${doctor?.room ? ` · кабинет ${doctor.room}` : ''}` },
  ].filter((choice) => choice.value)

  async function confirm() {
    if (!ready) return
    setSubmitting(true)
    setError('')
    try {
      const appointment = await createAppointment({ patientId, doctorId, serviceId, startsAt: slot, note: reason.trim() })
      setCreated(appointment)
      await reload()
    } catch (bookingError) {
      setError(errorMessage(bookingError, 'Не удалось создать запись.'))
      setSlot('')
      setStep(4)
      setSlotsVersion((value) => value + 1)
      setCalendarVersion((value) => value + 1)
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <Panel className="booking-done">
        <span className="booking-done__icon"><CheckCircle2 size={28} /></span>
        <h2>Вы записаны на приём</h2>
        <p className="muted">Сохраните номер талона. Запись уже появилась в расписании врача.</p>
        <AppointmentTicket appointment={created} doctor={doctorOf(created.doctorId)} service={serviceOf(created.serviceId)} />
        <div className="row-actions">
          <Link className={buttonStyles('primary')} to="/patient/appointments">Мои записи <ArrowRight size={15} /></Link>
          <Button variant="secondary" onClick={() => { setCreated(null); chooseService(''); setStep(1) }}>Записаться ещё</Button>
        </div>
      </Panel>
    )
  }

  return (
    <div className={`booking-wizard booking-wizard--${direction}`}>
      <div id="booking-top" className="booking-progress">
        <p className="booking-progress__label">Шаг {step} из {STEPS.length} · <strong key={step}>{STEPS[step - 1]}</strong></p>
        <ol className="booking-progress__steps">
          {STEPS.map((label, index) => (
            <li key={label} className={index + 1 < step ? 'is-done' : index + 1 === step ? 'is-current' : ''} aria-current={index + 1 === step ? 'step' : undefined}>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </div>

      {choices.length > 0 && (
        <section className="booking-choice" aria-label="Ваш выбор">
          <p className="eyebrow">ВАШ ВЫБОР</p>
          <dl>
            {choices.map((choice) => (
              <div key={choice.label}>
                <dt>{choice.label}</dt>
                <dd>{choice.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {step === 1 && <Panel title={<><span className="step-index">1</span>Услуга</>}>
          <div className="choice-grid">
            {data.services.map((entry) => (
              <button key={entry.id} type="button" className={`choice ${serviceId === entry.id ? 'choice--active' : ''}`} aria-pressed={serviceId === entry.id} onClick={() => chooseService(entry.id)}>
                <strong>{entry.name}</strong>
                <small>{entry.category} · {entry.durationMinutes} мин</small>
                <span className="choice__price">{formatPrice(entry.price)}</span>
              </button>
            ))}
          </div>
        </Panel>}
      {step === 2 && <Panel title={<><span className="step-index">2</span>Специалист</>}>
          {doctors.length === 0 ? <EmptyState>Сейчас нет специалистов, которые принимают по этой услуге.</EmptyState> : (
            <div className="choice-grid">
              {doctors.map((entry) => (
                <button key={entry.id} type="button" className={`choice choice--doctor ${doctorId === entry.id ? 'choice--active' : ''}`} aria-pressed={doctorId === entry.id} onClick={() => chooseDoctor(entry.id)}>
                  <span className="avatar" aria-hidden="true">{entry.initials}</span>
                  <span><strong>{entry.name}</strong><small>{entry.specialty} · стаж {entry.experienceYears} лет</small></span>
                </button>
              ))}
            </div>
          )}
        </Panel>}
      {step === 3 && <Panel title={<><span className="step-index">3</span>Дата</>}>
          {(
            <div className="booking-calendar" role="group" aria-label="Свободные даты на ближайшие два месяца">
              <div className="booking-calendar__header">
                <strong>{monthFormat.format(visibleMonth)}</strong>
                <div className="booking-calendar__controls">
                  <button type="button" aria-label="Предыдущий месяц" disabled={visibleMonth.getTime() <= firstMonth.getTime()} onClick={() => changeMonth(-1)}><ArrowLeft size={16} /></button>
                  <button type="button" aria-label="Следующий месяц" disabled={visibleMonth.getTime() >= lastMonth.getTime()} onClick={() => changeMonth(1)}><ArrowRight size={16} /></button>
                </div>
              </div>
              <div className="booking-calendar__grid booking-calendar__weekdays" aria-hidden="true">
                {weekDays.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="booking-calendar__grid">
                {calendarDates.map((day, index) => {
                  if (!day) return <span key={`blank-${index}`} className="booking-calendar__blank" />
                  const key = toDateKey(day)
                  const availableCount = availability[key] ?? 0
                  const inBookingWindow = key >= bookingDateKeys[0] && key <= bookingDateKeys[bookingDateKeys.length - 1]
                  const isAvailable = inBookingWindow && availableCount > 0
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`booking-calendar__day ${isAvailable ? 'booking-calendar__day--available' : ''} ${date === key ? 'booking-calendar__day--selected' : ''}`}
                      disabled={!isAvailable || calendarLoading}
                      aria-pressed={date === key}
                      aria-label={`${weekdayFormat.format(day)} ${day.getDate()} ${monthFormat.format(day)}${isAvailable ? ', есть свободное время' : ', свободного времени нет'}`}
                      title={isAvailable ? 'Есть свободное время' : 'Свободного времени нет'}
                      onClick={() => chooseDate(key)}
                    >
                      <span>{day.getDate()}</span>
                      {isAvailable && <i aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
              <p className="booking-calendar__legend"><i aria-hidden="true" />Есть свободное время</p>
              <p className="booking-calendar__horizon">Показываем доступность на ближайшие 60 дней.</p>
              {calendarLoading && <LoadingNote>Проверяем свободные даты…</LoadingNote>}
              {calendarError && <p className="form-message form-message--error" role="alert">{calendarError}</p>}
              {!calendarLoading && !calendarError && Object.keys(availability).length > 0 && !Object.values(availability).some((count) => count > 0) && <EmptyState>На ближайшие два месяца свободных дат нет.</EmptyState>}
            </div>
          )}
        </Panel>}
      {step === 4 && <Panel title={<><span className="step-index">4</span>Время</>}>
          {loadingSlots ? <LoadingNote>Загружаем расписание…</LoadingNote> : slots.some((entry) => entry.available) ? (
            <>
              <div className="slot-grid">
                {slots.map((entry) => (
                  <button
                    key={entry.startsAt}
                    type="button"
                    className={`slot ${slot === entry.startsAt ? 'slot--active' : ''}`}
                    disabled={!entry.available}
                    aria-pressed={slot === entry.startsAt}
                    title={entry.reason === 'busy' ? 'Время занято' : entry.reason === 'past' ? 'Время уже прошло' : undefined}
                    onClick={() => { setSlot(entry.startsAt); setError('') }}
                  >
                    {formatTime(entry.startsAt)}
                  </button>
                ))}
              </div>
              <p className="slot-legend"><span className="slot-legend__free" />свободно <span className="slot-legend__busy" />занято или прошло</p>
            </>
          ) : <EmptyState>На эту дату свободного времени нет. Выберите другой день.</EmptyState>}
        </Panel>}
      {step === 5 && <Panel title={<><span className="step-index">5</span>Причина обращения</>}>
          <label className="form-field cabinet-field">
            <span>Опишите, что вас беспокоит</span>
            <textarea rows={3} value={reason} maxLength={500} placeholder="Например: болит голова по утрам уже неделю" onChange={(event) => setReason(event.target.value)} />
          </label>
        </Panel>}

      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      <div className="booking-nav">
        {step > 1 ? <Button variant="secondary" onClick={() => goTo(step - 1)}><ArrowLeft size={16} /> Назад</Button> : <span />}
        {step < STEPS.length
          ? <Button key={`next-${step}-${canContinue}`} className={canContinue ? 'booking-nav__ready' : ''} disabled={!canContinue} onClick={() => goTo(step + 1)}>Продолжить <ArrowRight size={16} /></Button>
          : <Button disabled={!ready || submitting} onClick={confirm}>{submitting ? 'Записываем…' : 'Подтвердить запись'} <ArrowRight size={16} /></Button>}
      </div>
      {!canContinue && <p className="booking-nav__hint">{STEP_HINTS[step - 1]}</p>}
    </div>
  )
}
