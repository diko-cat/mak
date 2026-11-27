import { useCallback, useEffect, useState } from 'react'
import { getAppointments, getConclusions, getDoctors, getLabTests, getServices } from '../../api'
import type { Appointment, Doctor, LabTest, MedicalConclusion, Service } from '../../types'
import { errorMessage } from '../cabinet/format'
import { useDemoDataRevision } from '../../store/demoData'

export interface PatientData {
  appointments: Appointment[]
  conclusions: MedicalConclusion[]
  labTests: LabTest[]
  doctors: Doctor[]
  services: Service[]
}

/** Загружает только данные текущего пациента. */
export function usePatientData(patientId: string | undefined) {
  const [data, setData] = useState<PatientData | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!patientId) {
      setError('В демо-аккаунте не найден профиль пациента.')
      return
    }
    try {
      const [appointments, conclusions, labTests, doctors, services] = await Promise.all([
        getAppointments({ patientId }),
        getConclusions({ patientId }),
        getLabTests(patientId),
        getDoctors(),
        getServices(),
      ])
      setData({ appointments, conclusions, labTests, doctors, services: services.filter((service) => service.active !== false) })
      setError('')
    } catch (loadError) {
      setError(errorMessage(loadError, 'Не удалось загрузить данные кабинета.'))
    }
  }, [patientId])

  // Перечитываем после любого изменения демо-данных, в том числе из другой вкладки.
  const revision = useDemoDataRevision()
  useEffect(() => { void reload() }, [reload, revision])

  const doctorOf = (id: string) => data?.doctors.find((doctor) => doctor.id === id)
  const serviceOf = (id: string) => data?.services.find((service) => service.id === id)

  return { patientId, data, error, reload, doctorOf, serviceOf }
}
