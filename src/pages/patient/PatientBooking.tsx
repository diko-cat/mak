import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { createAppointment, getCalendarAvailability, getDaySlots } from '../../api'
import { Button, buttonStyles } from '../../components/ui'
import type { Appointment, DaySlot } from '../../types'
import { BookingCalendar } from '../cabinet/BookingCalendar'
import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { addDays, errorMessage, formatPrice, formatTime, longDayFormat, toDateKey } from '../cabinet/format'
import { AppointmentTicket } from './components'
import type { usePatientData } from './usePatientData'

const BOOKING_DAYS = 60
const STEP_TITLES = ['Услуга', 'Врач', 'Дата', 'Время', 'Причина обращения']

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
  const [savedReason, setSavedReason] = useState('')
  const [activeStep, setActiveStep] = useState(1)
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
  const stepRefs = useRef<Array<HTMLDivElement | null>>([])
  const savedReasonRef = useRef<HTMLButtonElement>(null)

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
      const step = stepRefs.current[activeStep]
      if (!step) return
      step.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const target = step.querySelector<HTMLElement>('[data-step-focus]') ?? step
      target.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeStep])

  useEffect(() => {
    if (activeStep !== 5) return
    if (savedReason) {
      savedReasonRef.current?.focus({ preventScroll: true })
      return
    }
    const frame = requestAnimationFrame(() => stepRefs.current[5]?.querySelector<HTMLElement>('[data-step-focus]')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [savedReason, activeStep])

  if (!data) return <LoadingNote />

  function chooseService(id: string) {
    const nextService = services.find((entry) => entry.id === id)
    const keepDoctor = Boolean(doctor && nextService?.specialty === doctor.specialty)
    setServiceId(id)
    if (!keepDoctor) setDoctorId('')
    setDate('')
    setSlot('')
    setReason('')
    setSavedReason('')
    setSlots([])
    setAvailability({})
    setVisibleMonth(firstMonth)
    setActiveStep(keepDoctor ? 3 : 2)
    setError('')
  }

  function chooseDoctor(id: string) {
    setDoctorId(id)
    setDate('')
    setSlot('')
    setReason('')
    setSavedReason('')
    setSlots([])
    setAvailability({})
    setVisibleMonth(firstMonth)
    setActiveStep(3)
    setError('')
  }

  function chooseDate(key: string) {
    if ((availability[key] ?? 0) < 1) return
    setDate(key)
    setSlot('')
    setSlots([])
    setActiveStep(4)
    setError('')
  }

  function chooseSlot(startsAt: string) {
    setSlot(startsAt)
    setActiveStep(5)
    setError('')
  }

  function changeMonth(offset: number) {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + offset, 1))
  }

  function editStep(step: number) {
    if (step === 2) {
      setDate('')
      setSlot('')
      setReason('')
      setSavedReason('')
      setSlots([])
      setError('')
    } else if (step === 3) {
      setDate('')
      setSlot('')
      setSlots([])
      setError('')
    } else if (step === 4) {
      setSlot('')
      setError('')
    } else if (step === 5) {
      setSavedReason('')
    }
    setActiveStep(step)
  }

  function saveReason() {
    const value = reason.trim()
    if (!slot || !value) return
    setReason(value)
    setSavedReason(value)
    setError('')
  }

  const ready = Boolean(service && doctor && date && slot && savedReason)

  async function confirm() {
    if (!ready) return
    setSubmitting(true)
    setError('')
    try {
      const appointment = await createAppointment({ patientId, doctorId, serviceId, startsAt: slot, note: savedReason })
      setCreated(appointment)
      await reload()
    } catch (bookingError) {
      const message = errorMessage(bookingError, 'Не удалось создать запись.')
      setError(message)
      if (isSlotConflict(bookingError, message)) {
        setSlot('')
        setSlotsVersion((value) => value + 1)
        setCalendarVersion((value) => value + 1)
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
    setSavedReason('')
    setSlots([])
    setAvailability({})
    setVisibleMonth(firstMonth)
    setActiveStep(1)
    setError('')
  }

  if (created) {
    return (
      <Panel className="booking-done">
        <span className="booking-done__icon"><CheckCircle2 size={28} /></span>
        <h2>Заявка отправлена</h2>
        <p className="muted">Администратор подтвердит её и позвонит вам.</p>
        <AppointmentTicket appointment={created} doctor={doctorOf(created.doctorId)} service={serviceOf(created.serviceId)} />
        <div className="row-actions">
          <Link className={buttonStyles('primary')} to="/patient/appointments">Мои записи <ArrowRight size={15} /></Link>
          <Button variant="secondary" onClick={startAgain}>Записаться ещё</Button>
        </div>
      </Panel>
    )
  }

  const summaries = [
    service && `Услуга: ${service.name} · ${service.durationMinutes} мин · ${formatPrice(service.price)}`,
    doctor && `Врач: ${doctor.name} · ${doctor.specialty}`,
    date && `Дата: ${longDayFormat.format(new Date(`${date}T00:00:00`))}`,
    slot && `Время: ${formatTime(slot)}`,
    savedReason && `Причина: ${savedReason}`,
  ]

  return (
    <div className="booking">
      <div className="booking__main">
        <p className="booking-progress" aria-live="polite">Шаг {activeStep} из 5</p>
        <div className="stack booking__steps">
          {STEP_TITLES.map((title, index) => {
            const number = index + 1
            const summary = summaries[index]
            const showingSavedReason = number === 5 && Boolean(savedReason) && activeStep === 5
            if (number < activeStep && summary || showingSavedReason) {
              return (
                <button
                  key={number}
                  ref={number === 5 ? savedReasonRef : undefined}
                  type="button"
                  className="booking-step__summary"
                  aria-label={`${summary}. Изменить`}
                  onClick={() => editStep(number)}
                >
                  <span className="booking-step__check" aria-hidden="true">✓</span>
                  <span className="booking-step__summary-text">{summary}</span>
                  <span className="booking-step__edit">Изменить</span>
                </button>
              )
            }
            if (number !== activeStep) return null

            return (
              <div key={number} className="booking-step" ref={(element) => { stepRefs.current[number] = element }} tabIndex={-1}>
                <Panel title={<><span className="step-index">{number}</span>{title}</>}>
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
                        <textarea data-step-focus rows={3} value={reason} maxLength={500} placeholder="Например: болит голова по утрам уже неделю" onChange={(event) => { setReason(event.target.value); setSavedReason('') }} />
                      </label>
                      <Button type="button" variant="secondary" disabled={!reason.trim()} onClick={saveReason}>Сохранить</Button>
                    </>
                  )}
                </Panel>
              </div>
            )
          })}
        </div>
      </div>

      <aside className="booking-summary-card" aria-label="Сводка записи">
        <p className="eyebrow">ВАША ЗАПИСЬ</p>
        <dl>
          <div><dt>Услуга</dt><dd>{service?.name ?? '—'}</dd></div>
          <div><dt>Специалист</dt><dd>{doctor ? `${doctor.name}, ${doctor.specialty.toLowerCase()}` : '—'}</dd></div>
          <div><dt>Дата</dt><dd>{date ? longDayFormat.format(new Date(`${date}T00:00:00`)) : '—'}</dd></div>
          <div><dt>Время</dt><dd>{slot ? formatTime(slot) : '—'}</dd></div>
          <div><dt>Кабинет</dt><dd>{doctor?.room ?? '—'}</dd></div>
          <div><dt>Причина</dt><dd>{savedReason || '—'}</dd></div>
        </dl>
        <div className="booking-summary-card__price"><span>К оплате</span><strong>{service ? formatPrice(service.price) : '—'}</strong></div>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <Button className="booking-summary-card__submit" disabled={!ready || submitting} onClick={confirm}>
          {submitting ? 'Отправляем…' : 'Подтвердить запись'}
        </Button>
        {!ready && <p className="muted small">Сначала выберите услугу, врача, дату и время, затем опишите и сохраните причину обращения.</p>}
      </aside>
    </div>
  )
}
