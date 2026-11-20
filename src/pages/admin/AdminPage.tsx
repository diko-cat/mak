import { LayoutDashboard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAppointments, getCallRequests, getDoctors, getPatients, getServices } from '../../api'
import { useSession } from '../../store/session'
import type { Appointment, CallRequest, Doctor, Patient, Service } from '../../types'
import { CabinetLayout, EmptyState, LoadingNote, Panel, StatusPill, type CabinetTab } from '../cabinet/CabinetLayout'
import { errorMessage, formatDateTime, formatPrice, isSameDay, toDateKey } from '../cabinet/format'

const tabs: CabinetTab[] = [{ to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true }]

/** Слотов приёма у врача в день: 09:00–17:00 с шагом 30 минут. */
const SLOTS_PER_DAY = 17

interface AdminData {
  appointments: Appointment[]
  callRequests: CallRequest[]
  doctors: Doctor[]
  patients: Patient[]
  services: Service[]
}

export function AdminPage() {
  const user = useSession()
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getAppointments(), getCallRequests(), getDoctors(), getPatients(), getServices()])
      .then(([appointments, callRequests, doctors, patients, services]) => setData({ appointments, callRequests, doctors, patients, services }))
      .catch((loadError) => setError(errorMessage(loadError, 'Не удалось загрузить данные панели.')))
  }, [])

  return (
    <CabinetLayout eyebrow="КАБИНЕТ АДМИНИСТРАТОРА" title={user?.name ?? 'Администратор'} subtitle="Записи, заявки и загрузка врачей на сегодня" tabs={tabs}>
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : data ? <AdminOverview data={data} /> : <LoadingNote />}
    </CabinetLayout>
  )
}

function AdminOverview({ data }: { data: AdminData }) {
  const today = toDateKey(new Date())
  const todayAppointments = data.appointments.filter((item) => isSameDay(item.startsAt, today) && item.status !== 'cancelled')
  const newRequests = data.callRequests.filter((item) => item.status === 'new')
  const activeDoctors = data.doctors.filter((doctor) => doctor.active !== false)
  const revenue = todayAppointments.reduce((sum, item) => sum + (data.services.find((service) => service.id === item.serviceId)?.price ?? 0), 0)
  const recent = [...data.appointments].sort((left, right) => right.startsAt.localeCompare(left.startsAt)).slice(0, 5)
  const patientName = (id: string) => data.patients.find((patient) => patient.id === id)?.name ?? 'Пациент'
  const doctorName = (id: string) => data.doctors.find((doctor) => doctor.id === id)?.name ?? 'Врач'

  const stats: [string, string | number][] = [
    ['Записей сегодня', todayAppointments.length],
    ['Новых заявок', newRequests.length],
    ['Врачей принимает', activeDoctors.length],
    ['Ожидаемая выручка', formatPrice(revenue)],
  ]

  return (
    <div className="cabinet-grid">
      <div className="admin-stats cabinet-grid__wide">
        {stats.map(([label, value]) => <div key={label} className="admin-stat"><small>{label}</small><strong>{value}</strong></div>)}
      </div>

      <Panel title="Загрузка врачей сегодня" className="cabinet-grid__wide">
        <ul className="admin-list">
          {activeDoctors.map((doctor) => {
            const count = todayAppointments.filter((item) => item.doctorId === doctor.id).length
            return (
              <li key={doctor.id} className="admin-load">
                <span><strong>{doctor.name}</strong><small className="muted"> · {doctor.specialty}</small></span>
                <span className="muted">{count} / {SLOTS_PER_DAY}</span>
                <div className="admin-load__bar" role="progressbar" aria-label={`Загрузка: ${doctor.name}`} aria-valuemin={0} aria-valuemax={SLOTS_PER_DAY} aria-valuenow={count}>
                  <div style={{ width: `${Math.min(100, count / SLOTS_PER_DAY * 100)}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel title={`Новые заявки на звонок · ${newRequests.length}`}>
        {newRequests.length === 0 ? <EmptyState>Новых заявок нет.</EmptyState> : (
          <ul className="history">
            {newRequests.map((request) => (
              <li key={request.id}><strong>{request.name} · {request.phone}</strong><span className="muted">{request.preferredTime ?? 'Время не указано'}</span></li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Последние записи">
        {recent.length === 0 ? <EmptyState>Записей пока нет.</EmptyState> : (
          <ul className="admin-list">
            {recent.map((item) => (
              <li key={item.id} className="admin-row">
                <span><strong>{patientName(item.patientId)}</strong><small className="muted">{formatDateTime(item.startsAt)} · {doctorName(item.doctorId)}</small></span>
                <StatusPill status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
