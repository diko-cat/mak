import { ArrowRight, PhoneCall } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoctorArrivals, updateCallRequestStatus } from '../../api'
import { intervalFor, SLOT_STEP_MINUTES, toMinutes } from '../../api/schedule'
import { fitsWorkingHours } from '../../api/schedule'
import { Button } from '../../components/ui'
import type { DoctorArrival } from '../../types'
import { EmptyState, LoadingNote, Panel, StatusPill } from '../cabinet/CabinetLayout'
import { errorMessage, formatDateTime, formatPrice, formatTime, isSameDay, isScheduled, toDateKey } from '../cabinet/format'
import type { AdminState } from './useAdminData'

export function AdminOverview({ admin }: { admin: AdminState }) {
  const { reload, patientOf, doctorOf, serviceOf } = admin
  const data = admin.data!
  const [error, setError] = useState('')
  const today = toDateKey(new Date())
  const [arrivalDate, setArrivalDate] = useState(today)
  const [arrivalResult, setArrivalResult] = useState<{ date: string; items: DoctorArrival[] } | null>(null)
  const [arrivalLoading, setArrivalLoading] = useState(false)
  const [arrivalError, setArrivalError] = useState('')
  const arrivals = arrivalResult?.date === arrivalDate ? arrivalResult.items : null
  const loadArrivals = useCallback(async () => {
    setArrivalLoading(true)
    setArrivalError('')
    try {
      const items = await getDoctorArrivals(arrivalDate)
      setArrivalResult({ date: arrivalDate, items })
    } catch (loadError) {
      setArrivalError(errorMessage(loadError, 'Не удалось загрузить отметки прибытия.'))
    } finally {
      setArrivalLoading(false)
    }
  }, [arrivalDate])

  useEffect(() => {
    void loadArrivals()
    const refreshOnDatabaseChange = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('sana-clinic.database.')) void loadArrivals()
    }
    window.addEventListener('storage', refreshOnDatabaseChange)
    return () => window.removeEventListener('storage', refreshOnDatabaseChange)
  }, [loadArrivals])

  const todayAppointments = data.appointments.filter((item) => isSameDay(item.startsAt, today) && item.status !== 'cancelled')
  const pending = data.appointments.filter((item) => item.status === 'requested')
  const needsTransfer = data.appointments.filter((item) => {
    if (!isScheduled(item) || new Date(item.startsAt).getTime() <= Date.now()) return false
    const doctor = doctorOf(item.doctorId)
    return Boolean(doctor && (doctor.active === false || !fitsWorkingHours(doctor, new Date(item.startsAt), serviceOf(item.serviceId)?.durationMinutes ?? 30)))
  })
  const newRequests = data.callRequests.filter((item) => item.status === 'new')
  const activeDoctors = data.doctors.filter((doctor) => doctor.active !== false && intervalFor(doctor, today) !== null)
  const arrivalDoctors = data.doctors.filter((doctor) => doctor.profession !== 'clinical-specialist')
  const arrivalByDoctorId = new Map((arrivals ?? []).map((item) => [item.doctorId, item]))
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

      <Panel title="Прибытие врачей" className="cabinet-grid__wide">
        <label className="form-field cabinet-field admin-arrival-date">
          <span>Дата</span>
          <input type="date" value={arrivalDate} onChange={(event) => setArrivalDate(event.target.value)} />
        </label>
        {arrivalError && <div className="admin-arrival__error"><p className="form-message form-message--error" role="alert">{arrivalError}</p><Button type="button" variant="secondary" className="button--compact" onClick={() => void loadArrivals()}>Повторить</Button></div>}
        {arrivalLoading && arrivals && <p className="muted small" role="status">Обновляем отметки прибытия…</p>}
        {arrivalLoading && !arrivals ? <LoadingNote>Загружаем отметки прибытия…</LoadingNote> : arrivals && arrivalDoctors.length === 0 ? <EmptyState>В списке нет врачей.</EmptyState> : arrivals && (
          <ul className="admin-list admin-arrival-list">
            {arrivalDoctors.map((doctor) => {
              const interval = intervalFor(doctor, arrivalDate)
              const arrival = arrivalByDoctorId.get(doctor.id)
              return <li key={doctor.id} className="admin-arrival">
                <span className="admin-arrival__name"><strong>{doctor.name}</strong><small className="muted">{doctor.specialty}</small></span>
                <span className="admin-arrival__shift muted">{interval ? `Смена ${interval.start}–${interval.end}` : 'Смена не задана'}</span>
                <span className={`admin-badge ${arrival ? '' : 'admin-badge--off'}`}>{arrival ? 'На месте' : 'Нет отметки'}</span>
                <span className="admin-arrival__time muted">{arrival ? `Прибыл(а) в ${formatTime(arrival.arrivedAt)}` : 'Время не указано'}</span>
              </li>
            })}
          </ul>
        )}
      </Panel>

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
