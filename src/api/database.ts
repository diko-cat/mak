import type {
  Appointment,
  CallRequest,
  Clinic,
  DemoAccount,
  Doctor,
  DoctorArrival,
  LabTest,
  MedicalConclusion,
  Patient,
  Service,
} from '../types'
import { weekdayHours } from './schedule'

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
  /** Отметки врачей о прибытии; в данных, сохранённых до этой версии, поля нет. */
  doctorArrivals: DoctorArrival[]
}

export const DATABASE_KEY = 'sana-clinic.database.v5'
const LEGACY_DATABASE_KEY = 'sana-clinic.database.v4'
const DEMO_DAY_KEY = `${DATABASE_KEY}.seed-day.v2`

const atDayAndHour = (dayOffset: number, hour: number, minute = 0) => {
  const value = new Date()
  value.setDate(value.getDate() + dayOffset)
  value.setHours(hour, minute, 0, 0)
  return value.toISOString()
}

/** Локальная дата приложения в формате YYYY-MM-DD. */
export function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Keep at least one demo visit later today whenever the doctor's schedule allows it. */
function todayDemoAppointments(): { first: string; second: string; firstServiceId: string } {
  const now = new Date()
  const first = new Date(now)
  first.setHours(0, 0, 0, 0)
  const elapsedToday = now.getTime() - first.getTime()
  first.setMinutes(Math.ceil((elapsedToday + 1) / (30 * 60_000)) * 30)
  const opening = new Date(now)
  opening.setHours(9, 0, 0, 0)
  if (first < opening) first.setTime(opening.getTime())

  const tomorrowAt = (hour: number) => {
    const value = new Date(now)
    value.setDate(value.getDate() + 1)
    value.setHours(hour, 0, 0, 0)
    return value
  }
  const closingMinutes = 23 * 60 + 30
  const firstMinutes = first.getHours() * 60 + first.getMinutes()
  const firstServiceId = firstMinutes + 45 <= closingMinutes ? 'service-1' : 'service-2'
  const firstDuration = firstServiceId === 'service-1' ? 45 : 30
  if (firstMinutes + firstDuration > closingMinutes) {
    const nextFirst = tomorrowAt(9)
    const nextSecond = tomorrowAt(11)
    return { first: nextFirst.toISOString(), second: nextSecond.toISOString(), firstServiceId: 'service-1' }
  }

  const secondMinutes = Math.ceil((firstMinutes + firstDuration) / 30) * 30
  const second = new Date(first)
  second.setHours(Math.floor(secondMinutes / 60), secondMinutes % 60, 0, 0)
  if (secondMinutes + 30 > closingMinutes) second.setTime(tomorrowAt(11).getTime())
  const iso = (value: Date) => value.toISOString()
  return { first: iso(first), second: iso(second), firstServiceId }
}

function refreshDailyDemoAppointments(database: MockDatabase): void {
  if (typeof window === 'undefined') return
  const today = localDayKey()
  if (window.localStorage.getItem(DEMO_DAY_KEY) === today) return
  const demoDoctor = database.doctors.find((doctor) => doctor.id === 'doctor-1')
  const priorDemoHours = Object.values(demoDoctor?.workingHours ?? {})
  if (demoDoctor && priorDemoHours.length === 7 && priorDemoHours.every((interval) => interval?.start === '09:00' && interval.end === '21:00')) {
    demoDoctor.workingHours = weekdayHours('09:00', '23:30', [0, 1, 2, 3, 4, 5, 6])
  }
  const { first, second, firstServiceId } = todayDemoAppointments()
  const firstSeed = database.appointments.find((appointment) => appointment.id === 'appointment-7')
  const secondSeed = database.appointments.find((appointment) => appointment.id === 'appointment-8')
  if (firstSeed) {
    firstSeed.startsAt = first
    firstSeed.serviceId = firstServiceId
    firstSeed.status = 'confirmed'
    delete firstSeed.cancelledBy
    delete firstSeed.cancellationReason
    delete firstSeed.noShowMarkedBy
    delete firstSeed.noShowReason
    delete firstSeed.rescheduledFrom
    delete firstSeed.rescheduledBy
    delete firstSeed.rescheduledAt
  }
  if (secondSeed) {
    secondSeed.startsAt = second
    secondSeed.status = 'requested'
    delete secondSeed.cancelledBy
    delete secondSeed.cancellationReason
    delete secondSeed.noShowMarkedBy
    delete secondSeed.noShowReason
    delete secondSeed.rescheduledFrom
    delete secondSeed.rescheduledBy
    delete secondSeed.rescheduledAt
  }
  window.localStorage.setItem(DEMO_DAY_KEY, today)
  writeDatabase(database)
}

function migrateDaysOff(database: MockDatabase): boolean {
  let migrated = false
  for (const doctor of database.doctors) {
    if (!doctor.daysOff?.length) continue
    const current = doctor.absences ?? []
    const dates = [...new Set(doctor.daysOff)].sort()
    const converted: NonNullable<Doctor['absences']> = []
    let from = dates[0]
    let previous = from
    for (const date of dates.slice(1)) {
      const [year, month, day] = date.split('-').map(Number)
      const [previousYear, previousMonth, previousDay] = previous.split('-').map(Number)
      const gap = (Date.UTC(year, month - 1, day) - Date.UTC(previousYear, previousMonth - 1, previousDay)) / 86_400_000
      if (gap > 1) {
        converted.push({ from, to: previous, reason: 'Отпуск' })
        from = date
      }
      previous = date
    }
    if (from) converted.push({ from, to: previous, reason: 'Отпуск' })
    doctor.absences = [...current, ...converted]
    delete doctor.daysOff
    migrated = true
  }
  return migrated
}

const isArrival = (value: unknown): value is DoctorArrival => {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  return typeof entry.doctorId === 'string'
    && typeof entry.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    && typeof entry.arrivedAt === 'string' && !Number.isNaN(new Date(entry.arrivedAt).getTime())
}

/** Добавляет `doctorArrivals` в старые данные, убирает битые записи и дубли (оставляет самую раннюю отметку). */
function normalizeArrivals(database: MockDatabase): boolean {
  const source: unknown[] = Array.isArray(database.doctorArrivals) ? database.doctorArrivals : []
  const byDay = new Map<string, DoctorArrival>()
  for (const entry of source.filter(isArrival)) {
    const key = `${entry.doctorId}|${entry.date}`
    const current = byDay.get(key)
    if (!current || entry.arrivedAt < current.arrivedAt) byDay.set(key, { doctorId: entry.doctorId, date: entry.date, arrivedAt: entry.arrivedAt })
  }
  const normalized = [...byDay.values()]
  const changed = !Array.isArray(database.doctorArrivals) || normalized.length !== source.length
  database.doctorArrivals = normalized
  return changed
}

/** YYYY-MM-DD через `dayOffset` дней от сегодня, в локальном времени. */
const dayKey = (dayOffset: number) => {
  const value = new Date()
  value.setDate(value.getDate() + dayOffset)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function createSeedDatabase(): MockDatabase {
  const doctors: Doctor[] = [
    { id: 'doctor-1', name: 'Айгерим Сейтова', specialty: 'Кардиолог', profession: 'physician', description: 'Профилактика и лечение заболеваний сердца. Объясняет сложное простыми словами.', experienceYears: 14, education: 'КазНМУ им. С. Асфендиярова, ординатура по кардиологии; стажировка в Национальном научном кардиохирургическом центре', rating: 4.9, initials: 'АС', accent: 'sage', room: '204', workingHours: weekdayHours('09:00', '23:30', [0, 1, 2, 3, 4, 5, 6]) },
    { id: 'doctor-2', name: 'Данияр Ахметов', specialty: 'Невролог', profession: 'physician', description: 'Помогает вернуть спокойный сон, ясность и свободу движения.', experienceYears: 11, education: 'Медицинский университет Астана, ординатура по неврологии; курс по лечению головной боли', rating: 4.9, initials: 'ДА', accent: 'blue', room: '208', workingHours: weekdayHours('09:00', '17:00', [1, 2, 3, 4, 5, 6, 0]) },
    { id: 'doctor-3', name: 'Жанна Ким', specialty: 'Педиатр', profession: 'physician', description: 'Бережно заботится о детях и всегда находит общий язык с родителями.', experienceYears: 16, education: 'КазНМУ им. С. Асфендиярова, ординатура по педиатрии; сертификат IBCLC по грудному вскармливанию', rating: 5.0, initials: 'ЖК', accent: 'rose', room: '112', workingHours: weekdayHours('08:00', '16:00', [1, 2, 3, 4, 5, 6, 0]) },
    { id: 'doctor-4', name: 'Марат Нурланов', specialty: 'Дерматолог', profession: 'physician', description: 'Доказательный подход к здоровью кожи и её ежедневному уходу.', experienceYears: 9, education: 'Медицинский университет Караганды, ординатура по дерматовенерологии; курс дерматоскопии', rating: 4.8, initials: 'МН', accent: 'sand', room: '305', workingHours: weekdayHours('10:00', '18:00', [1, 2, 3, 4, 5, 6, 0]) },
    { id: 'doctor-5', name: 'Алина Омарова', specialty: 'Гинеколог', profession: 'physician', description: 'Деликатные консультации и внимание к каждому этапу жизни.', experienceYears: 12, education: 'КазНМУ им. С. Асфендиярова, ординатура по акушерству и гинекологии', rating: 4.9, initials: 'АО', accent: 'lilac', room: '210', absences: [{ from: dayKey(0), to: dayKey(9), reason: 'Отпуск' }], workingHours: weekdayHours('09:00', '17:00', [1, 2, 3, 4, 5]) },
    { id: 'doctor-6', name: 'Руслан Ибраев', specialty: 'Врач УЗИ', profession: 'physician', description: 'Точная диагностика и подробные ответы сразу после исследования.', experienceYears: 10, education: 'Медицинский университет Семей, ординатура по лучевой диагностике; сертификат экспертного УЗИ', rating: 4.8, initials: 'РИ', accent: 'mint', room: '118', workingHours: weekdayHours('08:00', '14:00', [1, 2, 3, 4, 5, 6]) },
    { id: 'doctor-7', name: 'Гульнара Бекова', specialty: 'Лаборант', profession: 'clinical-specialist', description: 'Аккуратный и почти незаметный забор анализов, результаты — в личном кабинете.', experienceYears: 8, education: 'Медицинский колледж Алматы, специальность «Лабораторная диагностика»', rating: 4.9, initials: 'ГБ', accent: 'sage', room: '101', workingHours: weekdayHours('08:00', '12:00', [1, 2, 3, 4, 5, 6, 0]) },
    { id: 'doctor-8', name: 'Ержан Тулегенов', specialty: 'Кардиолог', profession: 'physician', description: 'Кардиолог-аритмолог. Сейчас в отпуске, запись временно закрыта.', experienceYears: 18, education: 'КазНМУ им. С. Асфендиярова, ординатура по кардиологии; курс по аритмологии', rating: 4.8, initials: 'ЕТ', accent: 'blue', room: '206', active: false, workingHours: weekdayHours('09:00', '17:00', [1, 2, 3, 4, 5]) },
  ]

  const patients: Patient[] = [
    { id: 'patient-1', name: 'Алия Турсунова', email: 'aliya@example.test', phone: '+7 701 234 56 78', birthDate: '1993-04-18', cardNumber: 'МК-2026-0418' },
    { id: 'patient-2', name: 'Ерлан Сериков', email: 'erlan@example.test', phone: '+7 702 345 67 89', birthDate: '1987-10-02', cardNumber: 'МК-2026-1002' },
    { id: 'patient-3', name: 'Мария Волкова', email: 'maria@example.test', phone: '+7 705 456 78 90', birthDate: '1998-01-27', cardNumber: 'МК-2026-0127' },
    { id: 'patient-4', name: 'Тимур Алиев', email: 'timur@example.test', phone: '+7 707 567 89 01', birthDate: '1979-07-11', cardNumber: 'МК-2026-0711' },
    { id: 'patient-5', name: 'София Исмаилова', email: 'sofia@example.test', phone: '+7 708 678 90 12', birthDate: '2001-12-05', cardNumber: 'МК-2026-1205' },
  ]

  const services: Service[] = [
    { id: 'service-1', name: 'Первичный приём кардиолога', category: 'Кардиология', description: 'Консультация и план обследования', price: 12000, durationMinutes: 45, specialty: 'Кардиолог' },
    { id: 'service-2', name: 'ЭКГ с расшифровкой', category: 'Кардиология', description: 'Электрокардиограмма и заключение врача', price: 6500, durationMinutes: 30, specialty: 'Кардиолог' },
    { id: 'service-3', name: 'Приём невролога', category: 'Неврология', description: 'Осмотр, консультация и рекомендации', price: 11000, durationMinutes: 45, specialty: 'Невролог' },
    { id: 'service-4', name: 'Приём педиатра', category: 'Педиатрия', description: 'Осмотр ребёнка и ответы на вопросы', price: 9500, durationMinutes: 40, specialty: 'Педиатр' },
    { id: 'service-5', name: 'Приём дерматолога', category: 'Дерматология', description: 'Консультация по вопросам здоровья кожи', price: 10000, durationMinutes: 40, specialty: 'Дерматолог' },
    { id: 'service-6', name: 'Приём гинеколога', category: 'Гинекология', description: 'Деликатная консультация и осмотр', price: 12000, durationMinutes: 45, specialty: 'Гинеколог' },
    { id: 'service-7', name: 'УЗИ органов брюшной полости', category: 'Диагностика', description: 'Исследование натощак, 4 зоны', price: 14000, durationMinutes: 40, specialty: 'Врач УЗИ' },
    { id: 'service-8', name: 'Общий анализ крови', category: 'Лаборатория', description: 'Забор крови и исследование 24 показателей', price: 4500, durationMinutes: 15, specialty: 'Лаборант' },
    { id: 'service-9', name: 'Биохимический анализ крови', category: 'Лаборатория', description: 'Базовый профиль из 12 показателей', price: 9500, durationMinutes: 15, specialty: 'Лаборант' },
    { id: 'service-10', name: 'Комплекс «Здоровое сердце»', category: 'Кардиология', description: 'Приём кардиолога, ЭКГ и базовые анализы', price: 24500, durationMinutes: 60, specialty: 'Кардиолог' },
  ]
  const demoToday = todayDemoAppointments()

  return {
    clinic: {
      id: 'clinic-sana',
      name: 'Клиника «Сана»',
      tagline: 'Здоровье начинается с внимания',
      description: 'Мы создали пространство, где современная медицина встречается с человеческим отношением. Внимательно слушаем, объясняем каждый шаг и вместе находим решение.',
      // Условные демо-контакты, не принадлежат реальной клинике.
      address: 'г. Алматы, ул. Демонстрационная, 15',
      phone: '+7 727 000 00 00',
      email: 'hello@sana.demo',
      workingHours: 'Ежедневно 08:00–18:00',
    },
    doctors: doctors.map((doctor) => doctor.id === 'doctor-1'
      ? { ...doctor, workingHours: weekdayHours('09:00', '23:30', [0, 1, 2, 3, 4, 5, 6]) }
      : doctor),
    services,
    patients,
    accounts: [
      { user: { id: 'user-admin', name: 'Администратор клиники', email: 'admin@sana.demo', role: 'admin' }, password: 'SanaAdmin2026' },
      { user: { id: 'user-doctor', name: doctors[0].name, email: 'doctor@sana.demo', role: 'doctor', doctorId: doctors[0].id }, password: 'SanaDoctor2026' },
      { user: { id: 'user-patient', name: patients[0].name, email: 'patient@sana.demo', role: 'patient', patientId: patients[0].id }, password: 'SanaPatient2026' },
    ],
    appointments: [
      { id: 'appointment-1', patientId: patients[0].id, doctorId: doctors[0].id, serviceId: services[0].id, startsAt: atDayAndHour(2, 10), status: 'confirmed', note: 'Учащённое сердцебиение по вечерам', ticketNumber: 'Т-101' },
      { id: 'appointment-2', patientId: patients[1].id, doctorId: doctors[1].id, serviceId: services[2].id, startsAt: atDayAndHour(1, 11, 30), status: 'requested', note: 'Головные боли после работы', ticketNumber: 'Т-102' },
      { id: 'appointment-3', patientId: patients[2].id, doctorId: doctors[2].id, serviceId: services[3].id, startsAt: atDayAndHour(3, 9), status: 'confirmed', note: 'Плановый осмотр', ticketNumber: 'Т-103' },
      { id: 'appointment-4', patientId: patients[3].id, doctorId: doctors[3].id, serviceId: services[4].id, startsAt: atDayAndHour(4, 14), status: 'requested', note: 'Сыпь на руках', ticketNumber: 'Т-104' },
      { id: 'appointment-5', patientId: patients[0].id, doctorId: doctors[0].id, serviceId: services[0].id, startsAt: atDayAndHour(-18, 12), status: 'completed', note: 'Перебои в работе сердца', ticketNumber: 'Т-088' },
      { id: 'appointment-6', patientId: patients[0].id, doctorId: doctors[3].id, serviceId: services[4].id, startsAt: atDayAndHour(-10, 15), status: 'cancelled', note: 'Консультация по уходу за кожей', ticketNumber: 'Т-093' },
      { id: 'appointment-7', patientId: patients[3].id, doctorId: doctors[0].id, serviceId: demoToday.firstServiceId === 'service-1' ? services[0].id : services[1].id, startsAt: demoToday.first, status: 'confirmed', note: 'Повышенное давление по утрам', ticketNumber: 'Т-105' },
      { id: 'appointment-8', patientId: patients[1].id, doctorId: doctors[0].id, serviceId: services[1].id, startsAt: demoToday.second, status: 'requested', note: 'Контрольная ЭКГ', ticketNumber: 'Т-106' },
      { id: 'appointment-9', patientId: patients[2].id, doctorId: doctors[0].id, serviceId: services[9].id, startsAt: atDayAndHour(1, 10), status: 'confirmed', note: 'Профилактический чек-ап', ticketNumber: 'Т-107' },
      { id: 'appointment-10', patientId: patients[3].id, doctorId: doctors[0].id, serviceId: services[1].id, startsAt: atDayAndHour(-30, 10), status: 'completed', note: 'Головокружение, скачки давления', ticketNumber: 'Т-071' },
      { id: 'appointment-11', patientId: patients[1].id, doctorId: doctors[1].id, serviceId: services[2].id, startsAt: atDayAndHour(-7, 15), status: 'completed', note: 'Приступы головной боли', ticketNumber: 'Т-091' },
    ],
    conclusions: [
      { id: 'conclusion-1', patientId: patients[0].id, doctorId: doctors[0].id, appointmentId: 'appointment-5', createdAt: atDayAndHour(-18, 13), diagnosis: 'Функциональная тахикардия', recommendations: 'Контроль пульса, режим сна, повторная консультация через месяц.' },
      { id: 'conclusion-2', patientId: patients[1].id, doctorId: doctors[1].id, appointmentId: 'appointment-11', createdAt: atDayAndHour(-7, 16), diagnosis: 'Мигрень без ауры', recommendations: 'Дневник головной боли, соблюдение режима сна.' },
      { id: 'conclusion-3', patientId: patients[3].id, doctorId: doctors[0].id, appointmentId: 'appointment-10', createdAt: atDayAndHour(-30, 11), diagnosis: 'Артериальная гипертензия 1 степени', recommendations: 'Измерять давление утром и вечером, ограничить соль, повторный приём через месяц.' },
    ],
    labTests: [
      {
        id: 'lab-1', patientId: patients[0].id, doctorId: doctors[0].id, name: 'Общий анализ крови', orderedAt: atDayAndHour(-4, 9), resultAt: atDayAndHour(-3, 12), status: 'ready', result: 'Снижен гемоглобин, повышена СОЭ',
        indicators: [
          { name: 'Гемоглобин', value: 112, unit: 'г/л', min: 120, max: 160 },
          { name: 'Лейкоциты', value: 6.2, unit: '×10⁹/л', min: 4, max: 9 },
          { name: 'Тромбоциты', value: 250, unit: '×10⁹/л', min: 150, max: 400 },
          { name: 'СОЭ', value: 18, unit: 'мм/ч', min: 2, max: 15 },
        ],
      },
      {
        id: 'lab-4', patientId: patients[0].id, doctorId: doctors[0].id, name: 'Биохимический анализ крови', orderedAt: atDayAndHour(-4, 9), resultAt: atDayAndHour(-2, 14), status: 'ready', result: 'Повышен общий холестерин',
        indicators: [
          { name: 'Холестерин общий', value: 6.4, unit: 'ммоль/л', min: 3, max: 5.2 },
          { name: 'Глюкоза', value: 5.1, unit: 'ммоль/л', min: 3.9, max: 6.1 },
          { name: 'АЛТ', value: 24, unit: 'Ед/л', min: 0, max: 41 },
        ],
      },
      { id: 'lab-5', patientId: patients[0].id, doctorId: doctors[0].id, name: 'Витамин D', orderedAt: atDayAndHour(-1, 9), status: 'in-progress' },
      { id: 'lab-2', patientId: patients[1].id, doctorId: doctors[1].id, name: 'Ферритин', orderedAt: atDayAndHour(-1, 10), status: 'in-progress' },
      { id: 'lab-3', patientId: patients[2].id, doctorId: doctors[2].id, name: 'Витамин D', orderedAt: atDayAndHour(-2, 11), status: 'ordered' },
    ],
    callRequests: [
      { id: 'call-1', name: 'Дана', phone: '+7 701 000 00 01', preferredTime: 'После 18:00', createdAt: atDayAndHour(-1, 15), status: 'new' },
      { id: 'call-2', name: 'Арман', phone: '+7 702 000 00 02', preferredTime: 'Утром', createdAt: atDayAndHour(-2, 10), status: 'contacted' },
    ],
    doctorArrivals: [],
  }
}

export function readDatabase(): MockDatabase {
  if (typeof window === 'undefined') return createSeedDatabase()

  const raw = window.localStorage.getItem(DATABASE_KEY)
  if (raw) {
    try {
      const database = JSON.parse(raw) as MockDatabase
      const migrated = migrateDaysOff(database)
      if (normalizeArrivals(database) || migrated) writeDatabase(database)
      refreshDailyDemoAppointments(database)
      return database
    } catch {
      window.localStorage.removeItem(DATABASE_KEY)
    }
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_DATABASE_KEY)
  if (legacyRaw) {
    try {
      const database = JSON.parse(legacyRaw) as MockDatabase
      migrateDaysOff(database)
      normalizeArrivals(database)
      writeDatabase(database)
      refreshDailyDemoAppointments(database)
      return database
    } catch {
      window.localStorage.removeItem(LEGACY_DATABASE_KEY)
    }
  }

  const database = createSeedDatabase()
  writeDatabase(database)
  window.localStorage.setItem(DEMO_DAY_KEY, localDayKey())
  return database
}

/** Replace local demo data while leaving the signed-in session in place. */
export function resetDemoDatabase(): MockDatabase {
  if (typeof window !== 'undefined') window.localStorage.removeItem(DEMO_DAY_KEY)
  const database = createSeedDatabase()
  writeDatabase(database)
  if (typeof window !== 'undefined') window.localStorage.setItem(DEMO_DAY_KEY, localDayKey())
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
