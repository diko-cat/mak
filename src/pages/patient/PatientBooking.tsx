import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { createAppointment, getCalendarAvailability, getDaySlots } from '../../api'
import { Button, buttonStyles } from '../../components/ui'
import type { Appointment, DaySlot } from '../../types'
import { BookingCalendar } from '../cabinet/BookingCalendar'
import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { addDays, errorMessage, formatPrice, formatTime, longDayFormat, toDateKey } from '../cabinet/format'
import { AppointmentTicket } from './components'
import type { usePatientData } from './usePatientData'

/*
 * НЕ ТРОГАТЬ вид формы записи: мастер по шагам согласован с командой.
 * Один шаг на экране, «Назад» / «Продолжить», полоса прогресса, карточка «Ваш выбор», анимации.
 * Не возвращать старый вид (все шаги списком с «Изменить» и сводкой справа).
 * При слиянии конфликтов в этом файле оставлять мастер; логику (запись, слоты, проверки) можно дополнять.
 */

const BOOKING_DAYS = 60
const STEP_TITLES = ['Услуга', 'Врач', 'Дата', 'Время', 'Причина обращения']
const STEP_HINTS = ['Выберите услугу, чтобы продолжить.', 'Выберите врача, чтобы продолжить.', 'Выберите дату, чтобы продолжить.', 'Выберите время, чтобы продолжить.', 'Опишите причину обращения, чтобы подтвердить запись.']

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function findByQuery<T extends { id: string; name: string }>(items: T[], value: string | null): T | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLocaleLowerCase('ru-RU')
  return items.find((item) => item.id === value || item.name.toLocaleLowerCase('ru-RU') === normalized)
}

function isSlotConflict(error: unknown, message: string): boolean {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  return code === 'SLOT_TAKEN' || code === 'PATIENT_APPOINTMENT_CONFLICT' || /время уже занято|у вас уже есть запись/i.test(message)
}

export function PatientBooking({ patient, patientId }: { patient: ReturnType<typeof usePatientData>; patientId: string }) {
  const { data, reload, doctorOf, serviceOf } = patient
  const [searchParams] = useSearchParams()
  const [serviceId, setServiceId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [reason, setReason] = useState('')
  /** Мастер записи: на экране один шаг, переход — кнопками «Назад» и «Продолжить». */
  const [activeStep, setActiveStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
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
  const bookingDays = useMemo(() => Array.from({ length: BOOKING_DAYS }, (_, index) => addDays(index)), [])
  const bookingDateKeys = useMemo(() => bookingDays.map(toDateKey), [bookingDays])
  const firstMonth = startOfMonth(bookingDays[0])
  const service = serviceOf(serviceId)
  const doctor = doctorOf(doctorId)
  const doctors = useMemo(
    () => (data?.doctors ?? []).filter((entry) => entry.active !== false && (!service?.specialty || entry.specialty === service.specialty)),
    [data, service],
  )
  const services = data?.services ?? []
  const preselectionApplied = useRef(false)
  const previousActiveStep = useRef(activeStep)
  const topRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!data || preselectionApplied.current) return
    preselectionApplied.current = true
    const requestedService = findByQuery(data.services, searchParams.get('service'))
    const requestedDoctor = findByQuery(data.doctors, searchParams.get('doctor'))
    const matchingDoctor = requestedDoctor?.active !== false
      && (!requestedService?.specialty || requestedDoctor?.specialty === requestedService.specialty)
      ? requestedDoctor
      : undefined

    if (requestedService) setServiceId(requestedService.id)
    if (matchingDoctor) setDoctorId(matchingDoctor.id)
    if (requestedService && matchingDoctor) setActiveStep(3)
    else if (requestedService) setActiveStep(2)
  }, [data, searchParams])

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
    getCalendarAvailability(doctorId, bookingDateKeys, service.durationMinutes, undefined, patientId)
      .then((result) => {
        if (!active) return
        setAvailability(result)
        const firstAvailableDate = bookingDateKeys.find((key) => (result[key] ?? 0) > 0)
        setVisibleMonth(startOfMonth(firstAvailableDate ? new Date(`${firstAvailableDate}T00:00:00`) : bookingDays[0]))
      })
      .catch((availabilityError: unknown) => { if (active) setCalendarError(errorMessage(availabilityError, 'Не удалось загрузить свободные даты.')) })
      .finally(() => { if (active) setCalendarLoading(false) })
    return () => { active = false }
  }, [doctorId, service, bookingDateKeys, bookingDays, patientId, calendarVersion])

  useEffect(() => {
    if (!doctorId || !date || !service) return
    let active = true
    setLoadingSlots(true)
    getDaySlots(doctorId, date, service.durationMinutes, undefined, patientId)
      .then((result) => { if (active) setSlots(result) })
      .catch((slotError: unknown) => { if (active) setError(errorMessage(slotError, 'Не удалось загрузить расписание врача.')) })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [doctorId, date, service, slotsVersion, patientId])

  useEffect(() => {
    if (previousActiveStep.current === activeStep) return
    previousActiveStep.current = activeStep
    const frame = requestAnimationFrame(() => {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      topRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
      stepRef.current?.querySelector<HTMLElement>('[data-step-focus]')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeStep])

  if (!data) return <LoadingNote />

  function chooseService(id: string) {
    const nextService = services.find((entry) => entry.id === id)
    const keepDoctor = Boolean(doctor && nextService?.specialty === doctor.specialty)
    setServiceId(id)
    if (!keepDoctor) setDoctorId('')
    setDate('')
    setSlot('')
    setReason('')
    setSlots([])
    setAvailability({})
    setVisibleMonth(firstMonth)
    setError('')
  }

  function chooseDoctor(id: string) {
    setDoctorId(id)
    setDate('')
    setSlot('')
    setReason('')
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

  function chooseSlot(startsAt: string) {
    setSlot(startsAt)
    setError('')
  }

  function changeMonth(offset: number) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1))
  }

  function goTo(step: number) {
    setDirection(step > activeStep ? 'forward' : 'back')
    setActiveStep(step)
    setError('')
  }

  const ready = Boolean(service && doctor && date && slot && reason.trim())
  const stepDone = [Boolean(service), Boolean(doctor), Boolean(date), Boolean(slot), ready]
  const canContinue = stepDone[activeStep - 1]

  async function confirm() {
    if (!ready) return
    setSubmitting(true)
    setError('')
    try {
      const appointment = await createAppointment({ patientId, doctorId, serviceId, startsAt: slot, note: reason.trim() })
      setCreated(appointment)
      await reload()
    } catch (bookingError) {
      const message = errorMessage(bookingError, 'Не удалось создать запись.')
      setError(message)
      if (isSlotConflict(bookingError, message)) {
        setSlot('')
        setSlotsVersion((value) => value + 1)
        setCalendarVersion((value) => value + 1)
        setDirection('back')
        setActiveStep(4)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function startAgain() {
    setCreated(null)
    setServiceId('')
    setDoctorId('')
    setDate('')
    setSlot('')
    setReason('')
    setSlots([])
    setAvailability({})
    setVisibleMonth(firstMonth)
    setDirection('forward')
    setActiveStep(1)
    setError('')
  }

  if (created) {
    return (
      <Panel className="booking-done">
        <span className="booking-done__icon"><CheckCircle2 size={28} /></span>
        <h2>Демо-запись сохранена</h2>
        <p className="muted">Она доступна в демо-кабинетах только в этом браузере. Клиника не получила запись и не отправит подтверждение.</p>
        <AppointmentTicket appointment={created} doctor={doctorOf(created.doctorId)} service={serviceOf(created.serviceId)} />
        <div className="row-actions">
          <Link className={buttonStyles('primary')} to="/patient/appointments">Мои записи <ArrowRight size={15} /></Link>
          <Button variant="secondary" onClick={startAgain}>Записаться ещё</Button>
        </div>
      </Panel>
    )
  }

  const choices = [
    { label: 'Услуга', value: service && `${service.name} · ${formatPrice(service.price)}` },
    { label: 'Врач', value: doctor && `${doctor.name}, ${doctor.specialty.toLowerCase()}` },
    { label: 'Дата', value: date && longDayFormat.format(new Date(`${date}T00:00:00`)) },
    { label: 'Время', value: slot && `${formatTime(slot)}${doctor?.room ? ` · кабинет ${doctor.room}` : ''}` },
  ].filter((choice) => choice.value)
  const number = activeStep

  return (
    <div className={`booking-wizard booking-wizard--${direction}`}>
      <div ref={topRef} className="booking-progress" aria-live="polite">
        <p className="booking-progress__label">Шаг {activeStep} из {STEP_TITLES.length} · <strong key={activeStep}>{STEP_TITLES[activeStep - 1]}</strong></p>
        <ol className="booking-progress__steps">
          {STEP_TITLES.map((label, index) => (
            <li key={label} className={index + 1 < activeStep ? 'is-done' : index + 1 === activeStep ? 'is-current' : ''} aria-current={index + 1 === activeStep ? 'step' : undefined}>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </div>

      {choices.length > 0 && (
        <section className="booking-choice" aria-label="Ваш выбор">
          <p className="eyebrow">ВАШ ВЫБОР</p>
          <dl>
            {choices.map((choice) => <div key={choice.label}><dt>{choice.label}</dt><dd>{choice.value}</dd></div>)}
          </dl>
        </section>
      )}

      <div key={activeStep} ref={stepRef} className="booking-wizard__step">
        <Panel title={<><span className="step-index">{activeStep}</span>{STEP_TITLES[activeStep - 1]}</>}>
          {number === 1 && (
                    <>
                      <div className="choice-grid">
                        {data.services.map((entry, serviceIndex) => (
                          <button key={entry.id} data-step-focus={serviceIndex === 0 ? true : undefined} type="button" className={`choice ${serviceId === entry.id ? 'choice--active' : ''}`} aria-pressed={serviceId === entry.id} onClick={() => chooseService(entry.id)}>
                            <strong>{entry.name}</strong>
                            <small>{entry.category} · {entry.durationMinutes} мин</small>
                            <span className="choice__price">{formatPrice(entry.price)}</span>
                          </button>
                        ))}
                      </div>
                      {doctor && !service && <p className="booking-prefill-note">Вы выбрали врача {doctor.name}. Если услуга ему подходит, запись продолжится сразу с выбора даты.</p>}
                    </>
                  )}
          {number === 2 && (!service ? <EmptyState>Сначала выберите услугу.</EmptyState> : doctors.length === 0 ? <EmptyState>Сейчас нет врачей, которые принимают по этой услуге.</EmptyState> : (
                    <div className="choice-grid">
                      {doctors.map((entry, doctorIndex) => (
                        <button key={entry.id} data-step-focus={doctorIndex === 0 ? true : undefined} type="button" className={`choice choice--doctor ${doctorId === entry.id ? 'choice--active' : ''}`} aria-pressed={doctorId === entry.id} onClick={() => chooseDoctor(entry.id)}>
                          <span className="avatar" aria-hidden="true">{entry.initials}</span>
                          <span><strong>{entry.name}</strong><small>{entry.specialty} · стаж {entry.experienceYears} лет</small></span>
                        </button>
                      ))}
                    </div>
                  ))}
          {number === 3 && (!doctor ? <EmptyState>Выберите врача, чтобы увидеть даты.</EmptyState> : (
                    <BookingCalendar
                      availability={availability}
                      selectedDate={date}
                      visibleMonth={visibleMonth}
                      minDate={bookingDays[0]}
                      maxDate={bookingDays[bookingDays.length - 1]}
                      loading={calendarLoading}
                      error={calendarError}
                      horizonLabel="Показываем доступность на ближайшие 60 дней."
                      emptyMessage="На ближайшие два месяца свободных дат нет."
                      onSelect={chooseDate}
                      onMonthChange={changeMonth}
                    />
                  ))}
          {number === 4 && (!date ? <EmptyState>Выберите дату.</EmptyState> : loadingSlots ? <LoadingNote>Загружаем расписание…</LoadingNote> : slots.some((entry) => entry.available) ? (
                    <>
                      <div className="slot-grid">
                        {slots.map((entry, slotIndex) => (
                          <button
                            key={entry.startsAt}
                            data-step-focus={slotIndex === slots.findIndex((slotEntry) => slotEntry.available) ? true : undefined}
                            type="button"
                            className={`slot ${slot === entry.startsAt ? 'slot--active' : ''}`}
                            disabled={!entry.available}
                            aria-pressed={slot === entry.startsAt}
                            title={entry.reason === 'busy' ? 'Время занято' : entry.reason === 'past' ? 'Время уже прошло' : undefined}
                            onClick={() => chooseSlot(entry.startsAt)}
                          >
                            {formatTime(entry.startsAt)}
                          </button>
                        ))}
                      </div>
                      <p className="slot-legend"><span className="slot-legend__free" />свободно <span className="slot-legend__busy" />занято или прошло</p>
                    </>
                  ) : <EmptyState>На эту дату свободного времени нет. Выберите другой день.</EmptyState>)}
          {number === 5 && (
                    <>
                      <label className="form-field cabinet-field">
                        <span>Опишите, что вас беспокоит</span>
                        <textarea data-step-focus rows={3} value={reason} maxLength={500} placeholder="Например: болит голова по утрам уже неделю" onChange={(event) => setReason(event.target.value)} />
                      </label>
                    </>
                  )}
        </Panel>
      </div>

      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      <div className="booking-nav">
        {activeStep > 1 ? <Button variant="secondary" onClick={() => goTo(activeStep - 1)}><ArrowLeft size={16} /> Назад</Button> : <span />}
        {activeStep < STEP_TITLES.length
          ? <Button key={`next-${activeStep}-${canContinue}`} className={canContinue ? 'booking-nav__ready' : ''} disabled={!canContinue} onClick={() => goTo(activeStep + 1)}>Продолжить <ArrowRight size={16} /></Button>
          : <Button disabled={!ready || submitting} onClick={confirm}>{submitting ? 'Отправляем…' : 'Подтвердить запись'} <ArrowRight size={16} /></Button>}
      </div>
      {!canContinue && <p className="booking-nav__hint">{STEP_HINTS[activeStep - 1]}</p>}
    </div>
  )
}
