import { AlertTriangle, CalendarX2, Copy, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getScheduleConflicts, updateDoctorSchedule } from '../../api'
import { defaultWorkingHours, WEEK_ORDER } from '../../api/schedule'
import { Button } from '../../components/ui'
import type { Appointment, Doctor, WorkingHours } from '../../types'
import { EmptyState, Panel } from '../cabinet/CabinetLayout'
import { errorMessage, formatDate, formatDateTime, toDateKey } from '../cabinet/format'
import type { AdminState } from './useAdminData'

const weekdayLong: Record<number, string> = { 1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота', 0: 'Воскресенье' }

export function AdminSchedule({ admin }: { admin: AdminState }) {
  const doctors = admin.data!.doctors
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '')
  const doctor = doctors.find((entry) => entry.id === doctorId)

  if (!doctor) return <Panel><EmptyState>Сначала добавьте врача.</EmptyState></Panel>

  return (
    <div className="stack">
      <Panel title="Рабочие часы и расписание">
        <label className="form-field cabinet-field admin-doctor-select">
          <span>Врач</span>
          <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
            {doctors.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.specialty}{entry.active === false ? ' (не принимает)' : ''}</option>)}
          </select>
        </label>
        <ScheduleEditor key={doctor.id} doctor={doctor} admin={admin} />
      </Panel>
    </div>
  )
}

function ScheduleEditor({ doctor, admin }: { doctor: Doctor; admin: AdminState }) {
  const [hours, setHours] = useState<WorkingHours>(() => structuredClone(doctor.workingHours ?? defaultWorkingHours()))
  const [daysOff, setDaysOff] = useState<string[]>(doctor.daysOff ?? [])
  const [newDayOff, setNewDayOff] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflicts, setConflicts] = useState<Appointment[]>([])

  const toggleDay = (day: number, enabled: boolean) => {
    const sample = WEEK_ORDER.map((entry) => hours[entry]).find(Boolean) ?? { start: '09:00', end: '17:00' }
    setHours((current) => ({ ...current, [day]: enabled ? { ...sample } : null }))
  }
  const setTime = (day: number, key: 'start' | 'end', value: string) => setHours((current) => ({ ...current, [day]: { ...current[day]!, [key]: value } }))
  const copyMonday = () => {
    const monday = hours[1]
    if (!monday) return
    setHours((current) => Object.fromEntries(WEEK_ORDER.map((day) => [day, current[day] ? { ...monday } : null])) as WorkingHours)
  }
  const addDayOff = () => {
    if (!newDayOff || daysOff.includes(newDayOff)) return
    setDaysOff((current) => [...current, newDayOff].sort())
    setNewDayOff('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await updateDoctorSchedule(doctor.id, { workingHours: hours, daysOff })
      const found = await getScheduleConflicts(doctor.id)
      setConflicts(found)
      setNotice('Расписание сохранено. Новые слоты сразу доступны пациентам.')
      await admin.reload()
    } catch (saveError) {
      setError(errorMessage(saveError, 'Не удалось сохранить расписание.'))
    } finally {
      setSaving(false)
    }
  }

  const today = toDateKey(new Date())

  return (
    <form onSubmit={submit} noValidate>
      <div className="admin-subhead">
        <p className="detail-block__label">Рабочая неделя</p>
        <Button type="button" variant="quiet" className="button--compact" onClick={copyMonday} disabled={!hours[1]}><Copy size={14} aria-hidden="true" />Как в понедельник</Button>
      </div>
      <ul className="week-hours">
        {WEEK_ORDER.map((day) => {
          const interval = hours[day]
          return (
            <li key={day} className={`week-hours__row ${interval ? '' : 'week-hours__row--off'}`}>
              <label className="admin-check">
                <input type="checkbox" checked={Boolean(interval)} onChange={(event) => toggleDay(day, event.target.checked)} />
                {weekdayLong[day]}
              </label>
              {interval ? (
                <span className="week-hours__times">
                  <input type="time" step={1800} value={interval.start} aria-label={`${weekdayLong[day]}: начало`} onChange={(event) => setTime(day, 'start', event.target.value)} />
                  <span aria-hidden="true">—</span>
                  <input type="time" step={1800} value={interval.end} aria-label={`${weekdayLong[day]}: конец`} onChange={(event) => setTime(day, 'end', event.target.value)} />
                </span>
              ) : <span className="muted small">Выходной</span>}
            </li>
          )
        })}
      </ul>

      <div className="detail-block">
        <p className="detail-block__label">Нерабочие даты · отпуск, больничный, конференции</p>
        <div className="admin-dayoff-add">
          <input type="date" value={newDayOff} min={today} aria-label="Дата без приёма" onChange={(event) => setNewDayOff(event.target.value)} />
          <Button type="button" variant="secondary" className="button--compact" onClick={addDayOff} disabled={!newDayOff}><CalendarX2 size={14} aria-hidden="true" />Добавить дату</Button>
        </div>
        {daysOff.length === 0 ? <p className="muted small">Исключений нет — врач работает по недельному графику.</p> : (
          <ul className="admin-chips">
            {daysOff.map((date) => (
              <li key={date} className={date < today ? 'admin-chips__past' : ''}>
                {formatDate(`${date}T00:00:00`)}
                <button type="button" aria-label={`Убрать ${formatDate(`${date}T00:00:00`)}`} onClick={() => setDaysOff((current) => current.filter((entry) => entry !== date))}><X size={13} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {notice && <p className="form-message form-message--success" role="status">{notice}</p>}
      {conflicts.length > 0 && (
        <div className="admin-warning" role="alert">
          <p><AlertTriangle size={15} aria-hidden="true" />Эти приёмы теперь вне рабочего времени — перенесите или отмените их:</p>
          <ul>{conflicts.map((item) => <li key={item.id}>{formatDateTime(item.startsAt)} · {admin.patientOf(item.patientId)?.name ?? 'Пациент'}</li>)}</ul>
          <Link className="text-link" to="/admin/appointments">Перейти к записям</Link>
        </div>
      )}
      <div className="row-actions admin-form-foot">
        <Button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить расписание'}</Button>
      </div>
    </form>
  )
}
