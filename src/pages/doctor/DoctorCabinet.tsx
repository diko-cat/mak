import { CalendarDays, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getDoctors } from '../../api'
import { useSession } from '../../store/session'
import type { Doctor } from '../../types'
import { CabinetLayout, type CabinetTab } from '../cabinet/CabinetLayout'
import { DoctorPatients } from './DoctorPatients'
import { DoctorSchedule } from './DoctorSchedule'
import { useDoctorData } from './useDoctorData'

const tabs: CabinetTab[] = [
  { to: '/doctor', label: 'Расписание', icon: CalendarDays, end: true },
  { to: '/doctor/patients', label: 'Мои пациенты', icon: Users },
]

export function DoctorCabinet() {
  const user = useSession()
  const doctorId = user?.doctorId
  const doctor = useDoctorData(doctorId)
  const [profile, setProfile] = useState<Doctor | null>(null)

  useEffect(() => {
    if (!doctorId) return
    getDoctors().then((doctors) => setProfile(doctors.find((entry) => entry.id === doctorId) ?? null)).catch(() => setProfile(null))
  }, [doctorId])

  const subtitle = profile ? `${profile.specialty} · кабинет ${profile.room ?? '—'}` : 'Расписание приёмов и пациенты'

  return (
    <CabinetLayout eyebrow="КАБИНЕТ ВРАЧА" title={user?.name ?? 'Врач'} subtitle={subtitle} tabs={tabs}>
      {doctor.error ? <p className="form-message form-message--error" role="alert">{doctor.error}</p> : (
        <Routes>
          <Route index element={<DoctorSchedule doctor={doctor} />} />
          <Route path="patients" element={<DoctorPatients doctor={doctor} />} />
          <Route path="*" element={<Navigate to="/doctor" replace />} />
        </Routes>
      )}
    </CabinetLayout>
  )
}
