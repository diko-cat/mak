import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { createLabTest, completeAppointment, updateLabTest } from '../../api'
import { intervalFor } from '../../api/schedule'
import { Button } from '../../components/ui'
import type { Appointment, Doctor, LabTest } from '../../types'
import { EmptyState, LoadingNote, Panel, StatusPill } from '../cabinet/CabinetLayout'
import { addDays, ageFrom, errorMessage, formatDate, formatTime, isSameDay, isScheduled, longDayFormat, pluralYears, toDateKey } from '../cabinet/format'
import type { useDoctorData } from './useDoctorData'

const MIN_DIAGNOSIS_LENGTH = 10
type View = 'day' | 'week'
const dateInputValue = (date: Date) => toDateKey(date)
const statusNext: Record<LabTest['status'], LabTest['status'] | null> = { ordered: 'in-progress', 'in-progress': 'ready', ready: null }
const statusText: Record<LabTest['status'], string> = { ordered: 'Назначен', 'in-progress': 'В работе', ready: 'Готов' }

export function DoctorSchedule({ doctor, profile }: { doctor: ReturnType<typeof useDoctorData>; profile?: Doctor }) {
  const { data, patientOf, serviceOf } = doctor
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()))
  const [view, setView] = useState<View>('day')
  const [selectedId, setSelectedId] = useState('')
  const [unclosedOnly, setUnclosedOnly] = useState(false)
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

  if (!data) return <LoadingNote />

  function moveDate(delta: number) {
    const next = new Date(`${dateKey}T00:00:00`); next.setDate(next.getDate() + delta); setDateKey(dateInputValue(next)); setSelectedId(''); setUnclosedOnly(false)
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
          <Button type="button" variant="quiet" className="button--compact" aria-label="Предыдущий день или неделю" onClick={() => moveDate(view === 'day' ? -1 : -7)}><ChevronLeft size={16} />День</Button>
          <label className="doctor-calendar-tools__date"><span className="sr-only">Дата расписания</span><input type="date" value={dateKey} onChange={(event) => { setDateKey(event.target.value); setSelectedId(''); setUnclosedOnly(false) }} /></label>
          <Button type="button" variant="quiet" className="button--compact" aria-label="Следующий день или неделю" onClick={() => moveDate(view === 'day' ? 1 : 7)}>День<ChevronRight size={16} /></Button>
        </div>
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
      {selected ? <AppointmentDetails key={selected.id} appointment={selected} doctor={doctor} /> : <Panel><EmptyState>Выберите приём, чтобы увидеть карточку пациента.</EmptyState></Panel>}
    </div>
  )
}

function AppointmentDetails({ appointment, doctor }: { appointment: Appointment; doctor: ReturnType<typeof useDoctorData> }) {
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
      <div className="detail-block"><p className="detail-block__label">Услуга</p><p>{service?.name ?? '—'}</p><p className="detail-block__label">Причина обращения</p><p>{appointment.note || 'Не указана'}</p></div>
      <div className="segmented" role="tablist" aria-label="Карточка пациента"><button type="button" role="tab" aria-selected={tab === 'visit'} className={`segmented__item ${tab === 'visit' ? 'segmented__item--active' : ''}`} onClick={() => setTab('visit')}>Приём</button><button type="button" role="tab" aria-selected={tab === 'labs'} className={`segmented__item ${tab === 'labs' ? 'segmented__item--active' : ''}`} onClick={() => setTab('labs')}>Анализы пациента · {patientLabs.length}</button></div>
      {tab === 'labs' ? <div className="stack">{patientLabs.length ? patientLabs.map((item) => <DoctorLabRow key={item.id} test={item} onChange={reload} />) : <EmptyState>Анализов пока нет.</EmptyState>}</div> : <>
        <div className="detail-block"><p className="detail-block__label">Прошлые заключения</p>{pastConclusions.length === 0 ? <p className="muted">Ранее заключений не было.</p> : <ul className="history">{pastConclusions.map((item) => <li key={item.id}><span className="muted">{formatDate(item.createdAt)}</span><strong>{item.diagnosis}</strong>{item.recommendations && <span>{item.recommendations}</span>}</li>)}</ul>}</div>
        {appointment.status === 'completed' ? <div className="completed-box"><p className="completed-box__title"><CheckCircle2 size={16} aria-hidden="true" />{justCompleted ? 'Приём завершён. Заключение отправлено в кабинет пациента.' : 'Приём завершён'}</p>{ownConclusion && <><strong>{ownConclusion.diagnosis}</strong>{ownConclusion.recommendations && <p>Назначения: {ownConclusion.recommendations}</p>}</>}</div>
          : appointment.status === 'cancelled' ? <p className="muted">{appointment.cancelledBy === 'admin' ? `Отменено администратором: ${appointment.cancellationReason || 'причина не указана'}` : 'Пациент отменил запись.'}</p>
          : appointment.status === 'no-show' ? <p className="muted">Приём отмечен как «Не явился».</p>
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
