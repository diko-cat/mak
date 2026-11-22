import type { Doctor, DoctorAbsence, WorkingHours, WorkingInterval } from '../types'

export const SLOT_STEP_MINUTES = 30

/** Порядок дней в интерфейсе: понедельник … воскресенье (значения `Date.getDay()`). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
export const WEEKDAY_NAMES: Record<number, string> = { 0: 'Вс', 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб' }

const DEFAULT_INTERVAL: WorkingInterval = { start: '09:00', end: '17:00' }

/** Прежнее поведение для врачей без настроенного графика: ежедневно 09:00–17:00. */
export const defaultWorkingHours = (): WorkingHours =>
  Object.fromEntries(WEEK_ORDER.map((day) => [day, { ...DEFAULT_INTERVAL }])) as WorkingHours

export function weekdayHours(start: string, end: string, days: number[]): WorkingHours {
  return Object.fromEntries(WEEK_ORDER.map((day) => [day, days.includes(day) ? { start, end } : null])) as WorkingHours
}

export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const isValidTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)

/** Рабочий интервал врача на дату (YYYY-MM-DD) или `null`, если день нерабочий. */
export function intervalFor(doctor: Doctor, dateKey: string): WorkingInterval | null {
  const absences: DoctorAbsence[] = doctor.absences ?? (doctor.daysOff ?? []).map((date) => ({ from: date, to: date, reason: 'Отпуск' as const }))
  if (absences.some(({ from, to }) => dateKey >= from && dateKey <= to)) return null
  if (doctor.scheduleOverrides && Object.prototype.hasOwnProperty.call(doctor.scheduleOverrides, dateKey)) {
    return doctor.scheduleOverrides[dateKey] ?? null
  }
  const weekday = new Date(`${dateKey}T00:00:00`).getDay()
  const hours = doctor.workingHours ?? defaultWorkingHours()
  return hours[weekday] ?? null
}

/** Укладывается ли приём [start; start+duration) в рабочее время врача. */
export function fitsWorkingHours(doctor: Doctor, startsAt: Date, durationMinutes: number): boolean {
  const dateKey = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, '0')}-${String(startsAt.getDate()).padStart(2, '0')}`
  const interval = intervalFor(doctor, dateKey)
  if (!interval) return false
  const start = startsAt.getHours() * 60 + startsAt.getMinutes()
  return start >= toMinutes(interval.start) && start + durationMinutes <= toMinutes(interval.end)
}

export function describeHours(hours: WorkingHours | undefined): string {
  const value = hours ?? defaultWorkingHours()
  const parts: string[] = []
  let group: number[] = []
  const flush = () => {
    if (!group.length) return
    const interval = value[group[0]]!
    const days = group.length > 1 ? `${WEEKDAY_NAMES[group[0]]}–${WEEKDAY_NAMES[group[group.length - 1]]}` : WEEKDAY_NAMES[group[0]]
    parts.push(`${days} ${interval.start}–${interval.end}`)
    group = []
  }
  for (const day of WEEK_ORDER) {
    const interval = value[day]
    const previous = group.length ? value[group[0]] : null
    if (interval && previous && interval.start === previous.start && interval.end === previous.end) group.push(day)
    else { flush(); if (interval) group.push(day) }
  }
  flush()
  return parts.join(', ') || 'Нет рабочих дней'
}

/**
 * Отсутствие врача, которое идёт в `fromKey`: последний день подряд идущих периодов
 * отсутствия и причина первого из них; `null`, если в этот день врач не отсутствует.
 */
export function absenceUntil(doctor: Doctor, fromKey: string): { until: string; reason: DoctorAbsence['reason'] } | null {
  const absences: DoctorAbsence[] = doctor.absences ?? (doctor.daysOff ?? []).map((date) => ({ from: date, to: date, reason: 'Отпуск' as const }))
  const covering = (key: string) => absences.find(({ from, to }) => key >= from && key <= to)
  const first = covering(fromKey)
  if (!first) return null
  let until = first.to
  for (;;) {
    const next = new Date(`${until}T00:00:00`)
    next.setDate(next.getDate() + 1)
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
    const continued = covering(key)
    if (!continued) return { until, reason: first.reason }
    until = continued.to > key ? continued.to : key
  }
}

/** От самого раннего начала до самого позднего конца; `null`, если интервалов нет. */
function span(intervals: (WorkingInterval | null | undefined)[]): WorkingInterval | null {
  const present = intervals.filter((interval): interval is WorkingInterval => Boolean(interval))
  if (!present.length) return null
  return {
    start: present.map((interval) => interval.start).sort()[0],
    end: present.map((interval) => interval.end).sort().at(-1)!,
  }
}

/** Часы работы клиники по дням: объединение графиков активных врачей. */
export function clinicWorkingHours(doctors: Doctor[]): WorkingHours {
  const hours = doctors.filter((doctor) => doctor.active !== false).map((doctor) => doctor.workingHours ?? defaultWorkingHours())
  return Object.fromEntries(WEEK_ORDER.map((day) => [day, span(hours.map((entry) => entry[day]))])) as WorkingHours
}

/** Самое раннее начало и самый поздний конец приёма за неделю. */
export const workingRange = (hours: WorkingHours) => span(WEEK_ORDER.map((day) => hours[day]))
