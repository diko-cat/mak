import { CalendarClock, Check, Clock3, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCalendarAvailability, getDaySlots, rescheduleAppointment, updateAppointmentStatus, updateLabTest } from '../../api'
import { fitsWorkingHours } from '../../api/schedule'
import { Button } from '../../components/ui'
import type { Appointment, AppointmentStatus, DaySlot, LabTest, Role } from '../../types'
import { EmptyState, LoadingNote, Panel, StatusPill } from '../cabinet/CabinetLayout'
import { errorMessage, formatDate, formatDateTime, formatPrice, formatTime, isScheduled, toDateKey } from '../cabinet/format'
import type { AdminState } from './useAdminData'

type StatusFilter = 'active' | 'requires-transfer' | 'to-mark' | AppointmentStatus | 'all'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Запланированные' },
  { value: 'requires-transfer', label: 'Требуют переноса' },
  { value: 'to-mark', label: 'Требуют отметки' },
  { value: 'requested', label: 'Ждут подтверждения' },
  { value: 'confirmed', label: 'Подтверждены' },
  { value: 'completed', label: 'Завершены' },
  { value: 'cancelled', label: 'Отменены' },
  { value: 'no-show', label: 'Не явился' },
  { value: 'all', label: 'Все' },
]

const actorLabels: Record<Role, string> = { patient: 'пациент', doctor: 'врач', admin: 'администратор' }

export function AdminAppointments({ admin }: { admin: AdminState }) {
  const data = admin.data!
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<StatusFilter>(() => searchParams.get('status') === 'requires-transfer' ? 'requires-transfer' : 'active')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const selectedAppointment = searchParams.get('appointment')
  const requestedAction = searchParams.get('action') === 'cancel' ? 'cancel' : 'reschedule'
  const excludeCurrentDoctor = searchParams.get('excludeDoctor') === '1'

  const isPastUnmarked = (item: Appointment) => isScheduled(item) && new Date(item.startsAt).getTime() <= Date.now()
  const needsTransfer = (item: Appointment) => {
    const doctor = admin.doctorOf(item.doctorId)
    if (!doctor || !isScheduled(item) || new Date(item.startsAt).getTime() <= Date.now()) return false
    return doctor.active === false || !fitsWorkingHours(doctor, new Date(item.startsAt), admin.serviceOf(item.serviceId)?.durationMinutes ?? 30)
  }
  const matchesStatus = (item: Appointment, filter: StatusFilter) => filter === 'all'
    || (filter === 'active' ? isScheduled(item)
      : filter === 'to-mark' ? isPastUnmarked(item)
        : filter === 'requires-transfer' ? needsTransfer(item)
          : item.status === filter)
  const list = useMemo(() => data.appointments
    .filter((item) => !doctorId || item.doctorId === doctorId)
    .filter((item) => !date || toDateKey(new Date(item.startsAt)) === date)
    .filter((item) => {
      const needle = query.trim().toLowerCase()
      if (!needle) return true
      const patient = admin.patientOf(item.patientId)
      return [patient?.name, patient?.phone, item.ticketNumber].some((value) => value?.toLowerCase().includes(needle))
    }), [data, doctorId, date, query, admin])
  const visible = list.filter((item) => matchesStatus(item, status))
  const countFor = (value: StatusFilter) => list.filter((item) => matchesStatus(item, value)).length
  const selectedRows = selectedAppointment ? visible.filter((item) => item.id === selectedAppointment) : visible

  return (
    <div className="stack">
      <Panel title="Записи пациентов">
        <div className="admin-filters">
          <label className="form-field cabinet-field">
            <span>Поиск</span>
            <input type="search" value={query} placeholder="Пациент, телефон или талон" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label className="form-field cabinet-field">
            <span>Врач</span>
            <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
              <option value="">Все врачи</option>
              {data.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
            </select>
          </label>
          <label className="form-field cabinet-field">
            <span>Дата</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
        <div className="segmented admin-segmented" role="tablist" aria-label="Статус записей">
          {statusFilters.map((option) => (
            <button key={option.value} type="button" role="tab" aria-selected={status === option.value} className={`segmented__item ${status === option.value ? 'segmented__item--active' : ''}`} onClick={() => setStatus(option.value)}>
              {option.label}<span className="segmented__count">{countFor(option.value)}</span>
            </button>
          ))}
        </div>
        {status === 'to-mark' && <p className="muted small">Здесь запланированные приёмы, время которых уже прошло и для которых ещё не указано завершение или неявка. Отменённые и завершённые записи не входят в список.</p>}
        {notice && <p className="form-message form-message--success" role="status">{notice}</p>}
        {selectedAppointment && selectedRows.length === 0 && <p className="form-message form-message--success" role="status">Запись обновлена или больше не требует действия. Выберите другую вкладку, чтобы увидеть весь список.</p>}
        {selectedRows.length === 0 ? <EmptyState>По выбранным условиям записей нет.</EmptyState> : (
          <ul className="appointment-list">
            {selectedRows.map((item) => <AppointmentItem key={item.id} appointment={item} admin={admin} onDone={setNotice} initialMode={selectedAppointment === item.id ? requestedAction : 'idle'} excludeCurrentDoctor={excludeCurrentDoctor} />)}
          </ul>
        )}
      </Panel>
      <Panel title={`Анализы · ${data.labTests.length}`}>
        {data.labTests.length === 0 ? <EmptyState>Назначенных анализов пока нет.</EmptyState> : <div className="stack">{data.labTests.map((test) => <AdminLabItem key={test.id} test={test} patientName={admin.patientOf(test.patientId)?.name ?? 'Пациент'} onChange={admin.reload} />)}</div>}
      </Panel>
    </div>
  )
}

const nextLabStatus: Record<LabTest['status'], LabTest['status'] | null> = { ordered: 'in-progress', 'in-progress': 'ready', ready: null }
const labStatusLabel: Record<LabTest['status'], string> = { ordered: 'Назначен', 'in-progress': 'В работе', ready: 'Готов' }

function AdminLabItem({ test, patientName, onChange }: { test: LabTest; patientName: string; onChange: () => Promise<void> }) {
  const [result, setResult] = useState(test.result ?? '')
  const [error, setError] = useState('')
  async function advance() {
    const status = nextLabStatus[test.status]
    if (!status) return
    try { await updateLabTest(test.id, { status }); await onChange() }
    catch (updateError) { setError(errorMessage(updateError, 'Не удалось обновить анализ.')) }
  }
  async function saveResult() {
    try { await updateLabTest(test.id, { result }); await onChange() }
    catch (updateError) { setError(errorMessage(updateError, 'Не удалось сохранить результат.')) }
  }
  return <div className="doctor-lab-row"><strong>{test.name} · {patientName}</strong><span className="muted">{labStatusLabel[test.status]}</span>{nextLabStatus[test.status] && <Button type="button" variant="secondary" className="button--compact" onClick={() => void advance()}>Перевести: {labStatusLabel[nextLabStatus[test.status]!]}</Button>}{test.status === 'ready' && <><label className="form-field cabinet-field"><span>Результат</span><textarea rows={2} value={result} onChange={(event) => setResult(event.target.value)} /></label><Button type="button" className="button--compact" onClick={() => void saveResult()}>Сохранить результат</Button></>}{test.result && <p>{test.result}</p>}{error && <p className="form-message form-message--error">{error}</p>}</div>
}

type Mode = 'idle' | 'reschedule' | 'cancel'

function AppointmentItem({ appointment, admin, onDone, initialMode, excludeCurrentDoctor }: { appointment: Appointment; admin: AdminState; onDone: (message: string) => void; initialMode: Mode; excludeCurrentDoctor: boolean }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [reason, setReason] = useState('по просьбе пациента')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const patient = admin.patientOf(appointment.patientId)
  const doctor = admin.doctorOf(appointment.doctorId)
  const service = admin.serviceOf(appointment.serviceId)
  const scheduled = isScheduled(appointment)
  const upcoming = new Date(appointment.startsAt).getTime() > Date.now()

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError('')
    try {
      await action()
      setMode('idle')
      onDone(message)
      await admin.reload()
    } catch (actionError) {
      setError(errorMessage(actionError, 'Не удалось выполнить действие.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="appointment-row admin-appointment">
      <div className="appointment-row__date">
        {appointment.rescheduledFrom ? <>
          <small>Новая дата</small>
          <strong>{formatDate(appointment.startsAt)}</strong>
          <span><Clock3 size={13} aria-hidden="true" />{formatTime(appointment.startsAt)}</span>
        </> : <>
          <strong>{formatDate(appointment.startsAt)}</strong>
          <span><Clock3 size={13} aria-hidden="true" />{formatTime(appointment.startsAt)}</span>
        </>}
      </div>
      <div className="appointment-row__body">
        <strong>{patient?.name ?? 'Пациент'}</strong>
        <span className="muted">{service?.name ?? 'Услуга'} · {doctor?.name ?? 'Врач'}</span>
        <div className="appointment-row__chips">
          {appointment.ticketNumber && <span>Талон {appointment.ticketNumber}</span>}
          {patient?.phone && <span>{patient.phone}</span>}
          {service && <span>{formatPrice(service.price)}</span>}
        </div>
          {appointment.note && <span className="muted small">Причина: {appointment.note}</span>}
          {appointment.rescheduledFrom && <span className="muted small">Перенесено: {formatDate(appointment.rescheduledFrom)} {formatTime(appointment.rescheduledFrom)} → {formatDate(appointment.startsAt)} {formatTime(appointment.startsAt)}</span>}
          {appointment.rescheduledBy && <span className="muted small">Кто перенёс: {actorLabels[appointment.rescheduledBy]}</span>}
          {appointment.rescheduledAt && <span className="muted small">Время переноса: {formatDateTime(appointment.rescheduledAt)}</span>}
          {appointment.status === 'cancelled' && appointment.cancelledBy && <span className="muted small">Кто отменил: {actorLabels[appointment.cancelledBy]}</span>}
          {appointment.status === 'cancelled' && appointment.cancellationReason && <span className="muted small">Причина отмены: {appointment.cancellationReason}</span>}
          {appointment.status === 'no-show' && appointment.noShowMarkedBy && <span className="muted small">Неявку отметил: {actorLabels[appointment.noShowMarkedBy]}</span>}
          {appointment.status === 'no-show' && appointment.noShowReason && <span className="muted small">Причина неявки: {appointment.noShowReason}</span>}
      </div>
      <div className="appointment-row__side">
        <StatusPill status={appointment.status} />
        {scheduled && mode === 'idle' && (
          <div className="row-actions admin-actions">
            {appointment.status === 'requested' && (
              <Button type="button" className="button--compact" disabled={busy} onClick={() => void run(() => updateAppointmentStatus(appointment.id, 'confirmed'), `Запись ${appointment.ticketNumber ?? ''} подтверждена.`)}>
                <Check size={14} aria-hidden="true" />Подтвердить
              </Button>
            )}
            {upcoming && <Button type="button" variant="secondary" className="button--compact" disabled={busy} onClick={() => setMode('reschedule')}><CalendarClock size={14} aria-hidden="true" />Перенести</Button>}
            {!upcoming && <Button type="button" variant="secondary" className="button--compact" disabled={busy} onClick={() => void run(() => updateAppointmentStatus(appointment.id, 'no-show'), 'Отмечено: пациент не явился.')}>Не явился</Button>}
            <Button type="button" variant="quiet" className="button--compact" disabled={busy} onClick={() => setMode('cancel')}><X size={14} aria-hidden="true" />Отменить</Button>
          </div>
        )}
      </div>

      {mode === 'cancel' && (
        <div className="confirm-box">
          <p>Отменить приём {patient?.name ?? 'пациента'} {formatDate(appointment.startsAt)} в {formatTime(appointment.startsAt)}? Слот освободится для других пациентов.</p>
          <label className="form-field cabinet-field"><span>Причина отмены</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option>по просьбе пациента</option><option>болезнь врача</option><option>ошибка записи</option><option>другое</option></select></label>
          <div className="row-actions">
            <Button type="button" className="button--compact button--danger" disabled={busy} onClick={() => void run(() => updateAppointmentStatus(appointment.id, 'cancelled', reason), 'Приём отменён.')}>{busy ? 'Отменяем…' : 'Да, отменить'}</Button>
            <Button type="button" variant="secondary" className="button--compact" disabled={busy} onClick={() => setMode('idle')}>Не отменять</Button>
          </div>
        </div>
      )}

      {mode === 'reschedule' && (
        <ReschedulePicker
          appointment={appointment}
          admin={admin}
          excludeCurrentDoctor={excludeCurrentDoctor}
          busy={busy}
          onCancel={() => { setMode('idle'); setError('') }}
          onSubmit={(startsAt, nextDoctorId) => void run(() => rescheduleAppointment(appointment.id, startsAt, nextDoctorId), `Приём перенесён на ${formatDate(startsAt)}, ${formatTime(startsAt)}.`)}
        />
      )}
      {error && <p className="form-message form-message--error admin-appointment__error" role="alert">{error}</p>}
    </li>
  )
}

function ReschedulePicker({ appointment, admin, busy, excludeCurrentDoctor, onCancel, onSubmit }: {
  appointment: Appointment
  admin: AdminState
  busy: boolean
  excludeCurrentDoctor: boolean
  onCancel: () => void
  onSubmit: (startsAt: string, doctorId: string) => void
}) {
  const service = admin.serviceOf(appointment.serviceId)
  const currentDoctor = admin.doctorOf(appointment.doctorId)
  const specialty = currentDoctor?.specialty ?? service?.specialty
  const candidates = (admin.data?.doctors ?? []).filter((doctor) => doctor.active !== false && (!specialty || doctor.specialty === specialty) && (!excludeCurrentDoctor || doctor.id !== appointment.doctorId))
  const [doctorId, setDoctorId] = useState(currentDoctor?.active === false || excludeCurrentDoctor ? candidates[0]?.id ?? '' : appointment.doctorId)
  const todayKey = toDateKey(new Date())
  const bookingDateKeys = useMemo(() => Array.from({ length: 60 }, (_, offset) => {
    const date = new Date(`${todayKey}T00:00:00`)
    date.setDate(date.getDate() + offset)
    return toDateKey(date)
  }), [todayKey])
  const lastBookingDate = bookingDateKeys[bookingDateKeys.length - 1]
  const appointmentDate = toDateKey(new Date(appointment.startsAt))
  const firstDate = appointmentDate >= todayKey && appointmentDate <= lastBookingDate ? appointmentDate : todayKey
  const [date, setDate] = useState(firstDate)
  const [month, setMonth] = useState(() => { const value = new Date(`${firstDate}T00:00:00`); return new Date(value.getFullYear(), value.getMonth(), 1) })
  const [slots, setSlots] = useState<DaySlot[] | null>(null)
  const [slot, setSlot] = useState('')
  const [error, setError] = useState('')
  const [earliest, setEarliest] = useState('')
  const [availability, setAvailability] = useState<Record<string, number>>({})
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const firstMonth = new Date(new Date(`${todayKey}T00:00:00`).getFullYear(), new Date(`${todayKey}T00:00:00`).getMonth(), 1)
  const lastDateValue = new Date(`${lastBookingDate}T00:00:00`)
  const lastMonth = new Date(lastDateValue.getFullYear(), lastDateValue.getMonth(), 1)
  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const beforeFirst = (first.getDay() + 6) % 7
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return Array.from({ length: 42 }, (_, index) => {
      const dayNumber = index - beforeFirst + 1
      return dayNumber < 1 || dayNumber > daysInMonth ? null : new Date(month.getFullYear(), month.getMonth(), dayNumber)
    })
  }, [month])
  const monthFormat = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

  useEffect(() => {
    if (!doctorId || !service) { setAvailability({}); return }
    let active = true
    setCalendarLoading(true); setCalendarError('')
    getCalendarAvailability(doctorId, bookingDateKeys, service.durationMinutes, appointment.id)
      .then((counts) => { if (active) setAvailability(counts) })
      .catch((loadError: unknown) => { if (active) setCalendarError(errorMessage(loadError, 'Не удалось загрузить календарь.')) })
      .finally(() => { if (active) setCalendarLoading(false) })
    return () => { active = false }
  }, [doctorId, service, appointment.id, bookingDateKeys])

  useEffect(() => {
    setSlots(null); setSlot(''); setEarliest('')
    if (!doctorId || !date) return
    let active = true
    getDaySlots(doctorId, date, service?.durationMinutes ?? 30, appointment.id)
      .then((result) => { if (active) { setSlots(result); setError('') } })
      .catch((slotError: unknown) => { if (active) { setSlots([]); setError(errorMessage(slotError, 'Не удалось загрузить слоты.')) } })
    return () => { active = false }
  }, [doctorId, date, service, appointment.id])

  useEffect(() => {
    if (!doctorId || !service) return
    let active = true
    const search = async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      for (let offset = 0; offset < 45; offset += 1) {
        const day = new Date(start); day.setDate(day.getDate() + offset)
        const dayKey = toDateKey(day)
        const found = (await getDaySlots(doctorId, dayKey, service.durationMinutes, appointment.id)).find((entry) => entry.available)
        if (found) { if (active) setEarliest(`${new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(new Date(found.startsAt))}, ${formatTime(found.startsAt)}`); return }
      }
      if (active) setEarliest('Нет свободного времени в ближайшие 45 дней')
    }
    void search().catch(() => { if (active) setEarliest('Не удалось найти свободное время') })
    return () => { active = false }
  }, [doctorId, service, appointment.id])

  return (
    <div className="admin-reschedule">
      <p className="detail-block__label">Перенос приёма · {service?.durationMinutes ?? 30} мин</p>
      {!candidates.length && <EmptyState>Нет доступных врачей этой специальности.</EmptyState>}
      {candidates.length > 0 && <p className="muted small">Ближайшее свободное: {earliest || 'ищем…'}</p>}
      {candidates.length > 0 && <>
      <div className="admin-filters admin-filters--two">
        <label className="form-field cabinet-field">
          <span>Врач</span>
          <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
            {candidates.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
          </select>
        </label>
        <div className="admin-reschedule-calendar" role="group" aria-label="Выбор новой даты">
          <div className="admin-reschedule-calendar__head"><strong>{monthFormat.format(month)}</strong><div className="row-actions"><Button type="button" variant="quiet" className="button--compact" aria-label="Предыдущий месяц" disabled={month.getTime() <= firstMonth.getTime()} onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}>←</Button><Button type="button" variant="quiet" className="button--compact" aria-label="Следующий месяц" disabled={month.getTime() >= lastMonth.getTime()} onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}>→</Button></div></div>
          <div className="admin-reschedule-calendar__grid admin-reschedule-calendar__weekdays" aria-hidden="true">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="admin-reschedule-calendar__grid">{monthDays.map((day, index) => {
            if (!day) return <span className="admin-reschedule-calendar__blank" key={`blank-${index}`} />
            const key = toDateKey(day)
            const count = availability[key] ?? 0
            const available = key >= todayKey && key <= lastBookingDate && count > 0
            return <button key={key} type="button" className={`admin-reschedule-calendar__day ${available ? 'admin-reschedule-calendar__day--available' : ''} ${date === key ? 'admin-reschedule-calendar__day--selected' : ''}`} disabled={!available || calendarLoading} aria-pressed={date === key} aria-label={`${day.toLocaleDateString('ru-RU')}${available ? `, свободных слотов: ${count}` : ', нет свободных слотов'}`} onClick={() => { setDate(key); setSlot('') }}><span>{day.getDate()}</span>{available && <i aria-hidden="true" />}</button>
          })}</div>
          <p className="booking-calendar__legend"><i aria-hidden="true" />Есть свободное время</p>
          {calendarLoading && <LoadingNote>Проверяем свободные даты…</LoadingNote>}
          {calendarError && <p className="form-message form-message--error" role="alert">{calendarError}</p>}
          {date && <Button type="button" variant="quiet" className="button--compact" onClick={() => { setDate(''); setSlot(''); setSlots(null) }}>Очистить дату</Button>}
        </div>
      </div>
      {!date ? <EmptyState>Выберите дату, чтобы увидеть свободные слоты.</EmptyState> : !slots ? <LoadingNote>Загружаем расписание…</LoadingNote> : slots.every((entry) => !entry.available) ? (
        <EmptyState>{slots.length === 0 ? 'В этот день врач не принимает.' : 'Свободного времени нет — выберите другую дату.'}</EmptyState>
      ) : (
        <div className="slot-grid">
          {slots.map((entry) => {
            const current = entry.startsAt === new Date(appointment.startsAt).toISOString() && doctorId === appointment.doctorId
            return (
              <button key={entry.startsAt} type="button" className={`slot ${slot === entry.startsAt ? 'slot--active' : ''}`} disabled={!entry.available || current} aria-pressed={slot === entry.startsAt} title={current ? 'Текущее время приёма' : entry.reason === 'busy' ? 'Время занято' : entry.reason === 'past' ? 'Время уже прошло' : undefined} onClick={() => setSlot(entry.startsAt)}>
                {formatTime(entry.startsAt)}
              </button>
            )
          })}
        </div>
      )}
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      <div className="row-actions admin-reschedule__foot">
        <Button type="button" className="button--compact" disabled={!slot || busy} onClick={() => onSubmit(slot, doctorId)}>{busy ? 'Переносим…' : slot ? `Перенести на ${formatTime(slot)}` : 'Выберите время'}</Button>
        <Button type="button" variant="secondary" className="button--compact" disabled={busy} onClick={onCancel}>Отмена</Button>
      </div>
      </>}
    </div>
  )
}
