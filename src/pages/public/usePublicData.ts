import { useEffect, useState } from 'react'
import { getClinic, getDoctors, getServices } from '../../api'
import type { Clinic, Doctor, Service } from '../../types'

export interface PublicData {
  clinic: Clinic | null
  /** Только врачи, которые принимают записи (и услуги не из архива). */
  doctors: Doctor[]
  services: Service[]
  loaded: boolean
}

/** Данные клиники для публичных страниц. */
export function usePublicData(): PublicData {
  const [data, setData] = useState<PublicData>({ clinic: null, doctors: [], services: [], loaded: false })

  useEffect(() => {
    let active = true
    Promise.all([getClinic(), getDoctors(), getServices()]).then(([clinic, doctors, services]) => {
      if (active) setData({ clinic, doctors: doctors.filter((doctor) => doctor.active !== false), services: services.filter((service) => service.active !== false), loaded: true })
    })
    return () => { active = false }
  }, [])

  return data
}

export function countLabel(count: number, forms: [string, string, string]): string {
  const remainder100 = count % 100
  const remainder10 = count % 10
  const formIndex = remainder100 >= 11 && remainder100 <= 14 ? 2 : remainder10 === 1 ? 0 : remainder10 >= 2 && remainder10 <= 4 ? 1 : 2
  return `${count} ${forms[formIndex]}`
}

export const isPhysician = (doctor: Doctor) => doctor.profession === 'physician' || (!doctor.profession && doctor.specialty !== 'Лаборант')

export const orderNumber = (index: number) => String(index + 1).padStart(2, '0')
