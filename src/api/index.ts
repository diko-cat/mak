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
