import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createDoctor, deleteDoctor, getScheduleConflictsFor, updateDoctor } from '../../api'
import { defaultWorkingHours, describeHours } from '../../api/schedule'
import { Button } from '../../components/ui'
import type { Appointment, Doctor, DoctorInput } from '../../types'
import { EmptyState, Panel } from '../cabinet/CabinetLayout'
import { errorMessage, isScheduled } from '../cabinet/format'
import type { AdminState } from './useAdminData'

const emptyDoctor: DoctorInput = { name: '', specialty: '', description: '', experienceYears: 0, accent: 'sage', room: '', active: true }

export function AdminDoctors({ admin }: { admin: AdminState }) {
  const data = admin.data!
  const [editing, setEditing] = useState<Doctor | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [closingId, setClosingId] = useState('')
  const [closeConflicts, setCloseConflicts] = useState<Appointment[]>([])
  const specialties = [...new Set(data.doctors.map((doctor) => doctor.specialty))].sort()

  async function remove(doctor: Doctor) {
    setError('')
    try {
      await deleteDoctor(doctor.id)
      setNotice(`${doctor.name} удалён(а) из списка врачей.`)
      setConfirmDelete('')
      await admin.reload()
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'Не удалось удалить врача.'))
      setConfirmDelete('')
    }
  }

  async function toggleActive(doctor: Doctor) {
    setError('')
    try {
      if (doctor.active !== false) {
        const affected = await getScheduleConflictsFor(doctor.id, { workingHours: doctor.workingHours ?? defaultWorkingHours(), absences: doctor.absences ?? [], scheduleOverrides: doctor.scheduleOverrides, active: false })
        if (affected.length) { setClosingId(doctor.id); setCloseConflicts(affected); return }
      }
      await updateDoctor(doctor.id, { active: doctor.active === false })
      setClosingId('')
      setCloseConflicts([])
      setNotice(doctor.active === false ? `${doctor.name} снова принимает пациентов.` : `Запись к врачу ${doctor.name} закрыта.`)
      await admin.reload()
    } catch (toggleError) {
      setError(errorMessage(toggleError, 'Не удалось изменить статус врача.'))
    }
  }

  async function confirmClose(doctor: Doctor) {
    try {
      const affected = await getScheduleConflictsFor(doctor.id, { workingHours: doctor.workingHours ?? defaultWorkingHours(), absences: doctor.absences ?? [], scheduleOverrides: doctor.scheduleOverrides, active: false })
      if (affected.length) { setCloseConflicts(affected); setError('Сначала перенесите или отмените затронутые приёмы.'); return }
      await updateDoctor(doctor.id, { active: false })
      setClosingId(''); setCloseConflicts([])
      setNotice(`Запись к врачу ${doctor.name} закрыта.`)
      await admin.reload()
    } catch (closeError) { setError(errorMessage(closeError, 'Не удалось закрыть запись.')) }
  }

  return (
    <div className="admin-split">
      <Panel title={`Врачи · ${data.doctors.length}`} action={<Button type="button" className="button--compact" onClick={() => { setEditing('new'); setNotice('') }}><Plus size={14} aria-hidden="true" />Добавить</Button>}>
        {notice && <p className="form-message form-message--success" role="status">{notice}</p>}
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        {data.doctors.length === 0 ? <EmptyState>Врачей пока нет.</EmptyState> : (
          <ul className="admin-cards">
            {data.doctors.map((doctor) => {
              const planned = data.appointments.filter((item) => item.doctorId === doctor.id && isScheduled(item)).length
              return (
                <li key={doctor.id} className={`admin-card ${doctor.active === false ? 'admin-card--muted' : ''}`}>
                  <div className="admin-card__head">
                    <span className="avatar" aria-hidden="true">{doctor.initials}</span>
                    <span className="admin-card__title">
                      <strong>{doctor.name}</strong>
                      <small className="muted">{doctor.specialty} · стаж {doctor.experienceYears} л. · каб. {doctor.room || '—'}</small>
                    </span>
                    <span className={`admin-badge ${doctor.active === false ? 'admin-badge--off' : ''}`}>{doctor.active === false ? 'Не принимает' : 'Принимает'}</span>
                  </div>
                  <p className="muted small admin-card__meta">{describeHours(doctor.workingHours)} · запланировано приёмов: {planned}</p>
                  {closingId === doctor.id && (
                    <div className="confirm-box">
                      <p>Закрытие записи затронет {closeConflicts.length} приёмов:</p>
                      <ul>{closeConflicts.map((item) => <li key={item.id}>{new Date(item.startsAt).toLocaleString('ru-RU')} · {admin.patientOf(item.patientId)?.name ?? 'Пациент'} · <Link target="_blank" rel="noreferrer" to={`/admin/appointments?appointment=${item.id}&action=reschedule&excludeDoctor=1`}>Перенести</Link> · <Link target="_blank" rel="noreferrer" to={`/admin/appointments?appointment=${item.id}&action=cancel`}>Отменить с причиной</Link></li>)}</ul>
                      <div className="row-actions"><Button type="button" className="button--compact" onClick={() => void confirmClose(doctor)}>Закрыть запись</Button><Button type="button" variant="secondary" className="button--compact" onClick={() => { setClosingId(''); setCloseConflicts([]) }}>Оставить</Button></div>
                    </div>
                  )}
                  {confirmDelete === doctor.id ? (
                    <div className="confirm-box">
                      <p>Удалить врача {doctor.name}? Это действие нельзя отменить.</p>
                      <div className="row-actions">
                        <Button type="button" className="button--compact button--danger" onClick={() => void remove(doctor)}>Да, удалить</Button>
                        <Button type="button" variant="secondary" className="button--compact" onClick={() => setConfirmDelete('')}>Отмена</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="row-actions">
                      <Button type="button" variant="secondary" className="button--compact" onClick={() => { setEditing(doctor); setNotice('') }}><Pencil size={14} aria-hidden="true" />Изменить</Button>
                      <Link className="button button--secondary button--compact" to={`/admin/schedule?doctor=${encodeURIComponent(doctor.id)}`}>Расписание</Link>
                      <Button type="button" variant="secondary" className="button--compact" onClick={() => void toggleActive(doctor)}>{doctor.active === false ? 'Открыть запись' : 'Закрыть запись'}</Button>
                      <Button type="button" variant="quiet" className="button--compact" onClick={() => { setConfirmDelete(doctor.id); setError('') }}><Trash2 size={14} aria-hidden="true" />Удалить</Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {editing && (
        <DoctorForm
          key={editing === 'new' ? 'new' : editing.id}
          doctor={editing === 'new' ? null : editing}
          specialties={specialties}
          onClose={() => setEditing(null)}
          onSaved={async (message) => { setNotice(message); setEditing(null); await admin.reload() }}
        />
      )}
    </div>
  )
}

function DoctorForm({ doctor, specialties, onClose, onSaved }: { doctor: Doctor | null; specialties: string[]; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [form, setForm] = useState<DoctorInput>(() => doctor ? {
    name: doctor.name, specialty: doctor.specialty, description: doctor.description, experienceYears: doctor.experienceYears,
    accent: doctor.accent, room: doctor.room ?? '', active: doctor.active !== false, rating: doctor.rating,
  } : emptyDoctor)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof DoctorInput>(key: K, value: DoctorInput[K]) => { setForm((current) => ({ ...current, [key]: value })); setError('') }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      if (doctor) await updateDoctor(doctor.id, form)
      else await createDoctor(form)
      await onSaved(doctor ? 'Данные врача сохранены.' : `${form.name.trim()} добавлен(а). Настройте рабочие часы во вкладке «Расписание».`)
    } catch (saveError) {
      setError(errorMessage(saveError, 'Не удалось сохранить врача.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title={doctor ? 'Редактирование врача' : 'Новый врач'} className="admin-form-panel">
      <form onSubmit={submit} noValidate>
        <label className="form-field cabinet-field"><span>Имя и фамилия</span><input value={form.name} onChange={(event) => set('name', event.target.value)} autoComplete="off" required /></label>
        <label className="form-field cabinet-field">
          <span>Специальность</span>
          <select value={form.specialty} onChange={(event) => set('specialty', event.target.value)} required>
            <option value="">Выберите специальность</option>
            {specialties.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="admin-filters admin-filters--two">
          <label className="form-field cabinet-field"><span>Стаж, лет</span><input type="number" inputMode="numeric" min={0} max={70} value={form.experienceYears} onChange={(event) => set('experienceYears', Number(event.target.value))} /></label>
          <label className="form-field cabinet-field"><span>Кабинет</span><input value={form.room ?? ''} onChange={(event) => set('room', event.target.value)} /></label>
        </div>
        <label className="form-field cabinet-field"><span>Описание</span><textarea rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
        <label className="admin-check"><input type="checkbox" checked={form.active !== false} onChange={(event) => set('active', event.target.checked)} />Принимает пациентов</label>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <div className="row-actions">
          <Button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
        </div>
      </form>
    </Panel>
  )
}
