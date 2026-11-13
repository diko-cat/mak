import type {
  Appointment,
  CallbackRequest,
  Clinic,
  CreateAppointmentInput,
  CreateCallbackInput,
  CreateConclusionInput,
  CreateLabTestInput,
  Doctor,
  LabTest,
  LoginCredentials,
  MedicalConclusion,
  Patient,
  PublicUser,
  Service,
} from './domain';

/** Stable async boundary: replace these implementations with fetch without changing callers. */
export interface ApiContract {
  auth: {
    login(credentials: LoginCredentials): Promise<PublicUser>;
    currentUser(): Promise<PublicUser | null>;
    logout(): Promise<void>;
  };
  clinic: { get(): Promise<Clinic> };
  doctors: { list(): Promise<Doctor[]>; get(id: string): Promise<Doctor | null> };
  services: { list(): Promise<Service[]>; get(id: string): Promise<Service | null> };
  patients: { list(): Promise<Patient[]>; get(id: string): Promise<Patient | null> };
  appointments: {
    list(filters?: { patientId?: string; doctorId?: string }): Promise<Appointment[]>;
    get(id: string): Promise<Appointment | null>;
    create(input: CreateAppointmentInput): Promise<Appointment>;
    cancel(id: string): Promise<Appointment>;
  };
  conclusions: {
    list(filters?: { patientId?: string; doctorId?: string }): Promise<MedicalConclusion[]>;
    create(input: CreateConclusionInput): Promise<MedicalConclusion>;
  };
  labTests: {
    list(filters?: { patientId?: string }): Promise<LabTest[]>;
    create(input: CreateLabTestInput): Promise<LabTest>;
  };
  callbacks: { list(): Promise<CallbackRequest[]>; create(input: CreateCallbackInput): Promise<CallbackRequest> };
}

export class ApiError extends Error {
  constructor(message: string, public readonly code: 'UNAUTHORIZED' | 'INVALID_CREDENTIALS' | 'VALIDATION' | 'NOT_FOUND' | 'SLOT_TAKEN' | 'PAST_SLOT') {
    super(message);
    this.name = 'ApiError';
  }
}
