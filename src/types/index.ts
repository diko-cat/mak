export type Role = 'patient' | 'doctor' | 'admin'

export interface Clinic {
  id: string
  name: string
  tagline: string
  description: string
  foundedYear?: number
  address: string
  phone: string
  email: string
  workingHours: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  /** Distinguishes physicians from other clinical staff such as lab technicians. */
  profession?: 'physician' | 'clinical-specialist'
  description: string
  experienceYears: number
  rating: number
  initials: string
  accent: string
  /** Врач принимает записи. `false` — в отпуске/не работает; по умолчанию активен. */
  active?: boolean
  /** Номер кабинета приёма. */
  room?: string
  /** Рабочие часы по дням недели. Нет поля — работает ежедневно 09:00–17:00. */
  workingHours?: WorkingHours
  /** Даты-исключения (YYYY-MM-DD), когда врач не принимает: отпуск, больничный. */
  daysOff?: string[]
}

/** Интервал рабочего дня, время в формате HH:MM. */
export interface WorkingInterval {
  start: string
  end: string
}

/** Ключ — день недели как в `Date.getDay()` (0 — воскресенье … 6 — суббота); `null` — выходной. */
export type WorkingHours = Record<number, WorkingInterval | null>

export type DoctorInput = Omit<Doctor, 'id' | 'initials' | 'rating'> & { rating?: number }
export type ServiceInput = Omit<Service, 'id'>

export interface Service {
  id: string
  name: string
  category: string
  description: string
  price: number
  durationMinutes: number
  /** Специальность врача, который оказывает услугу (совпадает с `Doctor.specialty`). */
  specialty?: string
}

export interface Patient {
  id: string
  name: string
  email: string
  phone: string
  birthDate: string
  /** Номер медицинской карты. */
  cardNumber?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  patientId?: string
  doctorId?: string
}

export interface DemoAccount {
  user: User
  password: string
}

export type AppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  serviceId: string
  /** Название услуги и стоимость на момент записи; сохраняются при изменении прайса или услуги. */
  serviceName?: string
  price?: number
  startsAt: string
  status: AppointmentStatus
  /** Когда администратор подтвердил заявку. */
  confirmedAt?: string
  /** Причина обращения. */
  note?: string
  /** Номер талона, выдаётся при записи. */
  ticketNumber?: string
}

export interface MedicalConclusion {
  id: string
  patientId: string
  doctorId: string
  appointmentId?: string
  createdAt: string
  diagnosis: string
  recommendations: string
}

export interface LabIndicator {
  name: string
  value: number
  unit: string
  min: number
  max: number
}

export type LabTestStatus = 'ordered' | 'in-progress' | 'ready'

export interface LabTest {
  id: string
  patientId: string
  doctorId: string
  name: string
  orderedAt: string
  resultAt?: string
  status: LabTestStatus
  result?: string
  indicators?: LabIndicator[]
}

export interface CallRequest {
  id: string
  name: string
  phone: string
  preferredTime?: string
  createdAt: string
  status: 'new' | 'contacted'
}

export interface LoginCredentials {
  email: string
  password: string
  role?: Role
}

export interface CreateAppointmentInput {
  patientId: string
  doctorId: string
  serviceId: string
  startsAt: string
  note?: string
}

export interface CreateConclusionInput {
  patientId: string
  doctorId: string
  appointmentId?: string
  diagnosis: string
  recommendations: string
}

export interface CreateLabTestInput {
  patientId: string
  doctorId: string
  name: string
}

export interface CreateCallRequestInput {
  name: string
  phone: string
  preferredTime?: string
}

export interface AppointmentFilters {
  patientId?: string
  doctorId?: string
  status?: AppointmentStatus
}

export interface CompleteAppointmentInput {
  /** Заключение врача, минимум 10 символов. */
  diagnosis: string
  /** Назначения и рекомендации. */
  recommendations: string
}

export type SlotUnavailableReason = 'past' | 'busy'

export type Permission =
  | 'appointments:book'
  | 'appointments:view-own'
  | 'appointments:cancel-own'
  | 'appointments:view-all'
  | 'appointments:confirm'
  | 'appointments:reschedule'
  | 'appointments:cancel-any'
  | 'appointments:complete'
  | 'results:view-own'
  | 'patients:view-own'
  | 'patients:view-all'
  | 'doctors:manage'
  | 'services:manage'
  | 'schedule:manage'
  | 'calls:manage'

export interface DaySlot {
  startsAt: string
  available: boolean
  reason?: SlotUnavailableReason
}

export interface ConclusionFilters {
  patientId?: string
  doctorId?: string
}

export class ApiError extends Error {
  readonly code: string

  constructor(message: string, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}
