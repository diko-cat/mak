<<<<<<< HEAD
export * from './domain';
export * from './api';
=======
export type Role = 'patient' | 'doctor' | 'admin'

export interface Clinic {
  id: string
  name: string
  tagline: string
  description: string
  foundedYear: number
  address: string
  phone: string
  email: string
  workingHours: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  description: string
  experienceYears: number
  rating: number
  initials: string
  accent: string
}

export interface Service {
  id: string
  name: string
  category: string
  description: string
  price: number
  durationMinutes: number
}

export interface Patient {
  id: string
  name: string
  email: string
  phone: string
  birthDate: string
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
  startsAt: string
  status: AppointmentStatus
  note?: string
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

export class ApiError extends Error {
  readonly code: string

  constructor(message: string, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}
>>>>>>> 46ee541 (Set up clinic foundation and public flows)
