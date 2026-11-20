import type {
  Appointment,
  CallRequest,
  Clinic,
  DemoAccount,
  Doctor,
  LabTest,
  MedicalConclusion,
  Patient,
  Service,
} from '../types'

export interface MockDatabase {
  clinic: Clinic
  doctors: Doctor[]
  services: Service[]
  patients: Patient[]
  accounts: DemoAccount[]
  appointments: Appointment[]
  conclusions: MedicalConclusion[]
  labTests: LabTest[]
  callRequests: CallRequest[]
}

export const DATABASE_KEY = 'sana-clinic.database.v1'

const atDayAndHour = (dayOffset: number, hour: number, minute = 0) => {
  const value = new Date()
  value.setDate(value.getDate() + dayOffset)
  value.setHours(hour, minute, 0, 0)
  return value.toISOString()
}

export function createSeedDatabase(): MockDatabase {
  const doctors: Doctor[] = [
    { id: 'doctor-1', name: 'Айгерим Сейтова', specialty: 'Кардиолог', description: 'Профилактика и лечение заболеваний сердца. Объясняет сложное простыми словами.', experienceYears: 14, rating: 4.9, initials: 'АС', accent: 'sage' },
    { id: 'doctor-2', name: 'Данияр Ахметов', specialty: 'Невролог', description: 'Помогает вернуть спокойный сон, ясность и свободу движения.', experienceYears: 11, rating: 4.9, initials: 'ДА', accent: 'blue' },
    { id: 'doctor-3', name: 'Жанна Ким', specialty: 'Педиатр', description: 'Бережно заботится о детях и всегда находит общий язык с родителями.', experienceYears: 16, rating: 5.0, initials: 'ЖК', accent: 'rose' },
    { id: 'doctor-4', name: 'Марат Нурланов', specialty: 'Дерматолог', description: 'Доказательный подход к здоровью кожи и её ежедневному уходу.', experienceYears: 9, rating: 4.8, initials: 'МН', accent: 'sand' },
    { id: 'doctor-5', name: 'Алина Омарова', specialty: 'Гинеколог', description: 'Деликатные консультации и внимание к каждому этапу жизни.', experienceYears: 12, rating: 4.9, initials: 'АО', accent: 'lilac' },
    { id: 'doctor-6', name: 'Руслан Ибраев', specialty: 'Врач УЗИ', description: 'Точная диагностика и подробные ответы сразу после исследования.', experienceYears: 10, rating: 4.8, initials: 'РИ', accent: 'mint' },
  ]

  const patients: Patient[] = [
    { id: 'patient-1', name: 'Алия Турсунова', email: 'aliya@example.test', phone: '+7 701 234 56 78', birthDate: '1993-04-18' },
    { id: 'patient-2', name: 'Ерлан Сериков', email: 'erlan@example.test', phone: '+7 702 345 67 89', birthDate: '1987-10-02' },
    { id: 'patient-3', name: 'Мария Волкова', email: 'maria@example.test', phone: '+7 705 456 78 90', birthDate: '1998-01-27' },
    { id: 'patient-4', name: 'Тимур Алиев', email: 'timur@example.test', phone: '+7 707 567 89 01', birthDate: '1979-07-11' },
    { id: 'patient-5', name: 'София Исмаилова', email: 'sofia@example.test', phone: '+7 708 678 90 12', birthDate: '2001-12-05' },
  ]

  const services: Service[] = [
    { id: 'service-1', name: 'Первичный приём кардиолога', category: 'Кардиология', description: 'Консультация и план обследования', price: 12000, durationMinutes: 45 },
    { id: 'service-2', name: 'ЭКГ с расшифровкой', category: 'Кардиология', description: 'Электрокардиограмма и заключение врача', price: 6500, durationMinutes: 30 },
    { id: 'service-3', name: 'Приём невролога', category: 'Неврология', description: 'Осмотр, консультация и рекомендации', price: 11000, durationMinutes: 45 },
    { id: 'service-4', name: 'Приём педиатра', category: 'Педиатрия', description: 'Осмотр ребёнка и ответы на вопросы', price: 9500, durationMinutes: 40 },
    { id: 'service-5', name: 'Приём дерматолога', category: 'Дерматология', description: 'Консультация по вопросам здоровья кожи', price: 10000, durationMinutes: 40 },
    { id: 'service-6', name: 'Приём гинеколога', category: 'Гинекология', description: 'Деликатная консультация и осмотр', price: 12000, durationMinutes: 45 },
    { id: 'service-7', name: 'УЗИ органов брюшной полости', category: 'Диагностика', description: 'Исследование натощак, 4 зоны', price: 14000, durationMinutes: 40 },
    { id: 'service-8', name: 'Общий анализ крови', category: 'Лаборатория', description: 'Забор крови и исследование 24 показателей', price: 4500, durationMinutes: 15 },
    { id: 'service-9', name: 'Биохимический анализ крови', category: 'Лаборатория', description: 'Базовый профиль из 12 показателей', price: 9500, durationMinutes: 15 },
    { id: 'service-10', name: 'Комплекс «Здоровое сердце»', category: 'Кардиология', description: 'Приём кардиолога, ЭКГ и базовые анализы', price: 24500, durationMinutes: 60 },
  ]

  return {
    clinic: {
      id: 'clinic-sana',
      name: 'Клиника «Сана»',
      tagline: 'Здоровье начинается с внимания',
      description: 'Мы создали пространство, где современная медицина встречается с человеческим отношением. Внимательно слушаем, объясняем каждый шаг и вместе находим решение.',
      foundedYear: 2012,
      address: 'Алматы, проспект Достык, 128',
      phone: '+7 (727) 355-14-14',
      email: 'hello@sana-clinic.kz',
      workingHours: 'Ежедневно, 08:00–20:00',
    },
    doctors,
    services,
    patients,
    accounts: [
      { user: { id: 'user-admin', name: 'Администратор клиники', email: 'admin@sana.demo', role: 'admin' }, password: 'SanaAdmin2026' },
      { user: { id: 'user-doctor', name: doctors[0].name, email: 'doctor@sana.demo', role: 'doctor', doctorId: doctors[0].id }, password: 'SanaDoctor2026' },
      { user: { id: 'user-patient', name: patients[0].name, email: 'patient@sana.demo', role: 'patient', patientId: patients[0].id }, password: 'SanaPatient2026' },
    ],
    appointments: [
      { id: 'appointment-1', patientId: patients[0].id, doctorId: doctors[0].id, serviceId: services[0].id, startsAt: atDayAndHour(2, 10), status: 'confirmed' },
      { id: 'appointment-2', patientId: patients[1].id, doctorId: doctors[1].id, serviceId: services[2].id, startsAt: atDayAndHour(1, 11, 30), status: 'requested' },
      { id: 'appointment-3', patientId: patients[2].id, doctorId: doctors[2].id, serviceId: services[3].id, startsAt: atDayAndHour(3, 9), status: 'confirmed' },
      { id: 'appointment-4', patientId: patients[3].id, doctorId: doctors[3].id, serviceId: services[4].id, startsAt: atDayAndHour(4, 14), status: 'requested' },
    ],
    conclusions: [
      { id: 'conclusion-1', patientId: patients[0].id, doctorId: doctors[0].id, appointmentId: 'appointment-1', createdAt: atDayAndHour(-18, 13), diagnosis: 'Функциональная тахикардия', recommendations: 'Контроль пульса, режим сна, повторная консультация через месяц.' },
      { id: 'conclusion-2', patientId: patients[1].id, doctorId: doctors[1].id, createdAt: atDayAndHour(-7, 16), diagnosis: 'Мигрень без ауры', recommendations: 'Дневник головной боли, соблюдение режима сна.' },
    ],
    labTests: [
      { id: 'lab-1', patientId: patients[0].id, doctorId: doctors[0].id, name: 'Общий анализ крови', orderedAt: atDayAndHour(-4, 9), resultAt: atDayAndHour(-3, 12), status: 'ready', result: 'Показатели в пределах референсных значений' },
      { id: 'lab-2', patientId: patients[1].id, doctorId: doctors[1].id, name: 'Ферритин', orderedAt: atDayAndHour(-1, 10), status: 'in-progress' },
      { id: 'lab-3', patientId: patients[2].id, doctorId: doctors[2].id, name: 'Витамин D', orderedAt: atDayAndHour(-2, 11), status: 'ordered' },
    ],
    callRequests: [
      { id: 'call-1', name: 'Дана', phone: '+7 701 000 00 01', preferredTime: 'После 18:00', createdAt: atDayAndHour(-1, 15), status: 'new' },
      { id: 'call-2', name: 'Арман', phone: '+7 702 000 00 02', preferredTime: 'Утром', createdAt: atDayAndHour(-2, 10), status: 'contacted' },
    ],
  }
}

export function readDatabase(): MockDatabase {
  if (typeof window === 'undefined') return createSeedDatabase()

  const raw = window.localStorage.getItem(DATABASE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as MockDatabase
    } catch {
      window.localStorage.removeItem(DATABASE_KEY)
    }
  }

  const database = createSeedDatabase()
  writeDatabase(database)
  return database
}

export function writeDatabase(database: MockDatabase): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DATABASE_KEY, JSON.stringify(database))
  }
}

export function createId(prefix: string): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${id}`
}
