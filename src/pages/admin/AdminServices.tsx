import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { createService, deleteService, updateService } from '../../api'
import { Button } from '../../components/ui'
import type { Service, ServiceInput } from '../../types'
import { EmptyState, Panel } from '../cabinet/CabinetLayout'
import { errorMessage, formatPrice } from '../cabinet/format'
import type { AdminState } from './useAdminData'

const emptyService: ServiceInput = { name: '', category: '', description: '', price: 0, durationMinutes: 30, specialty: '' }

export function AdminServices({ admin }: { admin: AdminState }) {
  const data = admin.data!
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const categories = [...new Set(data.services.map((service) => service.category))].sort()
  const specialties = [...new Set(data.doctors.map((doctor) => doctor.specialty))].sort()

  async function remove(service: Service) {
    setError('')
    try {
      await deleteService(service.id)
      setNotice(`Услуга «${service.name}» удалена.`)
      await admin.reload()
    } catch (deleteError) {
      setError(errorMessage(deleteError, 'Не удалось удалить услугу.'))
    } finally {
      setConfirmDelete('')
    }
  }

  return (
    <div className="admin-split">
      <Panel title={`Услуги и цены · ${data.services.length}`} action={<Button type="button" className="button--compact" onClick={() => { setEditing('new'); setNotice('') }}><Plus size={14} aria-hidden="true" />Добавить</Button>}>
        {notice && <p className="form-message form-message--success" role="status">{notice}</p>}
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        {data.services.length === 0 ? <EmptyState>Услуг пока нет.</EmptyState> : categories.map((category) => (
          <section key={category} className="admin-group">
            <h3 className="detail-block__label">{category}</h3>
            <ul className="admin-cards">
              {data.services.filter((service) => service.category === category).map((service) => (
                <li key={service.id} className="admin-card">
                  <div className="admin-card__head">
                    <span className="admin-card__title">
                      <strong>{service.name}</strong>
                      <small className="muted">{service.durationMinutes} мин · {service.specialty ?? 'любой врач'}</small>
                    </span>
                    <PriceEditor service={service} onSaved={async (message) => { setNotice(message); await admin.reload() }} onError={setError} />
                  </div>
                  {confirmDelete === service.id ? (
                    <div className="confirm-box">
                      <p>Удалить услугу «{service.name}»? Пациенты больше не смогут на неё записаться.</p>
                      <div className="row-actions">
                        <Button type="button" className="button--compact button--danger" onClick={() => void remove(service)}>Да, удалить</Button>
                        <Button type="button" variant="secondary" className="button--compact" onClick={() => setConfirmDelete('')}>Отмена</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="row-actions">
                      <Button type="button" variant="secondary" className="button--compact" onClick={() => { setEditing(service); setNotice('') }}><Pencil size={14} aria-hidden="true" />Изменить</Button>
                      <Button type="button" variant="quiet" className="button--compact" onClick={() => { setConfirmDelete(service.id); setError('') }}><Trash2 size={14} aria-hidden="true" />Удалить</Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Panel>

      {editing && (
        <ServiceForm
          key={editing === 'new' ? 'new' : editing.id}
          service={editing === 'new' ? null : editing}
          categories={categories}
          specialties={specialties}
          onClose={() => setEditing(null)}
          onSaved={async (message) => { setNotice(message); setEditing(null); await admin.reload() }}
        />
      )}
    </div>
  )
}

/** Быстрая правка цены прямо в списке. */
function PriceEditor({ service, onSaved, onError }: { service: Service; onSaved: (message: string) => Promise<void>; onError: (message: string) => void }) {
  const [value, setValue] = useState(String(service.price))
  const [saving, setSaving] = useState(false)
  const changed = Number(value) !== service.price

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!changed) return
    setSaving(true)
    try {
      await updateService(service.id, { price: Number(value) })
      await onSaved(`Цена «${service.name}»: ${formatPrice(Number(value))}.`)
    } catch (saveError) {
      onError(errorMessage(saveError, 'Не удалось сохранить цену.'))
      setValue(String(service.price))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="price-editor" onSubmit={save}>
      <label>
        <span className="sr-only">Цена услуги «{service.name}», ₸</span>
        <input type="number" inputMode="numeric" min={0} step={500} value={value} onChange={(event) => setValue(event.target.value)} />
        <span aria-hidden="true">₸</span>
      </label>
      {changed && <Button type="submit" className="button--compact" disabled={saving}>{saving ? '…' : 'OK'}</Button>}
    </form>
  )
}

function ServiceForm({ service, categories, specialties, onClose, onSaved }: {
  service: Service | null
  categories: string[]
  specialties: string[]
  onClose: () => void
  onSaved: (message: string) => Promise<void>
}) {
  const [form, setForm] = useState<ServiceInput>(() => service ? { ...service, specialty: service.specialty ?? '' } : emptyService)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof ServiceInput>(key: K, value: ServiceInput[K]) => { setForm((current) => ({ ...current, [key]: value })); setError('') }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      if (service) await updateService(service.id, form)
      else await createService(form)
      await onSaved(service ? 'Услуга сохранена.' : `Услуга «${form.name.trim()}» добавлена.`)
    } catch (saveError) {
      setError(errorMessage(saveError, 'Не удалось сохранить услугу.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title={service ? 'Редактирование услуги' : 'Новая услуга'} className="admin-form-panel">
      <form onSubmit={submit} noValidate>
        <label className="form-field cabinet-field"><span>Название</span><input value={form.name} onChange={(event) => set('name', event.target.value)} required /></label>
        <label className="form-field cabinet-field">
          <span>Категория</span>
          <input value={form.category} list="admin-categories" onChange={(event) => set('category', event.target.value)} required />
          <datalist id="admin-categories">{categories.map((item) => <option key={item} value={item} />)}</datalist>
        </label>
        <label className="form-field cabinet-field">
          <span>Кто оказывает</span>
          <select value={form.specialty ?? ''} onChange={(event) => set('specialty', event.target.value)}>
            <option value="">Любой врач</option>
            {specialties.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="admin-filters admin-filters--two">
          <label className="form-field cabinet-field"><span>Цена, ₸</span><input type="number" inputMode="numeric" min={0} step={500} value={form.price} onChange={(event) => set('price', Number(event.target.value))} /></label>
          <label className="form-field cabinet-field"><span>Длительность, мин</span><input type="number" inputMode="numeric" min={5} max={240} step={5} value={form.durationMinutes} onChange={(event) => set('durationMinutes', Number(event.target.value))} /></label>
        </div>
        <label className="form-field cabinet-field"><span>Описание</span><textarea rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} /></label>
        {error && <p className="form-message form-message--error" role="alert">{error}</p>}
        <div className="row-actions">
          <Button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Сохранить'}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
        </div>
      </form>
    </Panel>
  )
}
