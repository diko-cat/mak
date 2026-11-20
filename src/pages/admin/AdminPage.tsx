import { CalendarClock, ClipboardList, KeyRound, LayoutDashboard, Stethoscope, Tags } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { hasPermission } from '../../auth/permissions'
import { useSession } from '../../store/session'
import type { Permission } from '../../types'
import { CabinetLayout, LoadingNote, type CabinetTab } from '../cabinet/CabinetLayout'
import { AdminAccess } from './AdminAccess'
import { AdminAppointments } from './AdminAppointments'
import { AdminDoctors } from './AdminDoctors'
import { AdminOverview } from './AdminOverview'
import { AdminSchedule } from './AdminSchedule'
import { AdminServices } from './AdminServices'
import { useAdminData } from './useAdminData'
import './admin.css'

<<<<<<< HEAD
const tabs: CabinetTab[] = [{ to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true }]

/** Полчасовые слоты приёма: 09:00–17:00. */
const SLOTS_PER_DAY = 16

interface AdminData {
  appointments: Appointment[]
  callRequests: CallRequest[]
  doctors: Doctor[]
  patients: Patient[]
  services: Service[]
}
=======
const allTabs: (CabinetTab & { permission?: Permission })[] = [
  { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/admin/appointments', label: 'Записи', icon: ClipboardList, permission: 'appointments:view-all' },
  { to: '/admin/doctors', label: 'Врачи', icon: Stethoscope, permission: 'doctors:manage' },
  { to: '/admin/schedule', label: 'Расписание', icon: CalendarClock, permission: 'schedule:manage' },
  { to: '/admin/services', label: 'Услуги и цены', icon: Tags, permission: 'services:manage' },
  { to: '/admin/access', label: 'Права доступа', icon: KeyRound },
]
>>>>>>> 5cff3fa9cf2e135dcbf1bcbb30ce81446945c742

export function AdminPage() {
  const user = useSession()
  const admin = useAdminData()
  const tabs = allTabs.filter((tab) => !tab.permission || hasPermission(user, tab.permission))
  const allowed = (permission: Permission) => hasPermission(user, permission)

  return (
    <CabinetLayout eyebrow="КАБИНЕТ АДМИНИСТРАТОРА" title={user?.name ?? 'Администратор'} subtitle="Записи, врачи, услуги и расписание клиники" tabs={tabs}>
      {admin.error ? <p className="form-message form-message--error" role="alert">{admin.error}</p> : !admin.data ? <LoadingNote /> : (
        <Routes>
          <Route index element={<AdminOverview admin={admin} />} />
          {allowed('appointments:view-all') && <Route path="appointments" element={<AdminAppointments admin={admin} />} />}
          {allowed('doctors:manage') && <Route path="doctors" element={<AdminDoctors admin={admin} />} />}
          {allowed('schedule:manage') && <Route path="schedule" element={<AdminSchedule admin={admin} />} />}
          {allowed('services:manage') && <Route path="services" element={<AdminServices admin={admin} />} />}
          <Route path="access" element={<AdminAccess />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      )}
    </CabinetLayout>
  )
}
<<<<<<< HEAD

function AdminOverview({ data }: { data: AdminData }) {
  const today = toDateKey(new Date())
  const todayAppointments = data.appointments.filter((item) => isSameDay(item.startsAt, today) && item.status !== 'cancelled')
  const newRequests = data.callRequests.filter((item) => item.status === 'new')
  const activeSpecialists = data.doctors.filter((doctor) => doctor.active !== false)
  const revenue = todayAppointments.reduce((sum, item) => sum + (data.services.find((service) => service.id === item.serviceId)?.price ?? 0), 0)
  const recent = [...data.appointments].sort((left, right) => right.startsAt.localeCompare(left.startsAt)).slice(0, 5)
  const patientName = (id: string) => data.patients.find((patient) => patient.id === id)?.name ?? 'Пациент'
  const doctorName = (id: string) => data.doctors.find((doctor) => doctor.id === id)?.name ?? 'Врач'

  const stats: [string, string | number][] = [
    ['Записей сегодня', todayAppointments.length],
    ['Новых заявок', newRequests.length],
    ['Специалистов принимает', activeSpecialists.length],
    ['Ожидаемая выручка', formatPrice(revenue)],
  ]

  return (
    <div className="cabinet-grid">
      <div className="admin-stats cabinet-grid__wide">
        {stats.map(([label, value]) => <div key={label} className="admin-stat"><small>{label}</small><strong>{value}</strong></div>)}
      </div>

      <Panel title="Загрузка специалистов сегодня" className="cabinet-grid__wide">
        <ul className="admin-list">
          {activeSpecialists.map((doctor) => {
            const count = todayAppointments
              .filter((item) => item.doctorId === doctor.id)
              .reduce((total, item) => {
                const duration = data.services.find((service) => service.id === item.serviceId)?.durationMinutes ?? 30
                return total + Math.ceil(duration / 30)
              }, 0)
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
=======
>>>>>>> 5cff3fa9cf2e135dcbf1bcbb30ce81446945c742
