import type {
  Appointment,
<<<<<<< HEAD
  CallbackRequest,
  Clinic,
=======
  CallRequest,
  Clinic,
  DemoAccount,
>>>>>>> 46ee541 (Set up clinic foundation and public flows)
  Doctor,
  LabTest,
  MedicalConclusion,
  Patient,
  Service,
<<<<<<< HEAD
  UserAccount,
} from '../types';

export interface Database {
  version: 1;
  clinic: Clinic;
  users: UserAccount[];
  doctors: Doctor[];
  services: Service[];
  patients: Patient[];
  appointments: Appointment[];
  conclusions: MedicalConclusion[];
  labTests: LabTest[];
  callbacks: CallbackRequest[];
}

const dayAt = (daysFromNow: number, time: string) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const [hours, minutes] = time.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

export function createSeedDatabase(): Database {
  const clinic: Clinic = {
    id: 'clinic-mak',
    name: 'Медицинский центр МАК',
    tagline: 'Здоровье начинается с доверия',
    foundedYear: 2012,
    address: 'Астана, проспект Мәңгілік Ел, 42',
    phone: '+7 (7172) 55-20-20',
    email: 'hello@mak-clinic.kz',
    workHours: 'Пн–Сб · 08:00–20:00',
    description: 'Мы соединяем точную диагностику, доказательную медицину и человеческое отношение — чтобы забота о здоровье была спокойной и понятной.',
    principles: ['Слушаем и объясняем простыми словами', 'Принимаем решения на основе доказательств', 'Уважаем время и личный выбор каждого'],
  };
  const patients: Patient[] = [
    { id: 'patient-1', name: 'Алия Садыкова', birthDate: '1992-04-18', phone: '+7 701 111 22 33', email: 'patient@mak-clinic.kz' },
    { id: 'patient-2', name: 'Данияр Касымов', birthDate: '1987-11-02', phone: '+7 702 222 33 44', email: 'daniyar@example.kz' },
    { id: 'patient-3', name: 'Мадина Ермекова', birthDate: '1998-07-24', phone: '+7 705 333 44 55', email: 'madina@example.kz' },
    { id: 'patient-4', name: 'Арман Ибраев', birthDate: '1979-02-09', phone: '+7 707 444 55 66', email: 'arman@example.kz' },
    { id: 'patient-5', name: 'Жанна Ахметова', birthDate: '2001-12-13', phone: '+7 708 555 66 77', email: 'zhanna@example.kz' },
  ];
  const doctors: Doctor[] = [
    { id: 'doctor-1', name: 'Айгерим Нурланова', specialty: 'Терапевт', experienceYears: 12, bio: 'Помогает выстроить понятный план заботы о здоровье.', color: 'sage' },
    { id: 'doctor-2', name: 'Тимур Абдрахманов', specialty: 'Кардиолог', experienceYears: 15, bio: 'Специализируется на профилактике и здоровье сердца.', color: 'sand' },
    { id: 'doctor-3', name: 'Сауле Бекова', specialty: 'Педиатр', experienceYears: 10, bio: 'Создаёт бережную атмосферу для маленьких пациентов.', color: 'peach' },
    { id: 'doctor-4', name: 'Ержан Омаров', specialty: 'Невролог', experienceYears: 13, bio: 'Разбирается в причинах симптомов и сопровождает восстановление.', color: 'blue' },
    { id: 'doctor-5', name: 'Алина Жумабаева', specialty: 'Гинеколог', experienceYears: 9, bio: 'Консультирует деликатно и с уважением к выбору пациентки.', color: 'rose' },
    { id: 'doctor-6', name: 'Руслан Сеитов', specialty: 'Эндокринолог', experienceYears: 11, bio: 'Помогает управлять гормональным здоровьем на каждом этапе.', color: 'lilac' },
  ];
  const services: Service[] = [
    { id: 'service-1', name: 'Первичный приём терапевта', description: 'Консультация и план обследования', price: 12000, durationMinutes: 40 },
    { id: 'service-2', name: 'Повторный приём терапевта', description: 'Контроль динамики и рекомендаций', price: 9000, durationMinutes: 30 },
    { id: 'service-3', name: 'Приём кардиолога', description: 'Консультация по здоровью сердца', price: 15000, durationMinutes: 40 },
    { id: 'service-4', name: 'Приём педиатра', description: 'Осмотр ребёнка и рекомендации', price: 12000, durationMinutes: 40 },
    { id: 'service-5', name: 'Приём невролога', description: 'Диагностика и план лечения', price: 14000, durationMinutes: 40 },
    { id: 'service-6', name: 'Приём гинеколога', description: 'Деликатная консультация', price: 14000, durationMinutes: 40 },
    { id: 'service-7', name: 'Приём эндокринолога', description: 'Консультация и интерпретация анализов', price: 15000, durationMinutes: 40 },
    { id: 'service-8', name: 'ЭКГ с расшифровкой', description: 'Исследование и заключение врача', price: 6500, durationMinutes: 20 },
    { id: 'service-9', name: 'Общий анализ крови', description: 'Забор биоматериала включён', price: 4500, durationMinutes: 15 },
    { id: 'service-10', name: 'УЗИ брюшной полости', description: 'Исследование органов брюшной полости', price: 11000, durationMinutes: 30 },
  ];
  const users: UserAccount[] = [
    { id: 'user-admin', role: 'admin', email: 'admin@mak-clinic.kz', password: 'Admin123', name: 'Администратор клиники' },
    { id: 'user-doctor', role: 'doctor', email: 'doctor@mak-clinic.kz', password: 'Doctor123', name: doctors[0].name, linkedId: doctors[0].id },
    { id: 'user-registrar', role: 'registrar', email: 'registrar@mak-clinic.kz', password: 'Register123', name: 'Асем Ресепшн' },
    { id: 'user-patient', role: 'patient', email: 'patient@mak-clinic.kz', password: 'Patient123', name: patients[0].name, linkedId: patients[0].id },
  ];
  const appointments: Appointment[] = [
    { id: 'appointment-1', patientId: patients[0].id, doctorId: doctors[0].id, serviceId: services[0].id, startsAt: dayAt(2, '10:00'), status: 'scheduled', note: 'Первичная консультация' },
    { id: 'appointment-2', patientId: patients[1].id, doctorId: doctors[1].id, serviceId: services[2].id, startsAt: dayAt(3, '11:00'), status: 'scheduled' },
    { id: 'appointment-3', patientId: patients[2].id, doctorId: doctors[2].id, serviceId: services[3].id, startsAt: dayAt(4, '09:30'), status: 'scheduled' },
    { id: 'appointment-4', patientId: patients[0].id, doctorId: doctors[4].id, serviceId: services[5].id, startsAt: dayAt(-7, '14:00'), status: 'completed' },
  ];
  const conclusions: MedicalConclusion[] = [
    { id: 'conclusion-1', appointmentId: 'appointment-4', patientId: patients[0].id, doctorId: doctors[4].id, createdAt: dayAt(-7, '14:40'), summary: 'Плановый осмотр. Рекомендовано контрольное посещение через год.' },
    { id: 'conclusion-2', appointmentId: 'appointment-2', patientId: patients[1].id, doctorId: doctors[1].id, createdAt: dayAt(-30, '12:00'), summary: 'Рекомендованы регулярная физическая активность и контроль давления.' },
  ];
  const labTests: LabTest[] = [
    { id: 'lab-1', patientId: patients[0].id, appointmentId: 'appointment-1', name: 'Общий анализ крови', orderedAt: dayAt(-2, '09:00'), status: 'completed', result: 'Показатели в пределах референсных значений.' },
    { id: 'lab-2', patientId: patients[1].id, appointmentId: 'appointment-2', name: 'Липидный профиль', orderedAt: dayAt(0, '10:00'), status: 'in_progress' },
    { id: 'lab-3', patientId: patients[2].id, appointmentId: 'appointment-3', name: 'Ферритин', orderedAt: dayAt(0, '10:30'), status: 'ordered' },
  ];
  const callbacks: CallbackRequest[] = [
    { id: 'callback-1', name: 'Канат', phone: '+7 701 000 11 22', preferredTime: 'После 16:00', createdAt: dayAt(-1, '12:30'), status: 'new' },
    { id: 'callback-2', name: 'Жанар', phone: '+7 702 000 22 33', createdAt: dayAt(-2, '09:10'), status: 'contacted' },
  ];

  return { version: 1, clinic, users, doctors, services, patients, appointments, conclusions, labTests, callbacks };
=======
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
>>>>>>> 46ee541 (Set up clinic foundation and public flows)
}
