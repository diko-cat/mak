import { ArrowRight, PhoneCall } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { updateCallRequestStatus } from '../../api'
import { intervalFor, SLOT_STEP_MINUTES, toMinutes } from '../../api/schedule'
import { fitsWorkingHours } from '../../api/schedule'
import { Button } from '../../components/ui'
import { EmptyState, Panel, StatusPill } from '../cabinet/CabinetLayout'
import { errorMessage, formatDateTime, formatPrice, isSameDay, isScheduled, toDateKey } from '../cabinet/format'
import type { AdminState } from './useAdminData'

export function AdminOverview({ admin }: { admin: AdminState }) {
  const { reload, patientOf, doctorOf, serviceOf } = admin
  const data = admin.data!
  const [error, setError] = useState('')
  const today = toDateKey(new Date())
  const todayAppointments = data.appointments.filter((item) => isSameDay(item.startsAt, today) && item.status !== 'cancelled')
  const pending = data.appointments.filter((item) => item.status === 'requested')
  const needsTransfer = data.appointments.filter((item) => {
    if (!isScheduled(item) || new Date(item.startsAt).getTime() <= Date.now()) return false
    const doctor = doctorOf(item.doctorId)
    return Boolean(doctor && (doctor.active === false || !fitsWorkingHours(doctor, new Date(item.startsAt), serviceOf(item.serviceId)?.durationMinutes ?? 30)))
  })
  const newRequests = data.callRequests.filter((item) => item.status === 'new')
  const activeDoctors = data.doctors.filter((doctor) => doctor.active !== false && intervalFor(doctor, today) !== null)
  const revenue = todayAppointments.reduce((sum, item) => sum + (serviceOf(item.serviceId)?.price ?? 0), 0)
  const upcoming = data.appointments.filter((item) => isScheduled(item) && new Date(item.startsAt).getTime() > Date.now()).slice(0, 5)

  const stats: [string, string | number][] = [
    ['Записей сегодня', todayAppointments.length],
    ['Ждут подтверждения', pending.length],
    ['Требуют переноса', needsTransfer.length],
    ['Врачей принимает', activeDoctors.length],
    ['Ожидаемая выручка', formatPrice(revenue)],
  ]

  async function markContacted(id: string) {
    try {
      await updateCallRequestStatus(id, 'contacted')
      await reload()
    } catch (markError) {
      setError(errorMessage(markError, 'Не удалось обновить заявку.'))
    }
  }

  return (
    <div className="cabinet-grid">
      <div className="admin-stats cabinet-grid__wide">
        {stats.map(([label, value]) => <div key={label} className="admin-stat"><small>{label}</small><strong>{value}</strong></div>)}
      </div>

      {error && <p className="form-message form-message--error cabinet-grid__wide" role="alert">{error}</p>}

      {needsTransfer.length > 0 && <Panel title={`Изменения расписания · ${needsTransfer.length}`}><Link className="text-link" to="/admin/appointments?status=requires-transfer">Открыть записи, требующие переноса <ArrowRight size={13} /></Link></Panel>}

      <Panel title="Загрузка врачей сегодня" className="cabinet-grid__wide">
        <ul className="admin-list">
          {activeDoctors.map((doctor) => {
            const interval = intervalFor(doctor, today)
            const capacity = interval ? Math.floor((toMinutes(interval.end) - toMinutes(interval.start)) / SLOT_STEP_MINUTES) : 0
            const count = todayAppointments.filter((item) => item.doctorId === doctor.id).length
            return (
              <li key={doctor.id} className="admin-load">
                <span className="admin-load__name"><strong>{doctor.name}</strong><small className="muted"> · {doctor.specialty}</small></span>
                <span className="muted">{interval ? `${count} / ${capacity}` : 'Выходной'}</span>
                <div className="admin-load__bar" role="progressbar" aria-label={`Загрузка: ${doctor.name}`} aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={count}>
                  <div style={{ width: `${capacity ? Math.min(100, count / capacity * 100) : 0}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel title={`Заявки на звонок · ${newRequests.length}`}>
        {newRequests.length === 0 ? <EmptyState>Новых заявок нет.</EmptyState> : (
          <ul className="admin-list">
            {newRequests.map((request) => (
              <li key={request.id} className="admin-row">
                <span><strong>{request.name}</strong><a className="muted" href={`tel:${request.phone.replace(/[^\d+]/g, '')}`}>{request.phone}</a><small className="muted">{request.preferredTime ?? 'Время не указано'}</small></span>
                <Button variant="secondary" className="button--compact" onClick={() => void markContacted(request.id)}><PhoneCall size={14} aria-hidden="true" />Связались</Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Ближайшие приёмы" action={<Link className="text-link" to="/admin/appointments">Все записи <ArrowRight size={13} /></Link>}>
        {upcoming.length === 0 ? <EmptyState>Запланированных приёмов нет.</EmptyState> : (
          <ul className="admin-list">
            {upcoming.map((item) => (
              <li key={item.id} className="admin-row">
                <span><strong>{patientOf(item.patientId)?.name ?? 'Пациент'}</strong><small className="muted">{formatDateTime(item.startsAt)} · {doctorOf(item.doctorId)?.name ?? 'Врач'}</small></span>
                <StatusPill status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
