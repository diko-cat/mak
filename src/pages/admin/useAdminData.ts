import { useCallback, useEffect, useState } from 'react'
import { getAppointments, getCallRequests, getDoctors, getLabTests, getPatients, getServices } from '../../api'
import type { Appointment, CallRequest, Doctor, LabTest, Patient, Service } from '../../types'
import { errorMessage } from '../cabinet/format'

export interface AdminData {
  appointments: Appointment[]
  callRequests: CallRequest[]
  doctors: Doctor[]
  patients: Patient[]
  services: Service[]
  labTests: LabTest[]
}

/** Все данные клиники для администратора и функция перезагрузки после изменений. */
export function useAdminData() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [appointments, callRequests, doctors, patients, services, labTests] = await Promise.all([
        getAppointments(), getCallRequests(), getDoctors(), getPatients(), getServices(), getLabTests(),
      ])
      setData({ appointments, callRequests, doctors, patients, services, labTests })
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError, 'Не удалось загрузить данные панели.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const doctorOf = (id: string) => data?.doctors.find((doctor) => doctor.id === id)
  const patientOf = (id: string) => data?.patients.find((patient) => patient.id === id)
  const serviceOf = (id: string) => data?.services.find((service) => service.id === id)

  return { data, error, loading, reload, doctorOf, patientOf, serviceOf }
}

export type AdminState = ReturnType<typeof useAdminData>
