import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createAppointment, getCalendarAvailability, getDaySlots } from '../../api'
import { Button, buttonStyles } from '../../components/ui'
import type { Appointment, DaySlot } from '../../types'
import { BookingCalendar } from '../cabinet/BookingCalendar'
import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { addDays, errorMessage, formatPrice, formatTime, longDayFormat, toDateKey } from '../cabinet/format'
import { AppointmentTicket } from './components'
import type { usePatientData } from './usePatientData'

const BOOKING_DAYS = 60

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
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

  const bookingDays = useMemo(() => Array.from({ length: BOOKING_DAYS }, (_, index) => addDays(index)), [])
  const bookingDateKeys = useMemo(() => bookingDays.map(toDateKey), [bookingDays])
  const firstMonth = startOfMonth(bookingDays[0])
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
          <Button variant="secondary" onClick={() => { setCreated(null); chooseService('') }}>Записаться ещё</Button>
        </div>
      </Panel>
    )
  }

  return (
    <div className="booking">
      <div className="stack">
        <Panel title={<><span className="step-index">1</span>Услуга</>}>
          <div className="choice-grid">
            {data.services.map((entry) => (
              <button key={entry.id} type="button" className={`choice ${serviceId === entry.id ? 'choice--active' : ''}`} aria-pressed={serviceId === entry.id} onClick={() => chooseService(entry.id)}>
                <strong>{entry.name}</strong>
                <small>{entry.category} · {entry.durationMinutes} мин</small>
                <span className="choice__price">{formatPrice(entry.price)}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={<><span className="step-index">2</span>Специалист</>}>
          {!service ? <EmptyState>Сначала выберите услугу.</EmptyState> : doctors.length === 0 ? <EmptyState>Сейчас нет специалистов, которые принимают по этой услуге.</EmptyState> : (
            <div className="choice-grid">
              {doctors.map((entry) => (
                <button key={entry.id} type="button" className={`choice choice--doctor ${doctorId === entry.id ? 'choice--active' : ''}`} aria-pressed={doctorId === entry.id} onClick={() => chooseDoctor(entry.id)}>
                  <span className="avatar" aria-hidden="true">{entry.initials}</span>
                  <span><strong>{entry.name}</strong><small>{entry.specialty} · стаж {entry.experienceYears} лет</small></span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={<><span className="step-index">3</span>Дата</>}>
          {!doctor ? <EmptyState>Выберите специалиста, чтобы увидеть даты.</EmptyState> : (
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
          )}
        </Panel>

        <Panel title={<><span className="step-index">4</span>Время</>}>
          {!date ? <EmptyState>Выберите дату.</EmptyState> : loadingSlots ? <LoadingNote>Загружаем расписание…</LoadingNote> : slots.some((entry) => entry.available) ? (
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
        </Panel>

        <Panel title={<><span className="step-index">5</span>Причина обращения</>}>
          <label className="form-field cabinet-field">
            <span>Опишите, что вас беспокоит</span>
            <textarea rows={3} value={reason} maxLength={500} disabled={!slot} placeholder={slot ? 'Например: болит голова по утрам уже неделю' : 'Сначала выберите время'} onChange={(event) => setReason(event.target.value)} />
          </label>
        </Panel>
      </div>

      <aside className="booking-summary-card" aria-label="Сводка записи">
        <p className="eyebrow">ВАША ЗАПИСЬ</p>
        <dl>
          <div><dt>Услуга</dt><dd>{service?.name ?? '—'}</dd></div>
          <div><dt>Специалист</dt><dd>{doctor ? `${doctor.name}, ${doctor.specialty.toLowerCase()}` : '—'}</dd></div>
          <div><dt>Дата</dt><dd>{date ? longDayFormat.format(new Date(`${date}T00:00:00`)) : '—'}</dd></div>
          <div><dt>Время</dt><dd>{slot ? formatTime(slot) : '—'}</dd></div>
          <div><dt>Кабинет</dt><dd>{doctor?.room ?? '—'}</dd></div>
          <div><dt>Причина</dt><dd>{reason.trim() || '—'}</dd></div>
        </dl>
        <div className="booking-summary-card__price"><span>К оплате</span><strong>{service ? formatPrice(service.price) : '—'}</strong></div>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <Button className="booking-summary-card__submit" disabled={!ready || submitting} onClick={confirm}>
          {submitting ? 'Записываем…' : 'Подтвердить запись'}
        </Button>
        {!ready && <p className="muted small">Кнопка станет активной, когда вы выберете услугу, врача, дату, время и укажете причину.</p>}
      </aside>
    </div>
  )
}
