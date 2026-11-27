import { CalendarPlus, ClipboardList, FlaskConical, LayoutDashboard } from 'lucide-react'
import { Link, Route, Routes } from 'react-router-dom'
import { useSession } from '../../store/session'
import { CabinetLayout, type CabinetTab } from '../cabinet/CabinetLayout'
import { PatientAppointments } from './PatientAppointments'
import { PatientBooking } from './PatientBooking'
import { PatientOverview } from './PatientOverview'
import { PatientResults } from './PatientResults'
import { usePatientData } from './usePatientData'

const tabs: CabinetTab[] = [
  { to: '/patient', label: 'Обзор', icon: LayoutDashboard, end: true },
  { to: '/patient/appointments/new', label: 'Запись к врачу', icon: CalendarPlus },
  { to: '/patient/appointments', label: 'Мои записи', icon: ClipboardList, end: true },
  { to: '/patient/results', label: 'Результаты', icon: FlaskConical },
]

export function PatientCabinet() {
  const user = useSession()
  const patientId = user?.patientId
  const patient = usePatientData(patientId)

  return (
    <CabinetLayout eyebrow="КАБИНЕТ ПАЦИЕНТА" title={user?.name ?? 'Пациент'} subtitle="Записи, заключения врачей и результаты анализов в одном месте." tabs={tabs}>
      <p className="muted small">Демо-режим: данные хранятся в этом браузере и не синхронизируются между устройствами. Формы и уведомления не отправляются в клинику; демо-роли не заменяют настоящую защиту доступа.</p>
      {patient.error ? <p className="form-message form-message--error" role="alert">{patient.error}</p> : (
        <Routes>
          <Route index element={<PatientOverview patient={patient} />} />
          <Route path="appointments/new" element={patientId ? <PatientBooking patient={patient} patientId={patientId} /> : null} />
          <Route path="appointments" element={<PatientAppointments patient={patient} />} />
          <Route path="results" element={<PatientResults patient={patient} />} />
          <Route path="*" element={<section className="not-found"><div className="container"><p className="eyebrow">СТРАНИЦА НЕ НАЙДЕНА</p><h2>Раздел кабинета пациента не найден.</h2><Link className="button button--primary" to="/patient">К обзору</Link></div></section>} />
        </Routes>
      )}
    </CabinetLayout>
  )
}
