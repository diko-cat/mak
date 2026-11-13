export type UserRole = 'admin' | 'doctor' | 'registrar' | 'patient';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';
export type LabTestStatus = 'ordered' | 'in_progress' | 'completed';

export interface Clinic {
  id: string;
  name: string;
  tagline: string;
  foundedYear: number;
  address: string;
  phone: string;
  email: string;
  workHours: string;
  description: string;
  principles: string[];
}

export interface UserAccount {
  id: string;
  role: UserRole;
  email: string;
  password: string;
  name: string;
  linkedId?: string;
}

export type PublicUser = Omit<UserAccount, 'password'>;

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experienceYears: number;
  bio: string;
  color: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  serviceId: string;
  startsAt: string;
  status: AppointmentStatus;
  note?: string;
}

export interface MedicalConclusion {
  id: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  createdAt: string;
  summary: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  appointmentId: string;
  name: string;
  orderedAt: string;
  status: LabTestStatus;
  result?: string;
}

export interface CallbackRequest {
  id: string;
  name: string;
  phone: string;
  preferredTime?: string;
  createdAt: string;
  status: 'new' | 'contacted';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  serviceId: string;
  startsAt: string;
  note?: string;
}

export interface CreateCallbackInput {
  name: string;
  phone: string;
  preferredTime?: string;
}

export interface CreateConclusionInput extends Omit<MedicalConclusion, 'id' | 'createdAt'> {}

export interface CreateLabTestInput extends Omit<LabTest, 'id' | 'orderedAt' | 'status' | 'result'> {}
