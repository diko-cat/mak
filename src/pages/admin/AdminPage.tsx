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

const allTabs: (CabinetTab & { permission?: Permission })[] = [
  { to: '/admin', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/admin/appointments', label: 'Записи', icon: ClipboardList, permission: 'appointments:view-all' },
  { to: '/admin/doctors', label: 'Врачи', icon: Stethoscope, permission: 'doctors:manage' },
  { to: '/admin/schedule', label: 'Расписание', icon: CalendarClock, permission: 'schedule:manage' },
  { to: '/admin/services', label: 'Услуги и цены', icon: Tags, permission: 'services:manage' },
  { to: '/admin/access', label: 'Права доступа', icon: KeyRound },
]

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
