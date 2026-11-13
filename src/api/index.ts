<<<<<<< HEAD
import { ApiError, type ApiContract, type PublicUser } from '../types';
import type { Appointment, UserAccount } from '../types';
import { createId } from './storage';
import { readDatabase, writeDatabase } from './storage';

const publicUser = ({ password: _password, ...user }: UserAccount): PublicUser => user;

export const api: ApiContract = {
  auth: {
    async login({ email, password }) {
      const account = readDatabase().users.find((user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password);
      if (!account) throw new ApiError('Проверьте email и пароль и попробуйте ещё раз.', 'INVALID_CREDENTIALS');
      return publicUser(account);
    },
    async currentUser() {
      const sessionId = window.localStorage.getItem('mak-clinic:session:v1');
      if (!sessionId) return null;
      const account = readDatabase().users.find((user) => user.id === sessionId);
      return account ? publicUser(account) : null;
    },
    async logout() {
      window.localStorage.removeItem('mak-clinic:session:v1');
    },
  },
  clinic: { async get() { return readDatabase().clinic; } },
  doctors: {
    async list() { return readDatabase().doctors; },
    async get(id) { return readDatabase().doctors.find((doctor) => doctor.id === id) ?? null; },
  },
  services: {
    async list() { return readDatabase().services; },
    async get(id) { return readDatabase().services.find((service) => service.id === id) ?? null; },
  },
  patients: {
    async list() { return readDatabase().patients; },
    async get(id) { return readDatabase().patients.find((patient) => patient.id === id) ?? null; },
  },
  appointments: {
    async list(filters = {}) {
      return readDatabase().appointments.filter((item) => (!filters.patientId || item.patientId === filters.patientId) && (!filters.doctorId || item.doctorId === filters.doctorId));
    },
    async get(id) { return readDatabase().appointments.find((item) => item.id === id) ?? null; },
    async create(input) {
      const database = readDatabase();
      const startsAt = new Date(input.startsAt);
      if (Number.isNaN(startsAt.getTime())) throw new ApiError('Укажите корректную дату и время.', 'VALIDATION');
      if (startsAt.getTime() <= Date.now()) throw new ApiError('Нельзя записаться на время, которое уже прошло.', 'PAST_SLOT');
      if (!database.patients.some((patient) => patient.id === input.patientId) || !database.doctors.some((doctor) => doctor.id === input.doctorId) || !database.services.some((service) => service.id === input.serviceId)) {
        throw new ApiError('Не удалось найти пациента, врача или услугу.', 'NOT_FOUND');
      }
      const service = database.services.find((item) => item.id === input.serviceId)!;
      const end = startsAt.getTime() + service.durationMinutes * 60_000;
      const hasConflict = database.appointments.some((appointment) => {
        if (appointment.status !== 'scheduled' || appointment.doctorId !== input.doctorId) return false;
        const bookedService = database.services.find((item) => item.id === appointment.serviceId);
        const bookedStart = new Date(appointment.startsAt).getTime();
        const bookedEnd = bookedStart + (bookedService?.durationMinutes ?? 30) * 60_000;
        return startsAt.getTime() < bookedEnd && end > bookedStart;
      });
      if (hasConflict) throw new ApiError('Это время уже занято. Выберите другой слот.', 'SLOT_TAKEN');
      const appointment: Appointment = { ...input, id: createId('appointment'), status: 'scheduled' };
      database.appointments.push(appointment);
      writeDatabase(database);
      return appointment;
    },
    async cancel(id) {
      const database = readDatabase();
      const appointment = database.appointments.find((item) => item.id === id);
      if (!appointment) throw new ApiError('Запись не найдена.', 'NOT_FOUND');
      appointment.status = 'cancelled';
      writeDatabase(database);
      return appointment;
    },
  },
  conclusions: {
    async list(filters = {}) {
      return readDatabase().conclusions.filter((item) => (!filters.patientId || item.patientId === filters.patientId) && (!filters.doctorId || item.doctorId === filters.doctorId));
    },
    async create(input) {
      const database = readDatabase();
      if (!database.appointments.some((item) => item.id === input.appointmentId)) throw new ApiError('Запись для заключения не найдена.', 'NOT_FOUND');
      const conclusion = { ...input, id: createId('conclusion'), createdAt: new Date().toISOString() };
      database.conclusions.push(conclusion);
      writeDatabase(database);
      return conclusion;
    },
  },
  labTests: {
    async list(filters = {}) { return readDatabase().labTests.filter((item) => !filters.patientId || item.patientId === filters.patientId); },
    async create(input) {
      const database = readDatabase();
      if (!database.patients.some((item) => item.id === input.patientId)) throw new ApiError('Пациент не найден.', 'NOT_FOUND');
      const test = { ...input, id: createId('lab'), orderedAt: new Date().toISOString(), status: 'ordered' as const };
      database.labTests.push(test);
      writeDatabase(database);
      return test;
    },
  },
  callbacks: {
    async list() { return readDatabase().callbacks; },
    async create(input) {
      if (!input.name.trim() || !input.phone.trim()) throw new ApiError('Укажите имя и номер телефона.', 'VALIDATION');
      const database = readDatabase();
      const request = { ...input, name: input.name.trim(), phone: input.phone.trim(), id: createId('callback'), createdAt: new Date().toISOString(), status: 'new' as const };
      database.callbacks.unshift(request);
      writeDatabase(database);
      return request;
    },
  },
};

export { ApiError } from '../types';
=======
import {
  ApiError,
  type Appointment,
  type AppointmentFilters,
  type AppointmentStatus,
  type CallRequest,
  type Clinic,
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

export async function getAvailableSlots(
  doctorId: string,
  date: string,
  durationMinutes = 30,
): Promise<string[]> {
  const database = readDatabase()
  if (!database.doctors.some((doctor) => doctor.id === doctorId)) {
    throw new ApiError('Выбранный врач не найден.', 'DOCTOR_NOT_FOUND')
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    throw new ApiError('Выберите корректную дату.', 'INVALID_APPOINTMENT_DATE')
  }
  const slots: string[] = []
  for (let minutes = 9 * 60; minutes <= 17 * 60; minutes += 30) {
    const start = new Date(`${date}T00:00:00`)
    start.setMinutes(minutes)
    if (start.getTime() <= Date.now()) continue
    if (database.appointments.some((appointment) => appointmentConflicts(appointment, database, doctorId, start, durationMinutes))) continue
    slots.push(start.toISOString())
  }
  return slots
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
  if (Number.isNaN(startsAt.getTime())) throw new ApiError('Выберите корректную дату и время.', 'INVALID_APPOINTMENT_TIME')
  if (startsAt.getTime() <= Date.now()) throw new ApiError('Нельзя записаться на прошедшее время.', 'PAST_APPOINTMENT')
  if (database.appointments.some((appointment) => appointmentConflicts(appointment, database, doctor.id, startsAt, service.durationMinutes))) {
    throw new ApiError('Это время уже занято. Выберите другой слот.', 'SLOT_TAKEN')
  }

  const appointment: Appointment = {
    ...input,
    id: createId('appointment'),
    status: 'requested',
  }
  database.appointments.push(appointment)
  writeDatabase(database)
  return appointment
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  const database = readDatabase()
  const appointment = database.appointments.find((entry) => entry.id === id)
  if (!appointment) throw new ApiError('Запись не найдена.', 'APPOINTMENT_NOT_FOUND')
  appointment.status = status
  writeDatabase(database)
  return appointment
}

export async function getConclusions(patientId?: string): Promise<MedicalConclusion[]> {
  return readDatabase().conclusions
    .filter((conclusion) => !patientId || conclusion.patientId === patientId)
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
>>>>>>> 46ee541 (Set up clinic foundation and public flows)
