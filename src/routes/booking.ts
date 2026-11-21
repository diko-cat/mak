/**
 * Договорённость о ссылке на форму записи (публичные страницы ↔ кабинет пациента):
 * /patient/appointments/new?doctor=<Doctor.id>&service=<Service.id>, оба параметра необязательны.
 */
export const BOOKING_PATH = '/patient/appointments/new'

export interface BookingParams {
  doctorId?: string
  serviceId?: string
}

export function bookingSearch({ doctorId, serviceId }: BookingParams): string {
  const params = new URLSearchParams()
  if (doctorId) params.set('doctor', doctorId)
  if (serviceId) params.set('service', serviceId)
  const search = params.toString()
  return search ? `?${search}` : ''
}

/** Для формы записи: прочитать выбор из адреса. Проверять, что врач и услуга существуют, — в форме. */
export function readBookingParams(searchParams: URLSearchParams): BookingParams {
  return {
    doctorId: searchParams.get('doctor') ?? undefined,
    serviceId: searchParams.get('service') ?? undefined,
  }
}
