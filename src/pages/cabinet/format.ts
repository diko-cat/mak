import type { Appointment, AppointmentStatus, LabIndicator } from '../../types'

export const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
export const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
export const shortDateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
export const weekdayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })
export const longDayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
const priceFormat = new Intl.NumberFormat('ru-RU')

export const formatPrice = (price: number) => `${priceFormat.format(price)} ₸`
export const formatTime = (iso: string) => timeFormat.format(new Date(iso))
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))
export const formatDateTime = (iso: string) => `${dateFormat.format(new Date(iso))}, ${timeFormat.format(new Date(iso))}`

/** YYYY-MM-DD в локальном времени. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addDays(days: number, from = new Date()): Date {
  const value = new Date(from)
  value.setDate(value.getDate() + days)
  value.setHours(0, 0, 0, 0)
  return value
}

export const isSameDay = (iso: string, dateKey: string) => toDateKey(new Date(iso)) === dateKey

export function ageFrom(birthDate: string, now = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00`)
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age
}

export function pluralYears(age: number): string {
  const mod10 = age % 10
  const mod100 = age % 100
  if (mod10 === 1 && mod100 !== 11) return `${age} год`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${age} года`
  return `${age} лет`
}

/** Запланированный приём: ещё не завершён и не отменён. */
export const isScheduled = (appointment: Appointment) => appointment.status === 'requested' || appointment.status === 'confirmed'

export const statusLabel: Record<AppointmentStatus, string> = {
  requested: 'Ожидает подтверждения',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled: 'Отменена',
}

export type IndicatorState = 'low' | 'high' | 'normal'

export function indicatorState(indicator: LabIndicator): IndicatorState {
  if (indicator.value < indicator.min) return 'low'
  if (indicator.value > indicator.max) return 'high'
  return 'normal'
}

export const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
