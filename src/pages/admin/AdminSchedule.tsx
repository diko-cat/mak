import { AlertTriangle, Copy, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getScheduleConflictsFor, updateDoctorSchedule } from '../../api'
import { defaultWorkingHours, intervalFor, WEEK_ORDER } from '../../api/schedule'
import { Button } from '../../components/ui'
import type { AbsenceReason, Appointment, Doctor, DoctorAbsence, WorkingHours, WorkingInterval } from '../../types'
import { EmptyState, Panel } from '../cabinet/CabinetLayout'
import { errorMessage, formatDate, formatDateTime, toDateKey } from '../cabinet/format'
import type { AdminState } from './useAdminData'

const reasons: AbsenceReason[] = ['Отпуск', 'Больничный', 'Обучение', 'Другое']
const times = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`)
const weekdayLong: Record<number, string> = { 1: 'Понедельник', 2: 'Вторник', 3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота', 0: 'Воскресенье' }
const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

export function AdminSchedule({ admin }: { admin: AdminState }) {
  const doctors = admin.data!.doctors
  const [searchParams] = useSearchParams()
  const requestedDoctorId = searchParams.get('doctor')
  const [doctorId, setDoctorId] = useState(requestedDoctorId ?? doctors[0]?.id ?? '')
  const lastQueryDoctorId = useRef(requestedDoctorId)
  const [dirty, setDirty] = useState(false)
  const saveRef = useRef<(() => Promise<boolean>) | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const doctor = doctors.find((entry) => entry.id === doctorId)

  useEffect(() => {
    if (requestedDoctorId === lastQueryDoctorId.current) return
    lastQueryDoctorId.current = requestedDoctorId
    if (requestedDoctorId && doctors.some((entry) => entry.id === requestedDoctorId)) setDoctorId(requestedDoctorId)
  }, [requestedDoctorId, doctors])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  async function chooseDoctor(nextId: string) {
    if (nextId === doctorId) return
    if (dirty && window.confirm('Сохранить изменения?')) {
      const saved = await saveRef.current?.()
      if (!saved) return
    }
    setDoctorId(nextId)
    setDirty(false)
  }

  async function interceptNavigation(event: MouseEvent) {
    const anchor = (event.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null
    if (!dirty || !anchor || anchor.target || anchor.origin !== window.location.origin || anchor.pathname + anchor.search === location.pathname + location.search) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (window.confirm('Сохранить изменения?')) {
      const saved = await saveRef.current?.()
      if (!saved) return
    }
    navigate(anchor.pathname + anchor.search + anchor.hash)
  }

  useEffect(() => {
    if (!dirty) return
    document.addEventListener('click', interceptNavigation, true)
    return () => document.removeEventListener('click', interceptNavigation, true)
  }, [dirty, location.pathname, location.search, navigate])

  if (!doctor) return <Panel><EmptyState>Сначала добавьте врача.</EmptyState></Panel>

  return (
    <div className="stack">
      <Panel title="Рабочие часы и расписание">
        <label className="form-field cabinet-field admin-doctor-select">
          <span>Врач</span>
          <select value={doctorId} onChange={(event) => void chooseDoctor(event.target.value)}>
            {doctors.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.specialty}{entry.active === false ? ' (не принимает)' : ''}</option>)}
          </select>
        </label>
        <ScheduleEditor key={doctor.id} doctor={doctor} admin={admin} onDirty={setDirty} onSaveRef={(save) => { saveRef.current = save }} />
      </Panel>
    </div>
  )
}

function ScheduleEditor({ doctor, admin, onDirty, onSaveRef }: { doctor: Doctor; admin: AdminState; onDirty: (dirty: boolean) => void; onSaveRef: (save: () => Promise<boolean>) => void }) {
  const original = useMemo(() => ({
    hours: structuredClone(doctor.workingHours ?? defaultWorkingHours()),
    absences: structuredClone(doctor.absences ?? (doctor.daysOff ?? []).map((date) => ({ from: date, to: date, reason: 'Отпуск' as const }))),
    overrides: structuredClone(doctor.scheduleOverrides ?? {}),
  }), [doctor])
  const [hours, setHours] = useState<WorkingHours>(original.hours)
  const [absences, setAbsences] = useState<DoctorAbsence[]>(original.absences)
  const [overrides, setOverrides] = useState<Record<string, WorkingInterval | null>>(original.overrides)
  const [absenceDraft, setAbsenceDraft] = useState<DoctorAbsence>({ from: '', to: '', reason: 'Отпуск' })
  const [editingAbsence, setEditingAbsence] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [conflicts, setConflicts] = useState<Appointment[]>([])
  const dirty = JSON.stringify({ hours, absences, overrides }) !== JSON.stringify(original)

  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])

  const setTime = (day: number, key: 'start' | 'end', value: string) => setHours((current) => ({ ...current, [day]: { ...current[day]!, [key]: value } }))
  const toggleDay = (day: number, enabled: boolean) => {
    const sample = WEEK_ORDER.map((entry) => hours[entry]).find(Boolean) ?? { start: '09:00', end: '17:00' }
    setHours((current) => ({ ...current, [day]: enabled ? { ...sample } : null }))
  }
  const copyMonday = () => {
    const monday = hours[1]
    if (monday) setHours((current) => Object.fromEntries(WEEK_ORDER.map((day) => [day, current[day] ? { ...monday } : null])) as WorkingHours)
  }
  const save = async (): Promise<boolean> => {
    setSaving(true); setError(''); setNotice('')
    try {
      const proposed = { workingHours: hours, absences, scheduleOverrides: overrides }
      const found = await getScheduleConflictsFor(doctor.id, proposed)
      setConflicts(found)
      if (found.length) return false
      await updateDoctorSchedule(doctor.id, proposed)
      setNotice('Расписание сохранено. Новые слоты сразу доступны пациентам.')
      await admin.reload()
      return true
    } catch (saveError) {
      setError(errorMessage(saveError, 'Не удалось сохранить расписание.'))
      return false
    } finally { setSaving(false) }
  }
  useEffect(() => { onSaveRef(save) })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await save()) onDirty(false)
  }

  const addAbsence = () => {
    if (!absenceDraft.from || !absenceDraft.to) { setError('Укажите обе даты периода.'); return }
    const next = [...absences]
    if (editingAbsence === null) next.push({ ...absenceDraft })
    else next[editingAbsence] = { ...absenceDraft }
    setAbsences(next.sort((a, b) => a.from.localeCompare(b.from)))
    setAbsenceDraft({ from: '', to: '', reason: 'Отпуск' })
    setEditingAbsence(null); setError(''); setConflicts([])
  }

  const periodDays = (from: string, to: string) => Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000) + 1
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(1 - ((firstDay.getDay() + 6) % 7))
  const calendarDates = Array.from({ length: 42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return date })
  const selectedAbsence = absences.find((absence) => selectedDate >= absence.from && selectedDate <= absence.to)
  const selectedInterval = intervalFor({ ...doctor, workingHours: hours, absences, scheduleOverrides: overrides }, selectedDate)
  const overrideMode = !Object.prototype.hasOwnProperty.call(overrides, selectedDate) ? 'template' : overrides[selectedDate] ? 'custom' : 'off'
  const selectedDay = new Date(`${selectedDate}T00:00:00`).getDay()
  const appointmentCount = (dateKey: string) => admin.data!.appointments.filter((item) => toDateKey(new Date(item.startsAt)) === dateKey).length

  return (
    <form onSubmit={submit} noValidate>
      <div className="admin-schedule-layout">
        <section>
          <div className="admin-subhead">
            <p className="detail-block__label">Рабочая неделя</p>
            <Button type="button" variant="quiet" className="button--compact" onClick={copyMonday} disabled={!hours[1]}><Copy size={14} aria-hidden="true" />Как в понедельник</Button>
          </div>
          <ul className="week-hours">
            {WEEK_ORDER.map((day) => {
              const interval = hours[day]
              return <li key={day} className={`week-hours__row ${interval ? '' : 'week-hours__row--off'}`}>
                <label className="admin-check"><input type="checkbox" checked={Boolean(interval)} onChange={(event) => toggleDay(day, event.target.checked)} />{weekdayLong[day]}</label>
                {interval ? <span className="week-hours__times"><TimeSelect label={`${weekdayLong[day]}: начало`} value={interval.start} onChange={(value) => setTime(day, 'start', value)} /><span aria-hidden="true">—</span><TimeSelect label={`${weekdayLong[day]}: конец`} value={interval.end} onChange={(value) => setTime(day, 'end', value)} /></span> : <span className="muted small">Выходной</span>}
              </li>
            })}
          </ul>
        </section>

        <section className="admin-month">
          <div className="admin-subhead">
            <p className="detail-block__label">Календарь месяца</p>
            <div className="row-actions"><Button type="button" variant="quiet" className="button--compact" aria-label="Предыдущий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</Button><strong>{monthLabel.format(month)}</strong><Button type="button" variant="quiet" className="button--compact" aria-label="Следующий месяц" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</Button></div>
          </div>
          <div className="admin-calendar" role="grid" aria-label="Расписание по дням месяца">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day} className="admin-calendar__weekday">{day}</span>)}
            {calendarDates.map((date) => {
              const key = toDateKey(date)
              const isAbsence = absences.find((absence) => key >= absence.from && key <= absence.to)
              const interval = intervalFor({ ...doctor, workingHours: hours, absences, scheduleOverrides: overrides }, key)
              const kind = isAbsence ? 'absence' : interval ? 'work' : 'off'
              return <button type="button" role="gridcell" key={key} aria-label={`${date.toLocaleDateString('ru-RU')}, ${isAbsence ? isAbsence.reason : interval ? 'рабочий день' : 'выходной'}, записей: ${appointmentCount(key)}`} aria-selected={selectedDate === key} className={`admin-calendar__day admin-calendar__day--${kind} ${date.getMonth() === month.getMonth() ? '' : 'admin-calendar__day--outside'} ${selectedDate === key ? 'admin-calendar__day--selected' : ''}`} onClick={() => setSelectedDate(key)}>
                <strong>{date.getDate()}</strong><small>{isAbsence?.reason ?? (interval ? 'Рабочий' : 'Выходной')}</small><em>{appointmentCount(key)} зап.</em>
              </button>
            })}
          </div>
          <div className="admin-day-editor">
            <p className="detail-block__label">Часы на этот день: {formatDate(`${selectedDate}T00:00:00`)}</p>
            {selectedAbsence ? <p className="muted small">{selectedAbsence.reason}: в этот день врач не принимает.</p> : <>
              <label className="form-field cabinet-field"><span>Режим</span><select value={overrideMode} onChange={(event) => {
                const mode = event.target.value
                setOverrides((current) => {
                  const next = { ...current }
                  if (mode === 'template') delete next[selectedDate]
                  else if (mode === 'off') next[selectedDate] = null
                  else next[selectedDate] = { ...(selectedInterval ?? hours[selectedDay] ?? { start: '09:00', end: '17:00' }) }
                  return next
                })
              }}><option value="template">По шаблону</option><option value="off">Не работает</option><option value="custom">Свои часы</option></select></label>
              {overrideMode === 'custom' && overrides[selectedDate] && <div className="week-hours__times"><TimeSelect label="Начало на выбранный день" value={overrides[selectedDate]!.start} onChange={(start) => setOverrides((current) => ({ ...current, [selectedDate]: { ...current[selectedDate]!, start } }))} /><span>—</span><TimeSelect label="Конец на выбранный день" value={overrides[selectedDate]!.end} onChange={(end) => setOverrides((current) => ({ ...current, [selectedDate]: { ...current[selectedDate]!, end } }))} /></div>}
            </>}
          </div>
        </section>
      </div>

      <section className="detail-block">
        <div className="admin-subhead"><p className="detail-block__label">Отсутствия</p></div>
        <div className="admin-absence-form">
          <label className="form-field cabinet-field"><span>С [дд.мм.гггг]</span><input type="date" value={absenceDraft.from} onChange={(event) => setAbsenceDraft((current) => ({ ...current, from: event.target.value }))} /></label>
          <label className="form-field cabinet-field"><span>По [дд.мм.гггг]</span><input type="date" value={absenceDraft.to} onChange={(event) => setAbsenceDraft((current) => ({ ...current, to: event.target.value }))} /></label>
          <label className="form-field cabinet-field"><span>Причина</span><select value={absenceDraft.reason} onChange={(event) => setAbsenceDraft((current) => ({ ...current, reason: event.target.value as AbsenceReason }))}>{reasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
          <Button type="button" variant="secondary" className="button--compact" onClick={addAbsence}>+ {editingAbsence === null ? 'Добавить период' : 'Сохранить период'}</Button>
        </div>
        {absences.length === 0 ? <p className="muted small">Периодов отсутствия нет.</p> : <ul className="admin-absence-list">{absences.map((absence, index) => <li key={`${absence.from}-${absence.to}-${index}`}>
          <span><strong>{absence.reason}</strong> · {formatDate(`${absence.from}T00:00:00`)} – {formatDate(`${absence.to}T00:00:00`)} · {periodDays(absence.from, absence.to)} дней</span>
          <div className="row-actions"><Button type="button" variant="quiet" className="button--compact" onClick={() => { setAbsenceDraft(absence); setEditingAbsence(index) }}>Изменить</Button><Button type="button" variant="quiet" className="button--compact" aria-label={`Удалить период ${absence.from} – ${absence.to}`} onClick={() => { setAbsences((current) => current.filter((_, itemIndex) => itemIndex !== index)); setConflicts([]) }}><X size={14} />Удалить</Button></div>
        </li>)}</ul>}
      </section>

      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {notice && <p className="form-message form-message--success" role="status">{notice}</p>}
      {conflicts.length > 0 && <div className="admin-warning" role="alert">
        <p><AlertTriangle size={15} aria-hidden="true" />Изменение затронет {conflicts.length} записей:</p>
        <ul>{conflicts.map((item) => <li key={item.id}>{formatDateTime(item.startsAt)} · {admin.patientOf(item.patientId)?.name ?? 'Пациент'} <span className="row-actions"><Link className="text-link" target="_blank" rel="noreferrer" to={`/admin/appointments?appointment=${item.id}&action=reschedule`}>Перенести</Link><Link className="text-link" target="_blank" rel="noreferrer" to={`/admin/appointments?appointment=${item.id}&action=cancel`}>Отменить с причиной</Link></span></li>)}</ul>
        <p className="muted small">Разберите эти записи, затем снова нажмите «Сохранить расписание».</p>
      </div>}
      <div className="row-actions admin-form-foot"><Button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить расписание'}</Button></div>
    </form>
  )
}

function TimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{times.map((time) => <option key={time} value={time}>{time}</option>)}</select>
}
