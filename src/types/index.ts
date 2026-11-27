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
  /** Образование: вуз, ординатура, повышение квалификации. */
  education?: string
  /** Фото врача; нет — показываются инициалы. */
  photoUrl?: string
  rating: number
  initials: string
  accent: string
  /** Врач принимает записи. `false` — в отпуске/не работает; по умолчанию активен. */
  active?: boolean
  /** Номер кабинета приёма. */
  room?: string
  /** Рабочие часы по дням недели. Нет поля — работает ежедневно 09:00–17:00. */
  workingHours?: WorkingHours
  /** Legacy single days, converted to one-day absences when the database is read. */
  daysOff?: string[]
  /** Inclusive date ranges when the doctor is unavailable. */
  absences?: DoctorAbsence[]
  /** Per-date calendar overrides; an absent key follows the weekly template. */
  scheduleOverrides?: Record<string, WorkingInterval | null>
}

export type AbsenceReason = 'Отпуск' | 'Больничный' | 'Обучение' | 'Другое'
export interface DoctorAbsence { from: string; to: string; reason: AbsenceReason }

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
  /** Archived services stay in appointment history but cannot be booked. */
  active?: boolean
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

export type AppointmentStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'

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
  /** Кто отменил запись. */
  cancelledBy?: Role
  cancellationReason?: string
  /** Когда запись отменили (ISO). */
  cancelledAt?: string
  /** Время первоначальной записи до первого переноса (ISO). Полная история — в `AppointmentEvent`. */
  rescheduledFrom?: string
  /** Кто перенёс запись последним. */
  rescheduledBy?: StaffRole
  /** Когда запись перенесли последний раз (ISO). */
  rescheduledAt?: string
  /** Причина последнего переноса. */
  rescheduleReason?: string
  /** Кто отметил неявку пациента. */
  noShowMarkedBy?: StaffRole
  /** Причина или комментарий к неявке. */
  noShowReason?: string
  /** Когда отметили неявку (ISO). */
  noShowMarkedAt?: string
  /**
   * Пациент пришёл на этот приём (ISO). Это событие пациента, оно не связано
   * с приходом врача на смену (`DoctorPresence`).
   */
  patientArrivedAt?: string
  /** Кто отметил приход пациента. */
  patientArrivalMarkedBy?: StaffRole
}

/** Роли сотрудников клиники: могут менять чужие записи. */
export type StaffRole = Exclude<Role, 'patient'>

/**
 * Врач на смене: одна отметка на врача за локальный день.
 * Не путать с приходом пациента на приём (`Appointment.patientArrivedAt`).
 */
export interface DoctorPresence {
  doctorId: string
  /** Локальная дата приложения, YYYY-MM-DD. */
  date: string
  /** Момент отметки, ISO. */
  arrivedAt: string
}

/** @deprecated Старое имя `DoctorPresence`, оставлено для уже подключённых экранов. */
export type DoctorArrival = DoctorPresence

export type AppointmentEventType =
  | 'created'
  | 'confirmed'
  | 'patient-arrived'
  | 'rescheduled'
  | 'cancelled'
  | 'no-show'
  | 'completed'

/** Снимок изменяемых полей записи до и после действия. */
export interface AppointmentSnapshot {
  status: AppointmentStatus
  startsAt: string
  doctorId: string
}

/** Запись в истории записи на приём. Создаётся при каждом изменении, не редактируется. */
export interface AppointmentEvent {
  id: string
  appointmentId: string
  type: AppointmentEventType
  /** Роль, выполнившая действие. */
  actorRole: Role
  /** id пользователя демо-сессии. */
  actorUserId: string
  /** Когда выполнено действие (ISO). */
  at: string
  reason?: string
  previous?: AppointmentSnapshot
  next?: AppointmentSnapshot
}

export type PresenceEventType = 'marked' | 'cleared'

/** История отметок врача на смене. */
export interface PresenceEvent {
  id: string
  doctorId: string
  /** Локальная дата смены, YYYY-MM-DD. */
  date: string
  type: PresenceEventType
  actorRole: StaffRole
  actorUserId: string
  at: string
  reason?: string
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
  appointmentId?: string
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
  appointmentId?: string
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
  | 'appointments:cancel-assigned'
  | 'appointments:mark-no-show-assigned'
  | 'appointments:reschedule-assigned'
  | 'appointments:mark-patient-arrived'
  | 'attendance:check-in'
  | 'attendance:view-all'
  | 'attendance:manage'
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
