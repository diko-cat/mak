import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { createLabTest, completeAppointment, getCalendarAvailability, getDaySlots, getMyArrival, markDoctorArrival, rescheduleAppointment, updateAppointmentStatus, updateLabTest } from '../../api'
import { intervalFor } from '../../api/schedule'
import { Button } from '../../components/ui'
import { ApiError, type Appointment, type DaySlot, type Doctor, type DoctorArrival, type LabTest } from '../../types'
import { BookingCalendar } from '../cabinet/BookingCalendar'
import { EmptyState, LoadingNote, Panel, StatusPill } from '../cabinet/CabinetLayout'
import { addDays, ageFrom, errorMessage, formatDate, formatDateTime, formatTime, isSameDay, isScheduled, longDayFormat, pluralYears, toDateKey } from '../cabinet/format'
import type { useDoctorData } from './useDoctorData'

const MIN_DIAGNOSIS_LENGTH = 10
type View = 'day' | 'week'
const dateInputValue = (date: Date) => toDateKey(date)
const statusNext: Record<LabTest['status'], LabTest['status'] | null> = { ordered: 'in-progress', 'in-progress': 'ready', ready: null }
const statusText: Record<LabTest['status'], string> = { ordered: 'Назначен', 'in-progress': 'В работе', ready: 'Готов' }
const cancelReasons = ['По просьбе пациента', 'Болезнь врача', 'Ошибка при записи', 'Другая причина']
const noShowReasons = ['Пациент не отвечает', 'Пациент сообщил об опоздании', 'Не явился без предупреждения', 'Другая причина']
const rescheduleReasons = ['По просьбе пациента', 'Изменение расписания врача', 'Медицинские обстоятельства', 'Другая причина']
const OTHER_REASON = 'Другая причина'

function formatActionReason(category: string, comment: string) {
  return category === OTHER_REASON ? `${OTHER_REASON}: ${comment.trim()}` : category
}

export function DoctorSchedule({ doctor, profile, doctorId }: { doctor: ReturnType<typeof useDoctorData>; profile?: Doctor; doctorId?: string }) {
  const { data, patientOf, serviceOf } = doctor
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()))
  const [view, setView] = useState<View>('day')
  const [selectedId, setSelectedId] = useState('')
  const [unclosedOnly, setUnclosedOnly] = useState(false)
  const [arrival, setArrival] = useState<DoctorArrival | null>(null)
  const [arrivalLoading, setArrivalLoading] = useState(false)
  const [arrivalSaving, setArrivalSaving] = useState(false)
  const [arrivalError, setArrivalError] = useState('')
  const [scheduleNotice, setScheduleNotice] = useState('')
  const todayKey = toDateKey(new Date())
  const day = new Date(`${dateKey}T00:00:00`)
  const weekStart = new Date(day)
  weekStart.setDate(day.getDate() - ((day.getDay() + 6) % 7))
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(index, weekStart))
  const unclosed = data?.appointments.filter(isScheduled) ?? []
  const allShown = useMemo(() => {
    if (!data) return []
    if (unclosedOnly) return unclosed
    if (view === 'day') return data.appointments.filter((item) => isSameDay(item.startsAt, dateKey))
    const keys = new Set(weekDays.map(toDateKey))
    return data.appointments.filter((item) => keys.has(toDateKey(new Date(item.startsAt))))
  }, [data, dateKey, view, unclosedOnly, unclosed, weekStart.getTime()])
  const selected = allShown.find((item) => item.id === selectedId) ?? allShown.find((item) => isScheduled(item)) ?? allShown[0]
  const interval = profile ? intervalFor(profile, dateKey) : null
  const absence = profile?.absences?.find((item) => dateKey >= item.from && dateKey <= item.to)
  const scheduleText = absence ? `${absence.reason} до ${formatDate(`${absence.to}T00:00:00`)}` : interval ? `${interval.start}–${interval.end}` : 'Выходной'

  useEffect(() => {
    if (dateKey !== todayKey) {
      setArrival(null)
      setArrivalError('')
      setArrivalLoading(false)
      return
    }
    let current = true
    setArrivalLoading(true)
    setArrivalError('')
    getMyArrival(dateKey)
      .then((saved) => { if (current) setArrival(saved) })
      .catch((loadError) => { if (current) setArrivalError(errorMessage(loadError, 'Не удалось проверить отметку о прибытии.')) })
      .finally(() => { if (current) setArrivalLoading(false) })
    return () => { current = false }
  }, [dateKey, todayKey])

  if (!data) return <LoadingNote />

  function moveDate(delta: number) {
    const next = new Date(`${dateKey}T00:00:00`); next.setDate(next.getDate() + delta); setDateKey(dateInputValue(next)); setSelectedId(''); setUnclosedOnly(false); setScheduleNotice('')
  }

  async function saveArrival() {
    setArrivalSaving(true)
    setArrivalError('')
    try {
      setArrival(await markDoctorArrival())
    } catch (saveError) {
      setArrivalError(errorMessage(saveError, 'Не удалось отметить прибытие.'))
    } finally {
      setArrivalSaving(false)
    }
  }

  const renderAppointment = (appointment: Appointment, withDay = false) => {
    const patient = patientOf(appointment.patientId)
    return <li key={appointment.id}>
      {withDay && <p className="detail-block__label">{longDayFormat.format(new Date(appointment.startsAt))}</p>}
      <button type="button" className={`schedule-item ${selected?.id === appointment.id ? 'schedule-item--active' : ''} ${appointment.status === 'cancelled' || appointment.status === 'no-show' ? 'schedule-item--cancelled' : ''}`} aria-pressed={selected?.id === appointment.id} onClick={() => setSelectedId(appointment.id)}>
        <span className="schedule-item__time"><Clock3 size={13} aria-hidden="true" />{formatTime(appointment.startsAt)}</span>
        <span className="schedule-item__body"><strong>{patient?.name ?? 'Пациент'}</strong><small>{serviceOf(appointment.serviceId)?.name}</small></span>
        <StatusPill status={appointment.status} />
      </button>
    </li>
  }

  return (
    <div className="schedule">
      <Panel title={unclosedOnly ? 'Незакрытые приёмы' : view === 'day' ? longDayFormat.format(day) : `Неделя · ${longDayFormat.format(weekStart)}`} className="schedule__list">
        <div className="doctor-calendar-tools">
          <Button type="button" variant="quiet" className="button--compact" aria-label={view === 'day' ? 'Предыдущий день' : 'Предыдущая неделя'} onClick={() => moveDate(view === 'day' ? -1 : -7)}><ChevronLeft size={16} />{view === 'day' ? 'День' : 'Неделя'}</Button>
          <label className="doctor-calendar-tools__date"><span className="sr-only">Дата расписания</span><input type="date" value={dateKey} onChange={(event) => { setDateKey(event.target.value); setSelectedId(''); setUnclosedOnly(false); setScheduleNotice('') }} /></label>
          <Button type="button" variant="quiet" className="button--compact" aria-label={view === 'day' ? 'Следующий день' : 'Следующая неделя'} onClick={() => moveDate(view === 'day' ? 1 : 7)}>{view === 'day' ? 'День' : 'Неделя'}<ChevronRight size={16} /></Button>
        </div>
        {dateKey === todayKey && <div className="doctor-arrival" aria-live="polite">
          <p className="doctor-arrival__hint">Отметка прихода врача на смену</p>
          {arrivalLoading ? <span className="muted small">Проверяем отметку о прибытии…</span>
            : arrival ? <p className="doctor-arrival__saved" role="status"><CheckCircle2 size={17} aria-hidden="true" />Вы отметили прибытие сегодня в <strong>{formatTime(arrival.arrivedAt)}</strong>.</p>
              : <Button type="button" className="button--compact" disabled={arrivalSaving} onClick={() => void saveArrival()}>{arrivalSaving ? 'Сохраняем отметку…' : 'Отметить прибытие'}</Button>}
          {arrivalError && <p className="form-message form-message--error" role="alert">{arrivalError}</p>}
        </div>}
        {scheduleNotice && <p className="form-message doctor-schedule-notice" role="status">{scheduleNotice}</p>}
        <div className="segmented" role="tablist" aria-label="Вид расписания">
          <button type="button" role="tab" aria-selected={view === 'day'} className={`segmented__item ${view === 'day' ? 'segmented__item--active' : ''}`} onClick={() => { setView('day'); setUnclosedOnly(false) }}>День</button>
          <button type="button" role="tab" aria-selected={view === 'week'} className={`segmented__item ${view === 'week' ? 'segmented__item--active' : ''}`} onClick={() => { setView('week'); setUnclosedOnly(false) }}>Неделя</button>
        </div>
        {!unclosedOnly && <p className="muted small doctor-working-hours">Рабочие часы: <strong>{scheduleText}</strong></p>}
        <button type="button" className={`doctor-unclosed ${unclosedOnly ? 'doctor-unclosed--active' : ''}`} onClick={() => { setUnclosedOnly((value) => !value); setSelectedId('') }}>
          Незакрытые приёмы: <strong>{unclosed.length}</strong> <span>{unclosedOnly ? 'Показать расписание дня' : 'Показать приёмы'}</span>
        </button>
        {allShown.length === 0 ? <EmptyState>{unclosedOnly ? 'Незакрытых приёмов нет.' : 'На этот период приёмов нет.'}</EmptyState> : (
          <ul className="schedule-list">{allShown.map((item) => renderAppointment(item, view === 'week' && !unclosedOnly))}</ul>
        )}
      </Panel>
      {selected ? <AppointmentDetails key={selected.id} appointment={selected} doctor={doctor} doctorId={doctorId ?? profile?.id} onActionSuccess={setScheduleNotice} /> : <Panel><EmptyState>Выберите приём, чтобы увидеть карточку пациента.</EmptyState></Panel>}
    </div>
  )
}

function AppointmentDetails({ appointment, doctor, doctorId, onActionSuccess }: { appointment: Appointment; doctor: ReturnType<typeof useDoctorData>; doctorId?: string; onActionSuccess: (message: string) => void }) {
  const { data, reload, patientOf, serviceOf } = doctor
  const draftKey = `sana-clinic.conclusion-draft.${appointment.id}`
  const [diagnosis, setDiagnosis] = useState(() => window.sessionStorage.getItem(`${draftKey}.diagnosis`) ?? '')
  const [recommendations, setRecommendations] = useState(() => window.sessionStorage.getItem(`${draftKey}.recommendations`) ?? '')
  const [analysisNames, setAnalysisNames] = useState<string[]>([])
  const [tab, setTab] = useState<'visit' | 'labs'>('visit')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  useEffect(() => { window.sessionStorage.setItem(`${draftKey}.diagnosis`, diagnosis) }, [draftKey, diagnosis])
  useEffect(() => { window.sessionStorage.setItem(`${draftKey}.recommendations`, recommendations) }, [draftKey, recommendations])
  const patient = patientOf(appointment.patientId)
  const service = serviceOf(appointment.serviceId)
  const conclusions = (data?.conclusions ?? []).filter((item) => item.patientId === appointment.patientId)
  const ownConclusion = conclusions.find((item) => item.appointmentId === appointment.id)
  const pastConclusions = conclusions.filter((item) => item.appointmentId !== appointment.id)
  const patientLabs = (data?.labTests ?? []).filter((item) => item.patientId === appointment.patientId)
  const labServices = (data?.services ?? []).filter((item) => item.active !== false && (item.category.toLowerCase().includes('лаборатор') || item.specialty === 'Лаборант'))
  const canComplete = appointment.status === 'confirmed' && new Date(appointment.startsAt).getTime() <= Date.now()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canComplete) { setError('Заключение можно внести после начала приёма.'); return }
    if (diagnosis.trim().length < MIN_DIAGNOSIS_LENGTH) { setError(`Заключение должно содержать минимум ${MIN_DIAGNOSIS_LENGTH} символов.`); return }
    setSubmitting(true); setError('')
    try {
      await completeAppointment(appointment.id, { diagnosis, recommendations })
      await Promise.all(analysisNames.map((name) => createLabTest({ patientId: appointment.patientId, doctorId: appointment.doctorId, appointmentId: appointment.id, name })))
      setJustCompleted(true)
      window.sessionStorage.removeItem(`${draftKey}.diagnosis`); window.sessionStorage.removeItem(`${draftKey}.recommendations`)
      await reload()
    } catch (completeError) { setError(errorMessage(completeError, 'Не удалось завершить приём.')) }
    finally { setSubmitting(false) }
  }

  return (
    <Panel className="schedule__details" title="Карточка приёма" action={<StatusPill status={appointment.status} />}>
      <div className="patient-card"><span className="avatar avatar--large" aria-hidden="true">{patient?.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><h3>{patient?.name ?? 'Пациент'}</h3><dl className="facts"><div><dt>Возраст</dt><dd>{patient ? pluralYears(ageFrom(patient.birthDate)) : '—'}</dd></div><div><dt>Карта</dt><dd>{patient?.cardNumber ?? '—'}</dd></div><div><dt>Время</dt><dd>{formatDate(appointment.startsAt)}, {formatTime(appointment.startsAt)}</dd></div><div><dt>Талон</dt><dd>{appointment.ticketNumber ?? '—'}</dd></div></dl></div></div>
      <div className={`doctor-patient-attendance doctor-patient-attendance--${appointment.status === 'completed' ? 'arrived' : appointment.status === 'no-show' ? 'absent' : 'unknown'}`} role="status">
        {appointment.status === 'completed' ? <CheckCircle2 size={16} aria-hidden="true" /> : null}
        <span><strong>Пациент пришёл:</strong> {appointment.status === 'completed' ? 'да' : appointment.status === 'no-show' ? 'нет' : 'не отмечено'}</span>
      </div>
      <div className="detail-block"><p className="detail-block__label">Услуга</p><p>{service?.name ?? '—'}</p><p className="detail-block__label">Причина обращения</p><p>{appointment.note || 'Не указана'}</p></div>
      <AppointmentActions appointment={appointment} doctorId={doctorId} durationMinutes={service?.durationMinutes ?? 30} reload={reload} onSuccess={onActionSuccess} />
      <div className="segmented" role="tablist" aria-label="Карточка пациента"><button type="button" role="tab" aria-selected={tab === 'visit'} className={`segmented__item ${tab === 'visit' ? 'segmented__item--active' : ''}`} onClick={() => setTab('visit')}>Приём</button><button type="button" role="tab" aria-selected={tab === 'labs'} className={`segmented__item ${tab === 'labs' ? 'segmented__item--active' : ''}`} onClick={() => setTab('labs')}>Анализы пациента · {patientLabs.length}</button></div>
      {tab === 'labs' ? <div className="stack">{patientLabs.length ? patientLabs.map((item) => <DoctorLabRow key={item.id} test={item} onChange={reload} />) : <EmptyState>Анализов пока нет.</EmptyState>}</div> : <>
        <div className="detail-block"><p className="detail-block__label">Прошлые заключения</p>{pastConclusions.length === 0 ? <p className="muted">Ранее заключений не было.</p> : <ul className="history">{pastConclusions.map((item) => <li key={item.id}><span className="muted">{formatDate(item.createdAt)}</span><strong>{item.diagnosis}</strong>{item.recommendations && <span>{item.recommendations}</span>}</li>)}</ul>}</div>
        {appointment.status === 'completed' ? <div className="completed-box"><p className="completed-box__title"><CheckCircle2 size={16} aria-hidden="true" />{justCompleted ? 'Приём завершён. Заключение отправлено в кабинет пациента.' : 'Приём завершён'}</p>{ownConclusion && <><strong>{ownConclusion.diagnosis}</strong>{ownConclusion.recommendations && <p>Назначения: {ownConclusion.recommendations}</p>}</>}</div>
          : appointment.status === 'cancelled' ? <p className="muted">{appointment.cancelledBy === 'admin' ? `Отменено администратором: ${appointment.cancellationReason || 'причина не указана'}` : appointment.cancelledBy === 'doctor' ? `Отменено врачом: ${appointment.cancellationReason || 'причина не указана'}` : 'Пациент отменил запись.'}</p>
          : appointment.status === 'no-show' ? <p className="muted">Приём отмечен как «Не явился».{appointment.noShowReason ? ` Причина: ${appointment.noShowReason}` : ''}</p>
          : !canComplete ? <p className="form-message" role="status">Заключение можно внести после начала приёма. Запись должна быть подтверждена.</p>
          : <form className="conclusion-form" onSubmit={submit} noValidate>
            <label className="form-field cabinet-field"><span>Заключение <small>минимум {MIN_DIAGNOSIS_LENGTH} символов</small></span><textarea rows={3} value={diagnosis} aria-invalid={Boolean(error)} onChange={(event) => { setDiagnosis(event.target.value); if (error) setError('') }} placeholder="Диагноз и выводы по осмотру" /></label>
            <label className="form-field cabinet-field"><span>Назначения</span><textarea rows={3} value={recommendations} onChange={(event) => setRecommendations(event.target.value)} placeholder="Препараты, рекомендации, повторный приём" /></label>
            {labServices.length > 0 && <fieldset className="doctor-lab-choices"><legend>Назначить анализы</legend>{labServices.map((item) => <label key={item.id}><input type="checkbox" checked={analysisNames.includes(item.name)} onChange={(event) => setAnalysisNames((current) => event.target.checked ? [...current, item.name] : current.filter((name) => name !== item.name))} />{item.name}</label>)}</fieldset>}
            <div className="conclusion-form__foot"><span className="muted small">{diagnosis.trim().length} / {MIN_DIAGNOSIS_LENGTH}</span><Button type="submit" disabled={submitting}>{submitting ? 'Сохраняем…' : 'Завершить приём'}</Button></div>
            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
          </form>}
      </>}
    </Panel>
  )
}

type AppointmentAction = 'cancel' | 'no-show' | 'reschedule'

function AppointmentActions({ appointment, doctorId, durationMinutes, reload, onSuccess }: {
  appointment: Appointment
  doctorId?: string
  durationMinutes: number
  reload: () => Promise<void>
  onSuccess: (message: string) => void
}) {
  const [mode, setMode] = useState<AppointmentAction | null>(null)
  const [reasonCategory, setReasonCategory] = useState('')
  const [reasonComment, setReasonComment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0)
  const reasonRequired = reasonCategory !== '' && (reasonCategory !== OTHER_REASON || Boolean(reasonComment.trim()))
  const isOwnActive = Boolean(doctorId && appointment.doctorId === doctorId && isScheduled(appointment))
  const canMarkNoShow = isOwnActive && new Date(appointment.startsAt).getTime() <= Date.now()

  async function submitReason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reasonRequired) {
      setError(reasonCategory === OTHER_REASON ? 'Добавьте комментарий к другой причине.' : mode === 'no-show' ? 'Выберите причину неявки.' : 'Выберите причину отмены.')
      return
    }
    if (mode !== 'cancel' && mode !== 'no-show') return
    const reason = formatActionReason(reasonCategory, reasonComment)
    setBusy(true)
    setError('')
    try {
      await updateAppointmentStatus(appointment.id, mode === 'cancel' ? 'cancelled' : 'no-show', reason)
      await reload()
      onSuccess(mode === 'cancel' ? 'Запись отменена.' : 'Неявка пациента отмечена.')
      setReasonCategory('')
      setReasonComment('')
      setMode(null)
    } catch (actionError) {
      setError(errorMessage(actionError, mode === 'cancel' ? 'Не удалось отменить запись.' : 'Не удалось отметить неявку.'))
    } finally {
      setBusy(false)
    }
  }

  async function submitReschedule(startsAt: string, reason: string) {
    setBusy(true)
    setError('')
    try {
      await rescheduleAppointment(appointment.id, startsAt, appointment.doctorId)
      await reload()
      onSuccess(`Приём перенесён на ${formatDateTime(startsAt)}. Причина: ${reason}.`)
      setMode(null)
    } catch (actionError) {
      setError(actionError instanceof ApiError && actionError.code === 'SLOT_TAKEN'
        ? 'Выбранное время уже заняли. Исходная запись сохранена — выберите другой свободный слот.'
        : errorMessage(actionError, 'Не удалось перенести приём. Выберите другое свободное время.'))
      if (actionError instanceof ApiError && actionError.code === 'SLOT_TAKEN') setAvailabilityRefresh((value) => value + 1)
    } finally {
      setBusy(false)
    }
  }

  if (!isOwnActive) return null

  return <section className="doctor-appointment-actions" aria-label="Действия с приёмом">
    <h4 className="doctor-appointment-actions__title">Действия с приёмом</h4>
    <div className="row-actions">
      <Button type="button" variant="secondary" className="button--compact" disabled={busy} aria-expanded={mode === 'reschedule'} onClick={() => { setError(''); setMode(mode === 'reschedule' ? null : 'reschedule') }}>Перенести</Button>
      <Button type="button" variant="secondary" className="button--compact" disabled={busy} aria-expanded={mode === 'cancel'} onClick={() => { setError(''); setReasonCategory(''); setReasonComment(''); setMode(mode === 'cancel' ? null : 'cancel') }}>Отменить</Button>
      {canMarkNoShow && <Button type="button" variant="secondary" className="button--compact" disabled={busy} aria-expanded={mode === 'no-show'} onClick={() => { setError(''); setReasonCategory(''); setReasonComment(''); setMode(mode === 'no-show' ? null : 'no-show') }}>Пациент не явился</Button>}
    </div>
    {(mode === 'cancel' || mode === 'no-show') && <form className="doctor-action-form" onSubmit={submitReason} noValidate>
      <label className="form-field cabinet-field">
        <span>{mode === 'cancel' ? 'Категория причины отмены' : 'Категория причины неявки'} <small>обязательно</small></span>
        <select required value={reasonCategory} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? 'doctor-action-error' : undefined} onChange={(event) => { setReasonCategory(event.target.value); if (error) setError('') }}>
          <option value="">Выберите причину</option>
          {(mode === 'cancel' ? cancelReasons : noShowReasons).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      {reasonCategory === OTHER_REASON && <label className="form-field cabinet-field"><span>Комментарий <small>обязательно</small></span><textarea required rows={2} value={reasonComment} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? 'doctor-action-error' : undefined} onChange={(event) => { setReasonComment(event.target.value); if (error) setError('') }} placeholder="Уточните причину" /></label>}
      {error && <p id="doctor-action-error" className="form-message form-message--error" role="alert">{error}</p>}
      <div className="row-actions">
        <Button type="submit" className={`button--compact ${mode === 'cancel' ? 'button--danger' : ''}`} disabled={busy || !reasonRequired}>{busy ? 'Сохраняем…' : mode === 'cancel' ? 'Подтвердить отмену' : 'Подтвердить неявку'}</Button>
        <Button type="button" variant="quiet" className="button--compact" disabled={busy} onClick={() => { setMode(null); setError('') }}>Закрыть</Button>
      </div>
    </form>}
    {mode === 'reschedule' && <DoctorReschedulePicker
      appointment={appointment}
      doctorId={doctorId ?? ''}
      durationMinutes={durationMinutes}
      busy={busy}
      error={error}
      refreshKey={availabilityRefresh}
      onClearError={() => setError('')}
      onSubmit={(startsAt, reason) => void submitReschedule(startsAt, reason)}
      onCancel={() => { setMode(null); setError('') }}
    />}
  </section>
}

function DoctorReschedulePicker({ appointment, doctorId, durationMinutes, busy, error, refreshKey, onClearError, onSubmit, onCancel }: {
  appointment: Appointment
  doctorId: string
  durationMinutes: number
  busy: boolean
  error: string
  refreshKey: number
  onClearError: () => void
  onSubmit: (startsAt: string, reason: string) => void
  onCancel: () => void
}) {
  const minDate = addDays(0)
  const maxDate = addDays(59, minDate)
  const todayKey = toDateKey(minDate)
  const maxDateKey = toDateKey(maxDate)
  const appointmentDate = toDateKey(new Date(appointment.startsAt))
  const initialDate = appointmentDate >= todayKey && appointmentDate <= maxDateKey ? appointmentDate : todayKey
  const [date, setDate] = useState(initialDate)
  const [month, setMonth] = useState(() => {
    const value = new Date(`${initialDate}T00:00:00`)
    return new Date(value.getFullYear(), value.getMonth(), 1)
  })
  const [availability, setAvailability] = useState<Record<string, number>>({})
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const [slots, setSlots] = useState<DaySlot[] | null>(null)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slot, setSlot] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [reasonComment, setReasonComment] = useState('')
  const reasonRequired = reasonCategory !== '' && (reasonCategory !== OTHER_REASON || Boolean(reasonComment.trim()))
  const monthDates = useMemo(() => {
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return Array.from({ length: days }, (_, index) => toDateKey(new Date(month.getFullYear(), month.getMonth(), index + 1)))
  }, [month])
  useEffect(() => {
    let current = true
    setCalendarLoading(true)
    setCalendarError('')
    getCalendarAvailability(doctorId, monthDates, durationMinutes, appointment.id)
      .then((counts) => { if (current) setAvailability(counts) })
      .catch((calendarLoadError) => { if (current) setCalendarError(errorMessage(calendarLoadError, 'Не удалось загрузить доступность врача.')) })
      .finally(() => { if (current) setCalendarLoading(false) })
    return () => { current = false }
  }, [appointment.id, doctorId, durationMinutes, monthDates, refreshKey])

  useEffect(() => {
    let current = true
    setSlots(null)
    setSlot('')
    setSlotsLoading(true)
    getDaySlots(doctorId, date, durationMinutes, appointment.id)
      .then((daySlots) => { if (current) setSlots(daySlots) })
      .catch((slotLoadError) => { if (current) setCalendarError(errorMessage(slotLoadError, 'Не удалось загрузить свободное время.')) })
      .finally(() => { if (current) setSlotsLoading(false) })
    return () => { current = false }
  }, [appointment.id, date, doctorId, durationMinutes, refreshKey])

  return <div className="doctor-reschedule">
    <h4>Выберите новую дату и свободное время</h4>
    <label className="form-field cabinet-field doctor-reschedule__reason">
      <span>Причина переноса <small>обязательно</small></span>
      <select required value={reasonCategory} disabled={busy} aria-invalid={Boolean(error)} onChange={(event) => { setReasonCategory(event.target.value); onClearError() }}>
        <option value="">Выберите причину переноса</option>
        {rescheduleReasons.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
    {reasonCategory === OTHER_REASON && <label className="form-field cabinet-field doctor-reschedule__reason"><span>Комментарий <small>обязательно</small></span><textarea required rows={2} value={reasonComment} disabled={busy} aria-invalid={Boolean(error)} onChange={(event) => { setReasonComment(event.target.value); onClearError() }} placeholder="Уточните причину переноса" /></label>}
    <BookingCalendar
      availability={availability}
      selectedDate={date}
      visibleMonth={month}
      minDate={minDate}
      maxDate={maxDate}
      loading={calendarLoading}
      error={calendarError}
      horizonLabel="Показываем расписание этого врача на ближайшие 60 дней."
      emptyMessage="У этого врача пока нет свободных дат."
      onSelect={(nextDate) => { setDate(nextDate); setCalendarError(''); onClearError() }}
      onMonthChange={(offset) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))}
    />
    <fieldset className="doctor-reschedule__slots">
      <legend>Свободное время · {date ? formatDate(`${date}T00:00:00`) : 'выберите дату'}</legend>
      {slotsLoading ? <LoadingNote>Загружаем свободное время…</LoadingNote>
        : slots === null ? <p className="muted small">Выберите доступную дату в календаре.</p>
          : slots.length === 0 || !slots.some((entry) => entry.available && new Date(entry.startsAt).getTime() !== new Date(appointment.startsAt).getTime()) ? <EmptyState>{slots.length === 0 ? 'В этот день врач не принимает.' : 'Нет свободного времени для переноса — выберите другую дату.'}</EmptyState>
            : <div className="slot-grid">{slots.map((entry) => {
              const isCurrentTime = new Date(entry.startsAt).getTime() === new Date(appointment.startsAt).getTime()
              return <button key={entry.startsAt} type="button" className={`slot ${slot === entry.startsAt ? 'slot--active' : ''}`} disabled={!entry.available || isCurrentTime || busy} aria-pressed={slot === entry.startsAt} title={isCurrentTime ? 'Это текущее время приёма' : entry.reason === 'busy' ? 'Время занято' : entry.reason === 'past' ? 'Время уже прошло' : undefined} onClick={() => { setSlot(entry.startsAt); onClearError() }}>{formatTime(entry.startsAt)}</button>
            })}</div>}
    </fieldset>
    {error && <p className="form-message form-message--error" role="alert">{error}</p>}
    <div className="row-actions doctor-reschedule__foot">
      <Button type="button" className="button--compact" disabled={!slot || !reasonRequired || busy} onClick={() => onSubmit(slot, formatActionReason(reasonCategory, reasonComment))}>{busy ? 'Переносим…' : !reasonRequired ? 'Укажите причину переноса' : slot ? `Перенести на ${formatDateTime(slot)}` : 'Выберите время'}</Button>
      <Button type="button" variant="quiet" className="button--compact" disabled={busy} onClick={onCancel}>Закрыть</Button>
    </div>
  </div>
}

function DoctorLabRow({ test, onChange }: { test: LabTest; onChange: () => Promise<void> }) {
  const [result, setResult] = useState(test.result ?? '')
  const [error, setError] = useState('')
  async function advance() {
    const next = statusNext[test.status]
    if (!next) return
    try { await updateLabTest(test.id, { status: next }); await onChange() }
    catch (updateError) { setError(errorMessage(updateError, 'Не удалось обновить анализ.')) }
  }
  async function saveResult() {
    try { await updateLabTest(test.id, { result }); await onChange() }
    catch (updateError) { setError(errorMessage(updateError, 'Не удалось сохранить результат.')) }
  }
  return <div className="doctor-lab-row"><strong>{test.name}</strong><span className="muted">{statusText[test.status]}</span>{statusNext[test.status] && <Button type="button" variant="secondary" className="button--compact" onClick={() => void advance()}>Перевести: {statusText[statusNext[test.status]!]}</Button>}{test.status === 'ready' && <><label className="form-field cabinet-field"><span>Результат</span><textarea rows={2} value={result} onChange={(event) => setResult(event.target.value)} /></label><Button type="button" className="button--compact" onClick={() => void saveResult()}>Сохранить результат</Button></>}{error && <p className="form-message form-message--error">{error}</p>}{test.result && <p>{test.result}</p>}</div>
}
