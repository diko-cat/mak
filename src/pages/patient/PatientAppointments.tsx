import { useState } from 'react'
import { CalendarPlus, Clock3, DoorOpen, Ticket } from 'lucide-react'
import { Link } from 'react-router-dom'
import { updateAppointmentStatus } from '../../api'
import { Button, buttonStyles } from '../../components/ui'
import type { Appointment } from '../../types'
import { EmptyState, LoadingNote, Panel, StatusPill } from '../cabinet/CabinetLayout'
import { errorMessage, formatDate, formatDateTime, formatPrice, formatTime, isScheduled } from '../cabinet/format'
import type { usePatientData } from './usePatientData'

const actorLabels = { patient: 'пациент', doctor: 'врач', admin: 'администратор' } as const

type Group = 'scheduled' | 'completed' | 'cancelled' | 'no-show'
const groups: { id: Group; label: string; empty: string }[] = [
  { id: 'scheduled', label: 'Запланированные', empty: 'Запланированных приёмов нет.' },
  { id: 'completed', label: 'Завершённые', empty: 'Завершённых приёмов пока нет.' },
  { id: 'cancelled', label: 'Отменённые', empty: 'Отменённых записей нет.' },
  { id: 'no-show', label: 'Не явился', empty: 'Записей с неявкой нет.' },
]

export function PatientAppointments({ patient }: { patient: ReturnType<typeof usePatientData> }) {
  const { data, reload, doctorOf, serviceOf } = patient
  const [group, setGroup] = useState<Group>('scheduled')
  const [confirmingId, setConfirmingId] = useState('')
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  if (!data) return <LoadingNote />

  const byGroup: Record<Group, Appointment[]> = {
    scheduled: data.appointments.filter(isScheduled),
    completed: data.appointments.filter((item) => item.status === 'completed').reverse(),
    cancelled: data.appointments.filter((item) => item.status === 'cancelled').reverse(),
    'no-show': data.appointments.filter((item) => item.status === 'no-show').reverse(),
  }

  async function cancel(id: string) {
    setBusyId(id)
    setMessage(null)
    try {
      await updateAppointmentStatus(id, 'cancelled')
      await reload()
      setMessage({ tone: 'success', text: 'Запись отменена. Время освободилось для других пациентов.' })
    } catch (cancelError) {
      setMessage({ tone: 'error', text: errorMessage(cancelError, 'Не удалось отменить запись.') })
    } finally {
      setBusyId('')
      setConfirmingId('')
    }
  }

  return (
    <Panel
      title="Мои записи"
      action={<Link className={buttonStyles('primary', 'button--compact')} to="/patient/appointments/new"><CalendarPlus size={15} />Новая запись</Link>}
    >
      <div className="segmented" role="tablist" aria-label="Статус записей">
        {groups.map((entry) => (
          <button key={entry.id} type="button" role="tab" aria-selected={group === entry.id} className={`segmented__item ${group === entry.id ? 'segmented__item--active' : ''}`} onClick={() => { setGroup(entry.id); setConfirmingId('') }}>
            {entry.label}<span className="segmented__count">{byGroup[entry.id].length}</span>
          </button>
        ))}
      </div>

      {message && <p className={`form-message form-message--${message.tone}`} role="status">{message.text}</p>}

      {byGroup[group].length === 0 ? <EmptyState>{groups.find((entry) => entry.id === group)?.empty}</EmptyState> : (
        <ul className="appointment-list">
          {byGroup[group].map((appointment) => {
            const doctor = doctorOf(appointment.doctorId)
            const service = serviceOf(appointment.serviceId)
            const serviceName = appointment.serviceName ?? service?.name ?? 'Услуга недоступна'
            const price = appointment.price ?? service?.price
            const conclusion = data.conclusions.find((entry) => entry.appointmentId === appointment.id)
            const canCancel = isScheduled(appointment) && new Date(appointment.startsAt).getTime() > Date.now()
            return (
              <li key={appointment.id} className="appointment-row">
                <div className="appointment-row__date">
                  <strong>{formatDate(appointment.startsAt)}</strong>
                  <span><Clock3 size={13} aria-hidden="true" />{formatTime(appointment.startsAt)}</span>
                </div>
                <div className="appointment-row__body">
                  <strong>{serviceName}</strong>
                  <span>{doctor?.name ?? 'Врач'}{doctor?.specialty ? ` · ${doctor.specialty}` : ''}</span>
                  {appointment.note && <span className="muted">Причина: {appointment.note}</span>}
                  {appointment.status === 'requested' && <span className="appointment-row__status-note">Демо-запись ожидает подтверждения. Клиника не получила уведомление.</span>}
                  {appointment.status === 'confirmed' && <span className="appointment-row__status-note">Запись подтверждена в демо-версии.</span>}
                  {group === 'completed' && conclusion && <Link className="text-link" to={`/patient/results#${conclusion.id}`}>Смотреть заключение</Link>}
                  {appointment.rescheduledFrom && <span className="muted small">Перенесено: {formatDate(appointment.rescheduledFrom)} {formatTime(appointment.rescheduledFrom)} → {formatDate(appointment.startsAt)} {formatTime(appointment.startsAt)}</span>}
                  {appointment.rescheduledBy && <span className="muted small">Кто перенёс: {actorLabels[appointment.rescheduledBy]}</span>}
                  {appointment.rescheduledAt && <span className="muted small">Время переноса: {formatDateTime(appointment.rescheduledAt)}</span>}
                  {appointment.status === 'cancelled' && appointment.cancelledBy && <span className="muted small">Кто отменил: {actorLabels[appointment.cancelledBy]}</span>}
                  {appointment.status === 'cancelled' && appointment.cancellationReason && <span className="muted small">Причина отмены: {appointment.cancellationReason}</span>}
                  {appointment.status === 'no-show' && appointment.noShowMarkedBy && <span className="muted small">Неявку отметил: {actorLabels[appointment.noShowMarkedBy]}</span>}
                  {appointment.status === 'no-show' && appointment.noShowReason && <span className="muted small">Причина неявки: {appointment.noShowReason}</span>}
                  <span className="appointment-row__chips">
                    {appointment.ticketNumber && <span><Ticket size={13} aria-hidden="true" />{appointment.ticketNumber}</span>}
                    {doctor?.room && <span><DoorOpen size={13} aria-hidden="true" />каб. {doctor.room}</span>}
                    {price !== undefined && <span>{formatPrice(price)}</span>}
                  </span>
                </div>
                <div className="appointment-row__side">
                  <StatusPill status={appointment.status} />
                  {appointment.status === 'cancelled' && appointment.cancelledBy === 'admin' && <Link className="text-link" to="/patient/appointments/new">Записаться снова</Link>}
                  {canCancel && confirmingId !== appointment.id && (
                    <Button variant="secondary" className="button--compact" onClick={() => { setConfirmingId(appointment.id); setMessage(null) }}>Отменить</Button>
                  )}
                </div>
                {confirmingId === appointment.id && (
                  <div className="confirm-box" role="alertdialog" aria-label="Подтверждение отмены">
                    <p>Отменить запись на {formatDate(appointment.startsAt)} в {formatTime(appointment.startsAt)}? Время освободится. Если передумаете, запишитесь снова.</p>
                    <div className="row-actions">
                      <Button className="button--danger button--compact" disabled={busyId === appointment.id} onClick={() => cancel(appointment.id)}>{busyId === appointment.id ? 'Отменяем…' : 'Да, отменить'}</Button>
                      <Button variant="secondary" className="button--compact" onClick={() => setConfirmingId('')}>Оставить запись</Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
