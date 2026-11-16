import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createAppointment, getDaySlots } from '../../api'
import { Button, buttonStyles } from '../../components/ui'
import type { Appointment, DaySlot } from '../../types'
import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { addDays, errorMessage, formatPrice, formatTime, longDayFormat, shortDateFormat, toDateKey, weekdayFormat } from '../cabinet/format'
import { AppointmentTicket } from './components'
import type { usePatientData } from './usePatientData'

const BOOKING_DAYS = 7

export function PatientBooking({ patient, patientId }: { patient: ReturnType<typeof usePatientData>; patientId: string }) {
  const { data, reload, doctorOf, serviceOf } = patient
  const [serviceId, setServiceId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [reason, setReason] = useState('')
  const [slots, setSlots] = useState<DaySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsVersion, setSlotsVersion] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<Appointment | null>(null)

  const days = useMemo(() => Array.from({ length: BOOKING_DAYS }, (_, index) => addDays(index)), [])
  const service = serviceOf(serviceId)
  const doctor = doctorOf(doctorId)
  const doctors = useMemo(
    () => (data?.doctors ?? []).filter((entry) => entry.active !== false && (!service?.specialty || entry.specialty === service.specialty)),
    [data, service],
  )

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
    setServiceId(id); setDoctorId(''); setDate(''); setSlot(''); setSlots([]); setError('')
  }
  function chooseDoctor(id: string) {
    setDoctorId(id); setDate(''); setSlot(''); setSlots([]); setError('')
  }
  function chooseDate(key: string) {
    setDate(key); setSlot(''); setSlots([]); setError('')
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

        <Panel title={<><span className="step-index">2</span>Врач</>}>
          {!service ? <EmptyState>Сначала выберите услугу.</EmptyState> : doctors.length === 0 ? <EmptyState>Сейчас нет врачей, которые принимают по этой услуге.</EmptyState> : (
            <div className="choice-grid">
              {doctors.map((entry) => (
                <button key={entry.id} type="button" className={`choice choice--doctor ${doctorId === entry.id ? 'choice--active' : ''}`} aria-pressed={doctorId === entry.id} onClick={() => chooseDoctor(entry.id)}>
                  <span className="avatar" aria-hidden="true">{entry.initials}</span>
                  <span><strong>{entry.name}</strong><small>{entry.specialty} · стаж {entry.experienceYears} лет · ★ {entry.rating.toFixed(1)}</small></span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={<><span className="step-index">3</span>Дата</>}>
          {!doctor ? <EmptyState>Выберите врача, чтобы увидеть даты.</EmptyState> : (
            <div className="day-strip">
              {days.map((day) => {
                const key = toDateKey(day)
                return (
                  <button key={key} type="button" className={`day ${date === key ? 'day--active' : ''}`} aria-pressed={date === key} onClick={() => chooseDate(key)}>
                    <small>{weekdayFormat.format(day)}</small><strong>{day.getDate()}</strong><small>{shortDateFormat.format(day).replace(/^\d+\s*/, '')}</small>
                  </button>
                )
              })}
            </div>
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
          <div><dt>Врач</dt><dd>{doctor ? `${doctor.name}, ${doctor.specialty.toLowerCase()}` : '—'}</dd></div>
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
