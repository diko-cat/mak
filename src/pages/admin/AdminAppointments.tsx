import { CalendarClock, Check, Clock3, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getDaySlots, rescheduleAppointment, updateAppointmentStatus } from '../../api'
import { Button } from '../../components/ui'
import type { Appointment, AppointmentStatus, DaySlot } from '../../types'
import { EmptyState, LoadingNote, Panel, StatusPill } from '../cabinet/CabinetLayout'
import { errorMessage, formatDate, formatPrice, formatTime, isScheduled, toDateKey } from '../cabinet/format'
import type { AdminState } from './useAdminData'

type StatusFilter = 'active' | AppointmentStatus | 'all'

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Запланированные' },
  { value: 'requested', label: 'Ждут подтверждения' },
  { value: 'confirmed', label: 'Подтверждены' },
  { value: 'completed', label: 'Завершены' },
  { value: 'cancelled', label: 'Отменены' },
  { value: 'all', label: 'Все' },
]

export function AdminAppointments({ admin }: { admin: AdminState }) {
  const data = admin.data!
  const [status, setStatus] = useState<StatusFilter>('active')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')

  const matchesStatus = (item: Appointment) => status === 'all' || (status === 'active' ? isScheduled(item) : item.status === status)
  const list = useMemo(() => data.appointments
    .filter((item) => !doctorId || item.doctorId === doctorId)
    .filter((item) => !date || toDateKey(new Date(item.startsAt)) === date)
    .filter((item) => {
      const needle = query.trim().toLowerCase()
      if (!needle) return true
      const patient = admin.patientOf(item.patientId)
      return [patient?.name, patient?.phone, item.ticketNumber].some((value) => value?.toLowerCase().includes(needle))
    }), [data, doctorId, date, query, admin])
  const visible = list.filter(matchesStatus)
  const countFor = (value: StatusFilter) => list.filter((item) => value === 'all' || (value === 'active' ? isScheduled(item) : item.status === value)).length

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
        {notice && <p className="form-message form-message--success" role="status">{notice}</p>}
        {visible.length === 0 ? <EmptyState>По выбранным условиям записей нет.</EmptyState> : (
          <ul className="appointment-list">
            {visible.map((item) => <AppointmentItem key={item.id} appointment={item} admin={admin} onDone={setNotice} />)}
          </ul>
        )}
      </Panel>
    </div>
  )
}

type Mode = 'idle' | 'reschedule' | 'cancel'

function AppointmentItem({ appointment, admin, onDone }: { appointment: Appointment; admin: AdminState; onDone: (message: string) => void }) {
  const [mode, setMode] = useState<Mode>('idle')
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
        <strong>{formatDate(appointment.startsAt)}</strong>
        <span><Clock3 size={13} aria-hidden="true" />{formatTime(appointment.startsAt)}</span>
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
            <Button type="button" variant="quiet" className="button--compact" disabled={busy} onClick={() => setMode('cancel')}><X size={14} aria-hidden="true" />Отменить</Button>
          </div>
        )}
      </div>

      {mode === 'cancel' && (
        <div className="confirm-box">
          <p>Отменить приём {patient?.name ?? 'пациента'} {formatDate(appointment.startsAt)} в {formatTime(appointment.startsAt)}? Слот освободится для других пациентов.</p>
          <div className="row-actions">
            <Button type="button" className="button--compact button--danger" disabled={busy} onClick={() => void run(() => updateAppointmentStatus(appointment.id, 'cancelled'), 'Приём отменён.')}>{busy ? 'Отменяем…' : 'Да, отменить'}</Button>
            <Button type="button" variant="secondary" className="button--compact" disabled={busy} onClick={() => setMode('idle')}>Не отменять</Button>
          </div>
        </div>
      )}

      {mode === 'reschedule' && (
        <ReschedulePicker
          appointment={appointment}
          admin={admin}
          busy={busy}
          onCancel={() => { setMode('idle'); setError('') }}
          onSubmit={(startsAt, nextDoctorId) => void run(() => rescheduleAppointment(appointment.id, startsAt, nextDoctorId), `Приём перенесён на ${formatDate(startsAt)}, ${formatTime(startsAt)}.`)}
        />
      )}
      {error && <p className="form-message form-message--error admin-appointment__error" role="alert">{error}</p>}
    </li>
  )
}

function ReschedulePicker({ appointment, admin, busy, onCancel, onSubmit }: {
  appointment: Appointment
  admin: AdminState
  busy: boolean
  onCancel: () => void
  onSubmit: (startsAt: string, doctorId: string) => void
}) {
  const service = admin.serviceOf(appointment.serviceId)
  const currentDoctor = admin.doctorOf(appointment.doctorId)
  const candidates = (admin.data?.doctors ?? []).filter((doctor) => doctor.active !== false && doctor.specialty === (currentDoctor?.specialty ?? doctor.specialty))
  const [doctorId, setDoctorId] = useState(currentDoctor?.active === false ? candidates[0]?.id ?? '' : appointment.doctorId)
  const [date, setDate] = useState(toDateKey(new Date(appointment.startsAt)))
  const [slots, setSlots] = useState<DaySlot[] | null>(null)
  const [slot, setSlot] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!doctorId || !date) return
    let active = true
    setSlots(null)
    setSlot('')
    getDaySlots(doctorId, date, service?.durationMinutes ?? 30, appointment.id)
      .then((result) => { if (active) { setSlots(result); setError('') } })
      .catch((slotError: unknown) => { if (active) { setSlots([]); setError(errorMessage(slotError, 'Не удалось загрузить слоты.')) } })
    return () => { active = false }
  }, [doctorId, date, service, appointment.id])

  return (
    <div className="admin-reschedule">
      <p className="detail-block__label">Перенос приёма · {service?.durationMinutes ?? 30} мин</p>
      <div className="admin-filters admin-filters--two">
        <label className="form-field cabinet-field">
          <span>Врач</span>
          <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
            {candidates.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
          </select>
        </label>
        <label className="form-field cabinet-field">
          <span>Новая дата</span>
          <input type="date" value={date} min={toDateKey(new Date())} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      {!slots ? <LoadingNote>Загружаем расписание…</LoadingNote> : slots.every((entry) => !entry.available) ? (
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
    </div>
  )
}
