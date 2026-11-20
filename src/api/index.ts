import {
  ApiError,
  type Appointment,
  type AppointmentFilters,
  type AppointmentStatus,
  type CallRequest,
  type Clinic,
  type CompleteAppointmentInput,
  type ConclusionFilters,
  type DaySlot,
  type CreateAppointmentInput,
  type CreateCallRequestInput,
  type CreateConclusionInput,
  type CreateLabTestInput,
  type DemoAccount,
  type Doctor,
  type LabTest,
  type LoginCredentials,
  type MedicalConclusion,
  type Patient,
  type Role,
  type Service,
  type User,
} from '../types'
import { createId, readDatabase, writeDatabase, type MockDatabase } from './database'

const accountFor = (role: Role): DemoAccount => {
  const account = readDatabase().accounts.find((entry) => entry.user.role === role)
  if (!account) throw new ApiError('Для этой роли пока нет демо-аккаунта.', 'DEMO_ACCOUNT_NOT_FOUND')
  return account
}

export async function getDemoCredentials(role: Role): Promise<LoginCredentials> {
  const account = accountFor(role)
  return { email: account.user.email, password: account.password, role }
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const account = readDatabase().accounts.find(({ user, password }) =>
    user.email.toLowerCase() === credentials.email.trim().toLowerCase()
    && password === credentials.password
    && (!credentials.role || user.role === credentials.role),
  )
  if (!account) throw new ApiError('Проверьте email, пароль и выбранную роль.', 'INVALID_CREDENTIALS')
  return { ...account.user }
}

export async function getClinic(): Promise<Clinic> {
  return readDatabase().clinic
}

export async function getDoctors(): Promise<Doctor[]> {
  return readDatabase().doctors
}

export async function getServices(): Promise<Service[]> {
  return readDatabase().services
}

export async function getPatients(): Promise<Patient[]> {
  return readDatabase().patients
}

export async function getAppointments(filters: AppointmentFilters = {}): Promise<Appointment[]> {
  return readDatabase().appointments
    .filter((appointment) => !filters.patientId || appointment.patientId === filters.patientId)
    .filter((appointment) => !filters.doctorId || appointment.doctorId === filters.doctorId)
    .filter((appointment) => !filters.status || appointment.status === filters.status)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
}

function appointmentConflicts(
  appointment: Appointment,
  database: MockDatabase,
  doctorId: string,
  startsAt: Date,
  durationMinutes: number,
): boolean {
  if (appointment.doctorId !== doctorId || appointment.status === 'cancelled') return false
  const existingService = database.services.find((service) => service.id === appointment.serviceId)
  const existingDuration = existingService?.durationMinutes ?? 30
  const existingStart = new Date(appointment.startsAt).getTime()
  const existingEnd = existingStart + existingDuration * 60_000
  const newStart = startsAt.getTime()
  const newEnd = newStart + durationMinutes * 60_000
  return newStart < existingEnd && existingStart < newEnd
}

function slotsForDate(database: MockDatabase, doctorId: string, date: string, durationMinutes: number): DaySlot[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    throw new ApiError('Выберите корректную дату.', 'INVALID_APPOINTMENT_DATE')
  }
  const slots: DaySlot[] = []
  const dayStartsAt = 9 * 60
  const dayEndsAt = 17 * 60
  for (let minutes = dayStartsAt; minutes + durationMinutes <= dayEndsAt; minutes += 30) {
    const start = new Date(`${date}T00:00:00`)
    start.setMinutes(minutes)
    const startsAt = start.toISOString()
    if (start.getTime() <= Date.now()) slots.push({ startsAt, available: false, reason: 'past' })
    else if (database.appointments.some((appointment) => appointmentConflicts(appointment, database, doctorId, start, durationMinutes))) slots.push({ startsAt, available: false, reason: 'busy' })
    else slots.push({ startsAt, available: true })
  }
  return slots
}

/** Все слоты дня (09:00–17:00, шаг 30 минут) с пометкой, свободен ли слот и почему нет. */
export async function getDaySlots(
  doctorId: string,
  date: string,
  durationMinutes = 30,
): Promise<DaySlot[]> {
  const database = readDatabase()
  if (!database.doctors.some((doctor) => doctor.id === doctorId)) {
    throw new ApiError('Выбранный специалист не найден.', 'DOCTOR_NOT_FOUND')
  }
  return slotsForDate(database, doctorId, date, durationMinutes)
}

/** Counts free appointment times for the requested dates in one calendar lookup. */
export async function getCalendarAvailability(
  doctorId: string,
  dates: string[],
  durationMinutes = 30,
): Promise<Record<string, number>> {
  const database = readDatabase()
  if (!database.doctors.some((doctor) => doctor.id === doctorId)) {
    throw new ApiError('Выбранный специалист не найден.', 'DOCTOR_NOT_FOUND')
  }
  return dates.reduce<Record<string, number>>((counts, date) => {
    counts[date] = slotsForDate(database, doctorId, date, durationMinutes).filter((slot) => slot.available).length
    return counts
  }, {})
}

export async function getAvailableSlots(
  doctorId: string,
  date: string,
  durationMinutes = 30,
): Promise<string[]> {
  const slots = await getDaySlots(doctorId, date, durationMinutes)
  return slots.filter((slot) => slot.available).map((slot) => slot.startsAt)
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  const database = readDatabase()
  const doctor = database.doctors.find((entry) => entry.id === input.doctorId)
  const patient = database.patients.find((entry) => entry.id === input.patientId)
  const service = database.services.find((entry) => entry.id === input.serviceId)
  const startsAt = new Date(input.startsAt)

  if (!doctor) throw new ApiError('Выбранный врач не найден.', 'DOCTOR_NOT_FOUND')
  if (!patient) throw new ApiError('Пациент не найден.', 'PATIENT_NOT_FOUND')
  if (!service) throw new ApiError('Выбранная услуга не найдена.', 'SERVICE_NOT_FOUND')
  if (doctor.active === false) throw new ApiError('Этот врач сейчас не принимает. Выберите другого специалиста.', 'DOCTOR_INACTIVE')
  if (service.specialty && service.specialty !== doctor.specialty) throw new ApiError('Эту услугу оказывает врач другой специальности.', 'DOCTOR_SPECIALTY_MISMATCH')
  if (Number.isNaN(startsAt.getTime())) throw new ApiError('Выберите корректную дату и время.', 'INVALID_APPOINTMENT_TIME')
  if (startsAt.getTime() <= Date.now()) throw new ApiError('Нельзя записаться на прошедшее время.', 'PAST_APPOINTMENT')
  if (database.appointments.some((appointment) => appointmentConflicts(appointment, database, doctor.id, startsAt, service.durationMinutes))) {
    throw new ApiError('Это время уже занято. Выберите другой слот.', 'SLOT_TAKEN')
  }

  const appointment: Appointment = {
    ...input,
    note: input.note?.trim() || undefined,
    id: createId('appointment'),
    status: 'requested',
    ticketNumber: nextTicketNumber(database),
  }
  database.appointments.push(appointment)
  writeDatabase(database)
  return appointment
}

function nextTicketNumber(database: MockDatabase): string {
  const highest = database.appointments.reduce((max, appointment) => {
    const number = Number(appointment.ticketNumber?.replace(/\D/g, ''))
    return Number.isFinite(number) && number > max ? number : max
  }, 100)
  return `Т-${highest + 1}`
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  const database = readDatabase()
  const appointment = database.appointments.find((entry) => entry.id === id)
  if (!appointment) throw new ApiError('Запись не найдена.', 'APPOINTMENT_NOT_FOUND')
  appointment.status = status
  writeDatabase(database)
  return appointment
}

/** Принимает id пациента (как раньше) или фильтры по пациенту и врачу. */
export async function getConclusions(filters: string | ConclusionFilters = {}): Promise<MedicalConclusion[]> {
  const { patientId, doctorId } = typeof filters === 'string' ? { patientId: filters, doctorId: undefined } : filters
  return readDatabase().conclusions
    .filter((conclusion) => !patientId || conclusion.patientId === patientId)
    .filter((conclusion) => !doctorId || conclusion.doctorId === doctorId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function createConclusion(input: CreateConclusionInput): Promise<MedicalConclusion> {
  const database = readDatabase()
  if (!database.patients.some((patient) => patient.id === input.patientId)) throw new ApiError('Пациент не найден.', 'PATIENT_NOT_FOUND')
  if (!database.doctors.some((doctor) => doctor.id === input.doctorId)) throw new ApiError('Врач не найден.', 'DOCTOR_NOT_FOUND')
  if (!input.diagnosis.trim()) throw new ApiError('Укажите заключение врача.', 'VALIDATION_ERROR')
  const conclusion: MedicalConclusion = {
    ...input,
    id: createId('conclusion'),
    createdAt: new Date().toISOString(),
  }
  database.conclusions.push(conclusion)
  writeDatabase(database)
  return conclusion
}

/** Завершает приём: сохраняет заключение врача и переводит запись в статус «completed». */
export async function completeAppointment(
  id: string,
  input: CompleteAppointmentInput,
): Promise<{ appointment: Appointment; conclusion: MedicalConclusion }> {
  const database = readDatabase()
  const appointment = database.appointments.find((entry) => entry.id === id)
  if (!appointment) throw new ApiError('Запись не найдена.', 'APPOINTMENT_NOT_FOUND')
  if (appointment.status === 'cancelled') throw new ApiError('Нельзя завершить отменённый приём.', 'APPOINTMENT_CANCELLED')
  if (appointment.status === 'completed') throw new ApiError('Этот приём уже завершён.', 'APPOINTMENT_COMPLETED')
  const diagnosis = input.diagnosis.trim()
  if (diagnosis.length < 10) throw new ApiError('Заключение должно содержать минимум 10 символов.', 'VALIDATION_ERROR')

  const conclusion: MedicalConclusion = {
    id: createId('conclusion'),
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    appointmentId: appointment.id,
    createdAt: new Date().toISOString(),
    diagnosis,
    recommendations: input.recommendations.trim(),
  }
  appointment.status = 'completed'
  database.conclusions.push(conclusion)
  writeDatabase(database)
  return { appointment, conclusion }
}

export async function getLabTests(patientId?: string): Promise<LabTest[]> {
  return readDatabase().labTests
    .filter((test) => !patientId || test.patientId === patientId)
    .sort((left, right) => right.orderedAt.localeCompare(left.orderedAt))
}

export async function createLabTest(input: CreateLabTestInput): Promise<LabTest> {
  const database = readDatabase()
  if (!database.patients.some((patient) => patient.id === input.patientId)) throw new ApiError('Пациент не найден.', 'PATIENT_NOT_FOUND')
  if (!database.doctors.some((doctor) => doctor.id === input.doctorId)) throw new ApiError('Врач не найден.', 'DOCTOR_NOT_FOUND')
  if (!input.name.trim()) throw new ApiError('Укажите название анализа.', 'VALIDATION_ERROR')
  const test: LabTest = {
    ...input,
    id: createId('lab'),
    orderedAt: new Date().toISOString(),
    status: 'ordered',
  }
  database.labTests.push(test)
  writeDatabase(database)
  return test
}

export async function getCallRequests(): Promise<CallRequest[]> {
  return readDatabase().callRequests.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function createCallRequest(input: CreateCallRequestInput): Promise<CallRequest> {
  const name = input.name.trim()
  const phone = input.phone.trim()
  if (name.length < 2) throw new ApiError('Укажите, как к вам обращаться.', 'VALIDATION_ERROR')
  if (phone.replace(/\D/g, '').length < 10) throw new ApiError('Проверьте номер телефона.', 'VALIDATION_ERROR')

  const request: CallRequest = {
    id: createId('call'),
    name,
    phone,
    preferredTime: input.preferredTime?.trim() || undefined,
    createdAt: new Date().toISOString(),
    status: 'new',
  }
  const database = readDatabase()
  database.callRequests.push(request)
  writeDatabase(database)
  return request
}
