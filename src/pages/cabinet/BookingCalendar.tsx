import { ArrowLeft, ArrowRight } from 'lucide-react'
import { toDateKey, weekdayFormat } from './format'
import { EmptyState, LoadingNote } from './CabinetLayout'

const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function monthCells(month: Date): (Date | null)[] {
  const first = startOfMonth(month)
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index + 1)),
  ]
}

export type BookingCalendarProps = {
  availability: Record<string, number>
  selectedDate: string
  visibleMonth: Date
  minDate: Date
  maxDate: Date
  loading?: boolean
  error?: string
  horizonLabel?: string
  emptyMessage?: string
  onSelect: (date: string) => void
  onMonthChange: (offset: number) => void
}

/** Shared availability calendar for patient booking and appointment rescheduling. */
export function BookingCalendar({
  availability,
  selectedDate,
  visibleMonth,
  minDate,
  maxDate,
  loading = false,
  error = '',
  horizonLabel = 'Показываем доступность в указанном диапазоне.',
  emptyMessage = 'Свободных дат нет.',
  onSelect,
  onMonthChange,
}: BookingCalendarProps) {
  const dates = monthCells(visibleMonth)
  const firstMonth = startOfMonth(minDate)
  const lastMonth = startOfMonth(maxDate)
  const minKey = toDateKey(minDate)
  const maxKey = toDateKey(maxDate)
  const hasAvailableDates = dates.some((day) => {
    if (!day) return false
    const key = toDateKey(day)
    return key >= minKey && key <= maxKey && (availability[key] ?? 0) > 0
  })

  return (
    <div className="booking-calendar" role="group" aria-label="Свободные даты">
      <div className="booking-calendar__header">
        <strong>{monthFormat.format(visibleMonth)}</strong>
        <div className="booking-calendar__controls">
          <button type="button" aria-label="Предыдущий месяц" disabled={visibleMonth.getTime() <= firstMonth.getTime()} onClick={() => onMonthChange(-1)}><ArrowLeft size={16} /></button>
          <button type="button" aria-label="Следующий месяц" disabled={visibleMonth.getTime() >= lastMonth.getTime()} onClick={() => onMonthChange(1)}><ArrowRight size={16} /></button>
        </div>
      </div>
      <div className="booking-calendar__grid booking-calendar__weekdays" aria-hidden="true">
        {weekDays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="booking-calendar__grid">
        {dates.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} className="booking-calendar__blank" />
          const key = toDateKey(day)
          const availableCount = availability[key] ?? 0
          const inRange = key >= minKey && key <= maxKey
          const isAvailable = inRange && availableCount > 0
          return (
            <button
              key={key}
              type="button"
              className={`booking-calendar__day ${isAvailable ? 'booking-calendar__day--available' : ''} ${selectedDate === key ? 'booking-calendar__day--selected' : ''}`}
              disabled={!isAvailable || loading}
              aria-pressed={selectedDate === key}
              aria-label={`${weekdayFormat.format(day)} ${day.getDate()} ${monthFormat.format(day)}${isAvailable ? ', есть свободное время' : ', свободного времени нет'}`}
              title={isAvailable ? 'Есть свободное время' : 'Свободного времени нет'}
              onClick={() => onSelect(key)}
            >
              <span>{day.getDate()}</span>
              {isAvailable && <i aria-hidden="true" />}
            </button>
          )
        })}
      </div>
      <p className="booking-calendar__legend"><i aria-hidden="true" />Есть свободное время</p>
      <p className="booking-calendar__horizon">{horizonLabel}</p>
      {loading && <LoadingNote>Проверяем свободные даты…</LoadingNote>}
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {!loading && !error && !hasAvailableDates && Object.keys(availability).length > 0 && <EmptyState>{emptyMessage}</EmptyState>}
    </div>
  )
}
