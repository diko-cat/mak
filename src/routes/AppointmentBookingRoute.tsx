import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createAppointment, getAvailableSlots, getDoctors, getServices } from '../api'
import { Button } from '../components/ui'
import { useSession } from '../store/session'
import type { Appointment, Doctor, Service } from '../types'

const dateToday = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const clock = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const fullDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export function AppointmentBookingRoute() {
  const user = useSession()
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [doctorId, setDoctorId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(dateToday())
  const [slots, setSlots] = useState<string[]>([])
  const [slot, setSlot] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<Appointment | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getDoctors(), getServices()]).then(([doctorData, serviceData]) => {
      if (!active) return
      setDoctors(doctorData)
      setServices(serviceData)
      setDoctorId(doctorData[0]?.id ?? '')
      setServiceId(serviceData[0]?.id ?? '')
    })
    return () => { active = false }
  }, [])

  const selectedService = services.find((service) => service.id === serviceId)

  useEffect(() => {
    if (!doctorId || !serviceId || !date) return
    let active = true
    setLoadingSlots(true)
    setSlots([])
    setSlot('')
    getAvailableSlots(doctorId, date, selectedService?.durationMinutes ?? 30)
      .then((available) => { if (active) setSlots(available) })
      .catch((availabilityError: unknown) => { if (active) setError(availabilityError instanceof Error ? availabilityError.message : 'Не удалось загрузить время.') })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [doctorId, serviceId, date, selectedService?.durationMinutes])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user?.patientId) {
      setError('В демо-аккаунте не найден профиль пациента.')
      return
    }
    if (!slot) {
      setError('Выберите свободное время для приёма.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const appointment = await createAppointment({ patientId: user.patientId, doctorId, serviceId, startsAt: slot })
      setSuccess(appointment)
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : 'Не удалось создать запись.')
      setSlot('')
      getAvailableSlots(doctorId, date, selectedService?.durationMinutes ?? 30).then(setSlots).catch(() => setSlots([]))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    const doctor = doctors.find((entry) => entry.id === success.doctorId)
    const service = services.find((entry) => entry.id === success.serviceId)
    return (
      <main className="booking-page"><div className="container booking-success-card">
        <span className="booking-success-card__icon"><CheckCircle2 size={31} /></span>
        <p className="eyebrow">ЗАПИСЬ СОЗДАНА</p><h1>Вы сделали важный шаг.</h1>
        <p>Мы сохранили заявку и скоро подтвердим приём.</p>
        <div className="booking-summary"><span><Stethoscope size={16} />{doctor?.name}</span><span><CalendarDays size={16} />{fullDate.format(new Date(success.startsAt))}</span><span><Clock3 size={16} />{clock.format(new Date(success.startsAt))}</span><span>{service?.name}</span></div>
        <Link className="button button--secondary" to="/patient">Вернуться в кабинет <ArrowRight size={16} /></Link>
      </div></main>
    )
  }

  return (
    <main className="booking-page">
      <div className="container booking-layout">
        <section className="booking-main">
          <Link className="booking-back" to="/patient"><ArrowLeft size={15} /> В кабинет пациента</Link>
          <p className="eyebrow">ЗАПИСЬ НА ПРИЁМ</p>
          <h1>Выберите врача<br />и удобное время.</h1>
          <p className="booking-lead">Мы сразу покажем только свободные слоты. Заявка сохранится в демо-системе клиники.</p>
          <form className="booking-form" onSubmit={submit}>
            <label className="form-field"><span>Услуга</span><select required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {new Intl.NumberFormat('ru-KZ').format(service.price)} ₸</option>)}</select></label>
            <label className="form-field"><span>Специалист</span><select required value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</select></label>
            <label className="form-field"><span>Дата приёма</span><input required type="date" min={dateToday()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <fieldset className="slot-fieldset"><legend>Свободное время</legend>
              {loadingSlots ? <p className="slot-hint">Загружаем свободные слоты…</p> : slots.length > 0 ? <div className="slot-grid">{slots.map((availableSlot) => <button className={`slot-button ${slot === availableSlot ? 'slot-button--selected' : ''}`} type="button" key={availableSlot} onClick={() => { setSlot(availableSlot); setError('') }}>{clock.format(new Date(availableSlot))}</button>)}</div> : <p className="slot-hint">На эту дату свободных слотов нет. Выберите другой день.</p>}
            </fieldset>
            {error && <p className="form-message form-message--error" role="alert">{error}</p>}
            <Button className="booking-submit" type="submit" disabled={submitting || !slot}>{submitting ? 'Сохраняем…' : 'Подтвердить запись'} <ArrowRight size={16} /></Button>
          </form>
        </section>
        <aside className="booking-aside">
          <span className="booking-aside__icon"><CalendarDays size={22} /></span>
          <p className="eyebrow">ВАШ ПРИЁМ</p>
          <h2>Без спешки и лишних шагов.</h2>
          <p>После отправки заявки администратор свяжется с вами и подтвердит время приёма.</p>
          <div className="booking-aside__detail"><Clock3 size={16} /><span>Принимаем ежедневно<br /><strong>с 08:00 до 20:00</strong></span></div>
          <div className="booking-aside__detail"><Stethoscope size={16} /><span>Команда из 6 врачей<br /><strong>разных специальностей</strong></span></div>
        </aside>
      </div>
    </main>
  )
}
