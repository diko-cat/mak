import { useCallback, useEffect, useState } from 'react'
import { getAppointments, getCallRequests, getDoctors, getPatients, getServices } from '../../api'
import type { Appointment, CallRequest, Doctor, Patient, Service } from '../../types'
import { errorMessage } from '../cabinet/format'

export interface AdminData {
  appointments: Appointment[]
  callRequests: CallRequest[]
  doctors: Doctor[]
  patients: Patient[]
  services: Service[]
}

/** Все данные клиники для администратора и функция перезагрузки после изменений. */
export function useAdminData() {
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      const [appointments, callRequests, doctors, patients, services] = await Promise.all([
        getAppointments(), getCallRequests(), getDoctors(), getPatients(), getServices(),
      ])
      setData({ appointments, callRequests, doctors, patients, services })
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError, 'Не удалось загрузить данные панели.'))
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const doctorOf = (id: string) => data?.doctors.find((doctor) => doctor.id === id)
  const patientOf = (id: string) => data?.patients.find((patient) => patient.id === id)
  const serviceOf = (id: string) => data?.services.find((service) => service.id === id)

  return { data, error, reload, doctorOf, patientOf, serviceOf }
}

export type AdminState = ReturnType<typeof useAdminData>
