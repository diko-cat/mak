import { useState, type FormEvent } from 'react'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { completeAppointment } from '../../api'
import { Button } from '../../components/ui'
import type { Appointment } from '../../types'
import { EmptyState, LoadingNote, Panel, StatusPill } from '../cabinet/CabinetLayout'
import { addDays, ageFrom, errorMessage, formatDate, formatTime, isSameDay, isScheduled, longDayFormat, pluralYears, toDateKey } from '../cabinet/format'
import type { useDoctorData } from './useDoctorData'

const MIN_DIAGNOSIS_LENGTH = 10
const dayOptions = [
  { offset: 0, label: 'Сегодня' },
  { offset: 1, label: 'Завтра' },
  { offset: 2, label: 'Послезавтра' },
]

export function DoctorSchedule({ doctor }: { doctor: ReturnType<typeof useDoctorData> }) {
  const { data, patientOf, serviceOf } = doctor
  const [offset, setOffset] = useState(0)
  const [selectedId, setSelectedId] = useState('')

  if (!data) return <LoadingNote />

  const day = addDays(offset)
  const dayKey = toDateKey(day)
  const dayAppointments = data.appointments.filter((item) => isSameDay(item.startsAt, dayKey))
  const selected = dayAppointments.find((item) => item.id === selectedId) ?? dayAppointments.find(isScheduled) ?? dayAppointments[0]

  return (
    <div className="schedule">
      <Panel title={longDayFormat.format(day)} className="schedule__list">
        <div className="segmented" role="tablist" aria-label="День расписания">
          {dayOptions.map((option) => (
            <button key={option.offset} type="button" role="tab" aria-selected={offset === option.offset} className={`segmented__item ${offset === option.offset ? 'segmented__item--active' : ''}`} onClick={() => { setOffset(option.offset); setSelectedId('') }}>
              {option.label}
            </button>
          ))}
        </div>
        {dayAppointments.length === 0 ? <EmptyState>На этот день приёмов нет.</EmptyState> : (
          <ul className="schedule-list">
            {dayAppointments.map((appointment) => {
              const patient = patientOf(appointment.patientId)
              return (
                <li key={appointment.id}>
                  <button type="button" className={`schedule-item ${selected?.id === appointment.id ? 'schedule-item--active' : ''} ${appointment.status === 'cancelled' ? 'schedule-item--cancelled' : ''}`} aria-pressed={selected?.id === appointment.id} onClick={() => setSelectedId(appointment.id)}>
                    <span className="schedule-item__time"><Clock3 size={13} aria-hidden="true" />{formatTime(appointment.startsAt)}</span>
                    <span className="schedule-item__body"><strong>{patient?.name ?? 'Пациент'}</strong><small>{serviceOf(appointment.serviceId)?.name}</small></span>
                    <StatusPill status={appointment.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {selected ? <AppointmentDetails key={selected.id} appointment={selected} doctor={doctor} /> : <Panel><EmptyState>Выберите приём, чтобы увидеть карточку пациента.</EmptyState></Panel>}
    </div>
  )
}

function AppointmentDetails({ appointment, doctor }: { appointment: Appointment; doctor: ReturnType<typeof useDoctorData> }) {
  const { data, reload, patientOf, serviceOf } = doctor
  const [diagnosis, setDiagnosis] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  const patient = patientOf(appointment.patientId)
  const service = serviceOf(appointment.serviceId)
  const conclusions = (data?.conclusions ?? []).filter((item) => item.patientId === appointment.patientId)
  const ownConclusion = conclusions.find((item) => item.appointmentId === appointment.id)
  const pastConclusions = conclusions.filter((item) => item.appointmentId !== appointment.id)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (diagnosis.trim().length < MIN_DIAGNOSIS_LENGTH) {
      setError(`Заключение должно содержать минимум ${MIN_DIAGNOSIS_LENGTH} символов.`)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await completeAppointment(appointment.id, { diagnosis, recommendations })
      setJustCompleted(true)
      await reload()
    } catch (completeError) {
      setError(errorMessage(completeError, 'Не удалось завершить приём.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Panel className="schedule__details" title="Карточка приёма" action={<StatusPill status={appointment.status} />}>
      <div className="patient-card">
        <span className="avatar avatar--large" aria-hidden="true">{patient?.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
        <div>
          <h3>{patient?.name ?? 'Пациент'}</h3>
          <dl className="facts">
            <div><dt>Возраст</dt><dd>{patient ? pluralYears(ageFrom(patient.birthDate)) : '—'}</dd></div>
            <div><dt>Карта</dt><dd>{patient?.cardNumber ?? '—'}</dd></div>
            <div><dt>Время</dt><dd>{formatTime(appointment.startsAt)}</dd></div>
            <div><dt>Талон</dt><dd>{appointment.ticketNumber ?? '—'}</dd></div>
          </dl>
        </div>
      </div>

      <div className="detail-block">
        <p className="detail-block__label">Услуга</p>
        <p>{service?.name ?? '—'}</p>
        <p className="detail-block__label">Причина обращения</p>
        <p>{appointment.note || 'Не указана'}</p>
      </div>

      <div className="detail-block">
        <p className="detail-block__label">Прошлые заключения</p>
        {pastConclusions.length === 0 ? <p className="muted">Ранее заключений не было.</p> : (
          <ul className="history">
            {pastConclusions.map((item) => (
              <li key={item.id}><span className="muted">{formatDate(item.createdAt)}</span><strong>{item.diagnosis}</strong>{item.recommendations && <span>{item.recommendations}</span>}</li>
            ))}
          </ul>
        )}
      </div>

      {appointment.status === 'completed' ? (
        <div className="completed-box">
          <p className="completed-box__title"><CheckCircle2 size={16} aria-hidden="true" />{justCompleted ? 'Приём завершён. Заключение отправлено в кабинет пациента.' : 'Приём завершён'}</p>
          {ownConclusion && <><strong>{ownConclusion.diagnosis}</strong>{ownConclusion.recommendations && <p>Назначения: {ownConclusion.recommendations}</p>}</>}
        </div>
      ) : appointment.status === 'cancelled' ? (
        <p className="muted">Пациент отменил запись.</p>
      ) : (
        <form className="conclusion-form" onSubmit={submit} noValidate>
          <label className="form-field cabinet-field">
            <span>Заключение <small>минимум {MIN_DIAGNOSIS_LENGTH} символов</small></span>
            <textarea rows={3} value={diagnosis} aria-invalid={Boolean(error)} aria-describedby={error ? 'conclusion-error' : undefined} onChange={(event) => { setDiagnosis(event.target.value); if (error) setError('') }} placeholder="Диагноз и выводы по осмотру" />
          </label>
          <label className="form-field cabinet-field">
            <span>Назначения</span>
            <textarea rows={3} value={recommendations} onChange={(event) => setRecommendations(event.target.value)} placeholder="Препараты, анализы, рекомендации, повторный приём" />
          </label>
          <div className="conclusion-form__foot">
            <span className="muted small">{diagnosis.trim().length} / {MIN_DIAGNOSIS_LENGTH}</span>
            <Button type="submit" disabled={submitting}>{submitting ? 'Сохраняем…' : 'Завершить приём'}</Button>
          </div>
          {error && <p id="conclusion-error" className="form-message form-message--error" role="alert">{error}</p>}
        </form>
      )}
    </Panel>
  )
}
