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
  type DoctorInput,
  type LabTest,
  type LoginCredentials,
  type MedicalConclusion,
  type Patient,
  type Permission,
  type Role,
  type Service,
  type ServiceInput,
  type User,
  type WorkingHours,
} from '../types'
import { hasPermission, roleLabels } from '../auth/permissions'
import { getSession } from '../store/session'
import { createId, readDatabase, writeDatabase, type MockDatabase } from './database'
import { fitsWorkingHours, intervalFor, isValidTime, SLOT_STEP_MINUTES, toMinutes, WEEK_ORDER } from './schedule'

/**
 * Проверка прав на стороне «сервера». Mock-слой берёт текущую сессию так же,
 * как настоящий бэкенд брал бы пользователя из токена.
 */
function requirePermission(permission: Permission): User {
  const user = getSession()
  if (!user) throw new ApiError('Войдите в аккаунт, чтобы продолжить.', 'UNAUTHORIZED')
  if (!hasPermission(user, permission)) {
    throw new ApiError(`Роль «${roleLabels[user.role]}» не может выполнить это действие.`, 'FORBIDDEN')
  }
  return user
}

const isActiveStatus = (status: AppointmentStatus) => status === 'requested' || status === 'confirmed'

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
  // Пациент и врач видят только свои записи, даже если фильтр не передан.
  const user = getSession()
  if (user && !hasPermission(user, 'appointments:view-all')) {
    if (user.role === 'patient') filters = { ...filters, patientId: user.patientId ?? '—' }
    if (user.role === 'doctor') filters = { ...filters, doctorId: user.doctorId ?? '—' }
  }
  return readDatabase().appointments
    .filter((appointment) => !filters.patientId || appointment.patientId === filters.patientId)
    .filter((appointment) => !filters.doctorId || appointment.doctorId === filters.doctorId)
    .filter((appointment) => !filters.status || appointment.status === filters.status)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
}

function appointmentOverlaps(
  appointment: Appointment,
  database: MockDatabase,
  startsAt: Date,
  durationMinutes: number,
  ignoreId?: string,
): boolean {
  if (appointment.id === ignoreId) return false
  if (!isActiveStatus(appointment.status)) return false
  const existingService = database.services.find((service) => service.id === appointment.serviceId)
  const existingDuration = existingService?.durationMinutes ?? 30
  const existingStart = new Date(appointment.startsAt).getTime()
  const existingEnd = existingStart + existingDuration * 60_000
  const newStart = startsAt.getTime()
  const newEnd = newStart + durationMinutes * 60_000
  return newStart < existingEnd && existingStart < newEnd
}

function appointmentConflicts(
  appointment: Appointment,
  database: MockDatabase,
  doctorId: string,
  startsAt: Date,
  durationMinutes: number,
  ignoreId?: string,
): boolean {
  return appointment.doctorId === doctorId && appointmentOverlaps(appointment, database, startsAt, durationMinutes, ignoreId)
}

function patientAppointmentConflict(
  appointment: Appointment,
  database: MockDatabase,
  patientId: string,
  startsAt: Date,
  durationMinutes: number,
): boolean {
  return appointment.patientId === patientId && appointmentOverlaps(appointment, database, startsAt, durationMinutes)
}

/**
 * Слоты дня по рабочим часам врача (шаг 30 минут) с пометкой, свободен ли слот и почему нет.
 * В выходной, день-исключение или у неактивного врача слотов нет.
 * `ignoreAppointmentId` — запись, которую переносят: её собственное время не считается занятым.
 */
export async function getDaySlots(
  doctorId: string,
  date: string,
  durationMinutes = 30,
  ignoreAppointmentId?: string,
  patientId?: string,
): Promise<DaySlot[]> {
  const database = readDatabase()
  const doctor = database.doctors.find((entry) => entry.id === doctorId)
  if (!doctor) throw new ApiError('Выбранный врач не найден.', 'DOCTOR_NOT_FOUND')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    throw new ApiError('Выберите корректную дату.', 'INVALID_APPOINTMENT_DATE')
  }
  const interval = intervalFor(doctor, date)
  if (doctor.active === false || !interval) return []
  const slots: DaySlot[] = []
  for (let minutes = toMinutes(interval.start); minutes + durationMinutes <= toMinutes(interval.end); minutes += SLOT_STEP_MINUTES) {
    const start = new Date(`${date}T00:00:00`)
    start.setMinutes(minutes)
    const startsAt = start.toISOString()
    if (start.getTime() <= Date.now()) slots.push({ startsAt, available: false, reason: 'past' })
    else if (database.appointments.some((appointment) => appointmentConflicts(appointment, database, doctorId, start, durationMinutes, ignoreAppointmentId)
      || Boolean(patientId && patientAppointmentConflict(appointment, database, patientId, start, durationMinutes)))) slots.push({ startsAt, available: false, reason: 'busy' })
    else slots.push({ startsAt, available: true })
  }
  return slots
}

/** Counts free appointment times for the requested dates in one calendar lookup. */
export async function getCalendarAvailability(
  doctorId: string,
  dates: string[],
  durationMinutes = 30,
  patientId?: string,
): Promise<Record<string, number>> {
  const doctor = readDatabase().doctors.find((entry) => entry.id === doctorId)
  if (!doctor) throw new ApiError('Выбранный врач не найден.', 'DOCTOR_NOT_FOUND')
  const availability = await Promise.all(dates.map(async (date) => {
    const slots = await getDaySlots(doctorId, date, durationMinutes, undefined, patientId)
    return [date, slots.filter((slot) => slot.available).length] as const
  }))
  return Object.fromEntries(availability)
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
  const user = requirePermission('appointments:book')
  if (user.patientId !== input.patientId) throw new ApiError('Записаться можно только от своего имени.', 'FORBIDDEN')
  const database = readDatabase()
  const doctor = database.doctors.find((entry) => entry.id === input.doctorId)
  const patient = database.patients.find((entry) => entry.id === input.patientId)
  const service = database.services.find((entry) => entry.id === input.serviceId)
  const startsAt = new Date(input.startsAt)

  if (!doctor) throw new ApiError('Выбранный врач не найден.', 'DOCTOR_NOT_FOUND')
  if (!patient) throw new ApiError('Пациент не найден.', 'PATIENT_NOT_FOUND')
  if (!service) throw new ApiError('Выбранная услуга не найдена.', 'SERVICE_NOT_FOUND')
  const note = input.note?.trim() ?? ''
  if (!note) throw new ApiError('Укажите причину обращения.', 'VALIDATION_ERROR')
  if (doctor.active === false) throw new ApiError('Этот врач сейчас не принимает. Выберите другого специалиста.', 'DOCTOR_INACTIVE')
  if (service.specialty && service.specialty !== doctor.specialty) throw new ApiError('Эту услугу оказывает врач другой специальности.', 'DOCTOR_SPECIALTY_MISMATCH')
  if (Number.isNaN(startsAt.getTime())) throw new ApiError('Выберите корректную дату и время.', 'INVALID_APPOINTMENT_TIME')
  if (startsAt.getTime() <= Date.now()) throw new ApiError('Нельзя записаться на прошедшее время.', 'PAST_APPOINTMENT')
  if (!fitsWorkingHours(doctor, startsAt, service.durationMinutes)) throw new ApiError('Врач не принимает в это время.', 'OUTSIDE_WORKING_HOURS')
  const patientConflict = database.appointments
    .filter((appointment) => patientAppointmentConflict(appointment, database, patient.id, startsAt, service.durationMinutes))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0]
  if (patientConflict) {
    const conflictStartsAt = new Date(patientConflict.startsAt)
    const conflictDate = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(conflictStartsAt)
    const conflictTime = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(conflictStartsAt)
    throw new ApiError(`У вас уже есть запись на ${conflictDate} в ${conflictTime}. Выберите другое время`, 'PATIENT_APPOINTMENT_CONFLICT')
  }
  if (database.appointments.some((appointment) => appointmentConflicts(appointment, database, doctor.id, startsAt, service.durationMinutes))) {
    throw new ApiError('Это время уже занято. Выберите другой слот.', 'SLOT_TAKEN')
  }

  const appointment: Appointment = {
    ...input,
    startsAt: startsAt.toISOString(),
    serviceName: service.name,
    price: service.price,
    note,
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

/**
 * Смена статуса записи с проверкой прав и допустимых переходов:
 * подтвердить — администратор (только ожидающую), отменить — администратор любую
 * запланированную или пациент свою. Завершение приёма идёт через `completeAppointment`.
 */
export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  const database = readDatabase()
  const appointment = database.appointments.find((entry) => entry.id === id)
  if (!appointment) throw new ApiError('Запись не найдена.', 'APPOINTMENT_NOT_FOUND')
  const user = getSession()

  if (status === 'confirmed') {
    requirePermission('appointments:confirm')
    if (appointment.status !== 'requested') throw new ApiError('Подтвердить можно только запись, ожидающую подтверждения.', 'INVALID_STATUS_TRANSITION')
    appointment.confirmedAt = new Date().toISOString()
  } else if (status === 'cancelled') {
    const ownRecord = user?.role === 'patient' && user.patientId === appointment.patientId
    if (!hasPermission(user, 'appointments:cancel-any') && !(ownRecord && hasPermission(user, 'appointments:cancel-own'))) {
      requirePermission('appointments:cancel-any')
    }
    if (!isActiveStatus(appointment.status)) throw new ApiError('Эту запись уже нельзя отменить.', 'INVALID_STATUS_TRANSITION')
  } else {
    throw new ApiError('Такой переход статуса недоступен.', 'INVALID_STATUS_TRANSITION')
  }

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
  const user = requirePermission('appointments:complete')
  if (user.doctorId !== appointment.doctorId) throw new ApiError('Завершить можно только свой приём.', 'FORBIDDEN')
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

export async function updateCallRequestStatus(id: string, status: CallRequest['status']): Promise<CallRequest> {
  requirePermission('calls:manage')
  const database = readDatabase()
  const request = database.callRequests.find((entry) => entry.id === id)
  if (!request) throw new ApiError('Заявка не найдена.', 'CALL_REQUEST_NOT_FOUND')
  request.status = status
  writeDatabase(database)
  return request
}

/* ───────────── Администратор: записи ───────────── */

/** Перенос приёма на другое время (и при необходимости к другому врачу той же специальности). */
export async function rescheduleAppointment(id: string, startsAtIso: string, doctorId?: string): Promise<Appointment> {
  requirePermission('appointments:reschedule')
  const database = readDatabase()
  const appointment = database.appointments.find((entry) => entry.id === id)
  if (!appointment) throw new ApiError('Запись не найдена.', 'APPOINTMENT_NOT_FOUND')
  if (!isActiveStatus(appointment.status)) throw new ApiError('Перенести можно только запланированный приём.', 'INVALID_STATUS_TRANSITION')
  const doctor = database.doctors.find((entry) => entry.id === (doctorId ?? appointment.doctorId))
  const service = database.services.find((entry) => entry.id === appointment.serviceId)
  if (!doctor) throw new ApiError('Врач не найден.', 'DOCTOR_NOT_FOUND')
  if (doctor.active === false) throw new ApiError('Этот врач сейчас не принимает.', 'DOCTOR_INACTIVE')
  if (service?.specialty && service.specialty !== doctor.specialty) throw new ApiError('Эту услугу оказывает врач другой специальности.', 'DOCTOR_SPECIALTY_MISMATCH')
  const startsAt = new Date(startsAtIso)
  const duration = service?.durationMinutes ?? 30
  if (Number.isNaN(startsAt.getTime())) throw new ApiError('Выберите корректную дату и время.', 'INVALID_APPOINTMENT_TIME')
  if (startsAt.getTime() <= Date.now()) throw new ApiError('Нельзя перенести приём на прошедшее время.', 'PAST_APPOINTMENT')
  if (!fitsWorkingHours(doctor, startsAt, duration)) throw new ApiError('Врач не принимает в это время.', 'OUTSIDE_WORKING_HOURS')
  if (database.appointments.some((entry) => appointmentConflicts(entry, database, doctor.id, startsAt, duration, appointment.id))) {
    throw new ApiError('Это время уже занято. Выберите другой слот.', 'SLOT_TAKEN')
  }
  appointment.doctorId = doctor.id
  appointment.startsAt = startsAt.toISOString()
  writeDatabase(database)
  return appointment
}

/* ───────────── Администратор: врачи ───────────── */

const initialsOf = (name: string) => name.trim().split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase()

function validateDoctor(input: DoctorInput): void {
  if (input.name.trim().length < 3) throw new ApiError('Укажите имя и фамилию врача.', 'VALIDATION_ERROR')
  if (input.specialty.trim().length < 3) throw new ApiError('Укажите специальность.', 'VALIDATION_ERROR')
  if (!Number.isFinite(input.experienceYears) || input.experienceYears < 0 || input.experienceYears > 70) throw new ApiError('Стаж — от 0 до 70 лет.', 'VALIDATION_ERROR')
}

export async function createDoctor(input: DoctorInput): Promise<Doctor> {
  requirePermission('doctors:manage')
  validateDoctor(input)
  const database = readDatabase()
  const doctor: Doctor = {
    ...input,
    id: createId('doctor'),
    name: input.name.trim(),
    specialty: input.specialty.trim(),
    description: input.description.trim(),
    initials: initialsOf(input.name),
    rating: input.rating ?? 5,
    accent: input.accent || 'sage',
  }
  database.doctors.push(doctor)
  writeDatabase(database)
  return doctor
}

export async function updateDoctor(id: string, patch: Partial<DoctorInput>): Promise<Doctor> {
  requirePermission('doctors:manage')
  const database = readDatabase()
  const doctor = database.doctors.find((entry) => entry.id === id)
  if (!doctor) throw new ApiError('Врач не найден.', 'DOCTOR_NOT_FOUND')
  const next = { ...doctor, ...patch }
  validateDoctor(next)
  Object.assign(doctor, next, { name: next.name.trim(), specialty: next.specialty.trim(), description: next.description.trim(), initials: initialsOf(next.name) })
  writeDatabase(database)
  return doctor
}

export async function deleteDoctor(id: string): Promise<void> {
  requirePermission('doctors:manage')
  const database = readDatabase()
  if (!database.doctors.some((entry) => entry.id === id)) throw new ApiError('Врач не найден.', 'DOCTOR_NOT_FOUND')
  if (database.appointments.some((entry) => entry.doctorId === id)) {
    throw new ApiError('У врача есть записи в истории. Вместо удаления закройте ему запись (снимите «Принимает пациентов»).', 'DOCTOR_HAS_APPOINTMENTS')
  }
  database.doctors = database.doctors.filter((entry) => entry.id !== id)
  database.accounts = database.accounts.filter((entry) => entry.user.doctorId !== id)
  writeDatabase(database)
}

/* ───────────── Администратор: рабочие часы и расписание ───────────── */

export async function updateDoctorSchedule(id: string, schedule: { workingHours: WorkingHours; daysOff: string[] }): Promise<Doctor> {
  requirePermission('schedule:manage')
  for (const day of WEEK_ORDER) {
    const interval = schedule.workingHours[day]
    if (!interval) continue
    if (!isValidTime(interval.start) || !isValidTime(interval.end)) throw new ApiError('Время укажите в формате ЧЧ:ММ.', 'VALIDATION_ERROR')
    if (toMinutes(interval.end) - toMinutes(interval.start) < SLOT_STEP_MINUTES) throw new ApiError('Рабочий день должен заканчиваться позже начала хотя бы на 30 минут.', 'VALIDATION_ERROR')
  }
  if (schedule.daysOff.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) throw new ApiError('Проверьте даты нерабочих дней.', 'VALIDATION_ERROR')
  const database = readDatabase()
  const doctor = database.doctors.find((entry) => entry.id === id)
  if (!doctor) throw new ApiError('Врач не найден.', 'DOCTOR_NOT_FOUND')
  doctor.workingHours = schedule.workingHours
  doctor.daysOff = [...new Set(schedule.daysOff)].sort()
  writeDatabase(database)
  return doctor
}

/** Будущие запланированные приёмы врача, которые больше не попадают в его рабочее время. */
export async function getScheduleConflicts(doctorId: string): Promise<Appointment[]> {
  requirePermission('schedule:manage')
  const database = readDatabase()
  const doctor = database.doctors.find((entry) => entry.id === doctorId)
  if (!doctor) return []
  return database.appointments
    .filter((entry) => entry.doctorId === doctorId && isActiveStatus(entry.status) && new Date(entry.startsAt).getTime() > Date.now())
    .filter((entry) => !fitsWorkingHours(doctor, new Date(entry.startsAt), database.services.find((service) => service.id === entry.serviceId)?.durationMinutes ?? 30))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
}

/* ───────────── Администратор: услуги и цены ───────────── */

function validateService(input: ServiceInput): void {
  if (input.name.trim().length < 3) throw new ApiError('Укажите название услуги.', 'VALIDATION_ERROR')
  if (!input.category.trim()) throw new ApiError('Укажите категорию.', 'VALIDATION_ERROR')
  if (!Number.isFinite(input.price) || input.price < 0) throw new ApiError('Цена не может быть отрицательной.', 'VALIDATION_ERROR')
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 240) throw new ApiError('Длительность — от 5 до 240 минут.', 'VALIDATION_ERROR')
}

export async function createService(input: ServiceInput): Promise<Service> {
  requirePermission('services:manage')
  validateService(input)
  const database = readDatabase()
  const service: Service = {
    ...input,
    id: createId('service'),
    name: input.name.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    specialty: input.specialty?.trim() || undefined,
  }
  database.services.push(service)
  writeDatabase(database)
  return service
}

export async function updateService(id: string, patch: Partial<ServiceInput>): Promise<Service> {
  requirePermission('services:manage')
  const database = readDatabase()
  const service = database.services.find((entry) => entry.id === id)
  if (!service) throw new ApiError('Услуга не найдена.', 'SERVICE_NOT_FOUND')
  const next = { ...service, ...patch }
  validateService(next)
  Object.assign(service, next, { name: next.name.trim(), category: next.category.trim(), description: next.description.trim(), specialty: next.specialty?.trim() || undefined })
  writeDatabase(database)
  return service
}

export async function deleteService(id: string): Promise<void> {
  requirePermission('services:manage')
  const database = readDatabase()
  if (!database.services.some((entry) => entry.id === id)) throw new ApiError('Услуга не найдена.', 'SERVICE_NOT_FOUND')
  if (database.appointments.some((entry) => entry.serviceId === id && isActiveStatus(entry.status))) {
    throw new ApiError('На эту услугу есть запланированные приёмы. Сначала перенесите или отмените их.', 'SERVICE_IN_USE')
  }
  database.services = database.services.filter((entry) => entry.id !== id)
  writeDatabase(database)
}
