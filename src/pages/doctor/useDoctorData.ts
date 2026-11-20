import { useCallback, useEffect, useState } from 'react'
import { getAppointments, getConclusions, getPatients, getServices } from '../../api'
import type { Appointment, MedicalConclusion, Patient, Service } from '../../types'
import { errorMessage } from '../cabinet/format'

export interface DoctorData {
  appointments: Appointment[]
  conclusions: MedicalConclusion[]
  /** Только пациенты, у которых есть запись к этому врачу. */
  patients: Patient[]
  services: Service[]
}

/** Врач получает только свои записи, свои заключения и своих пациентов. */
export function useDoctorData(doctorId: string | undefined) {
  const [data, setData] = useState<DoctorData | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!doctorId) {
      setError('В демо-аккаунте не найден профиль врача.')
      return
    }
    try {
      const [appointments, conclusions, allPatients, services] = await Promise.all([
        getAppointments({ doctorId }),
        getConclusions({ doctorId }),
        getPatients(),
        getServices(),
      ])
      const ownPatientIds = new Set(appointments.map((appointment) => appointment.patientId))
      setData({ appointments, conclusions, patients: allPatients.filter((patient) => ownPatientIds.has(patient.id)), services })
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError, 'Не удалось загрузить данные кабинета.'))
    }
  }, [doctorId])

  useEffect(() => { void reload() }, [reload])

  const patientOf = (id: string) => data?.patients.find((patient) => patient.id === id)
  const serviceOf = (id: string) => data?.services.find((service) => service.id === id)

  return { data, error, reload, patientOf, serviceOf }
}
