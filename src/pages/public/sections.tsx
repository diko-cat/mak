import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clock3,
  HeartHandshake,
  MapPin,
  MessageCircleHeart,
  Microscope,
  Phone,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { createCallRequest } from '../../api'
import { Button, SectionHeading } from '../../components/ui'
import { useReveal } from '../../hooks/useReveal'
import type { Clinic, Doctor, Service } from '../../types'
import { BookLink } from './BookLink'
import { countLabel, isPhysician, orderNumber } from './usePublicData'

const currency = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 })

/** Секция открыта отдельной страницей (`page`) или витриной на главной (`limit`). */
interface SectionProps {
  page?: boolean
}

/** Фильтр-«чипсы», выбранное значение хранится в адресе, чтобы пережить F5 и «Назад». */
function FilterChips({ param, label, options }: { param: string; label: string; options: string[] }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const current = searchParams.get(param) ?? ''
  const select = (value: string) => setSearchParams(value ? { [param]: value } : {}, { replace: true })
  return (
    <div className="filter-chips" role="group" aria-label={label}>
      {['', ...options].map((option) => (
        <button key={option || 'all'} type="button" className="filter-chip" aria-pressed={current === option} onClick={() => select(option)}>
          {option || 'Все'}
        </button>
      ))}
    </div>
  )
}

function useFilter<T>(items: T[], param: string, key: (item: T) => string, enabled: boolean) {
  const [searchParams] = useSearchParams()
  const options = [...new Set(items.map(key))]
  const current = enabled ? searchParams.get(param) ?? '' : ''
  return { options, filtered: current ? items.filter((item) => key(item) === current) : items }
}

export function AboutSection({ clinic, page }: SectionProps & { clinic: Clinic | null }) {
  useReveal('.about-aside, .about-main .section-heading, .principle-card')
  return (
    <section id="about" className="section section--about">
      <div className="container about-grid">
        <div className="about-aside">
          <p className="eyebrow">О КЛИНИКЕ</p>
          <div className="about-number">{clinic?.foundedYear ?? '—'}<span>год<br />открытия</span></div>
          <div className="about-aside__line" />
          <p>{clinic?.foundedYear ? `Клиника работает с ${clinic.foundedYear} года` : 'Год основания клиники пока не подтверждён'}</p>
        </div>
        <div className="about-main">
          <SectionHeading as={page ? 'h1' : 'h2'} eyebrow="МЕДИЦИНА, КОТОРОЙ МОЖНО ДОВЕРЯТЬ" title={<>Сначала — <em>вы</em>, потом диагнозы.</>} description={clinic?.description ?? 'Мы создали пространство, где современная медицина встречается с человеческим отношением.'} />
          <div className="principles-grid">
            <article className="principle-card"><span className="principle-icon"><HeartHandshake size={21} /></span><h3>Слышим человека</h3><p>На приёме достаточно времени, чтобы спокойно обсудить всё важное.</p></article>
            <article className="principle-card"><span className="principle-icon principle-icon--sage"><ShieldCheck size={21} /></span><h3>Объясняем решения</h3><p>Говорим понятным языком и опираемся на современные рекомендации.</p></article>
            <article className="principle-card"><span className="principle-icon principle-icon--sand"><BadgeCheck size={21} /></span><h3>Берём ответственность</h3><p>Сопровождаем вас от первого вопроса до результата лечения.</p></article>
          </div>
        </div>
      </div>
    </section>
  )
}

export function ServicesSection({ services, page, limit }: SectionProps & { services: Service[]; limit?: number }) {
  const { options, filtered } = useFilter(services, 'category', (service) => service.category, Boolean(page))
  const shown = limit ? filtered.slice(0, limit) : filtered
  useReveal('.services-intro-card, .section--services .section-heading')
  useReveal('.service-row', [shown.length])
  return (
    <section id="services" className="section section--services">
      <div className="container">
        <div className="section-topline">
          <SectionHeading as={page ? 'h1' : 'h2'} eyebrow="УСЛУГИ И ЦЕНЫ" title={<>Забота, которая <em>понятна.</em></>} description="Выбирайте нужное и заранее знайте стоимость. Итоговый план врач обсудит с вами на приёме." />
          {limit
            ? <Link className="section-side-link" to="/services">Все услуги <ArrowRight size={15} /></Link>
            : <Link className="section-side-link" to="/contacts">Спросить о стоимости <ArrowUpRight size={15} /></Link>}
        </div>
        {page && options.length > 1 && <FilterChips param="category" label="Категория услуг" options={options} />}
        <div className="services-layout">
          <div className="services-intro-card">
            <span className="services-intro-card__icon"><Microscope size={22} /></span>
            <p className="eyebrow">БЕЗ НЕОЖИДАННОСТЕЙ</p>
            <h3>Всё важное — заранее</h3>
            <p>Врач расскажет, какие исследования действительно нужны, и согласует каждый следующий шаг.</p>
            <BookLink>Выбрать специалиста <ArrowRight size={15} /></BookLink>
            <span className="services-intro-card__decoration"><Activity size={66} strokeWidth={1} /></span>
          </div>
          <div className="services-list">
            {shown.map((service, index) => (
              <article className="service-row" key={service.id}>
                <span className="service-index">{orderNumber(index)}</span>
                <div className="service-row__copy"><h3>{service.name}</h3><p>{service.description}</p></div>
                <strong className="service-price">{currency.format(service.price)} <small>₸</small></strong>
                <BookLink serviceId={service.id} className="service-row__arrow" aria-label={`Записаться: ${service.name}`}><ArrowUpRight size={16} /></BookLink>
              </article>
            ))}
            {services.length === 0 && <p className="loading-note">Загружаем список услуг…</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

export function DoctorsSection({ doctors, page, limit }: SectionProps & { doctors: Doctor[]; limit?: number }) {
  const { options, filtered } = useFilter(doctors, 'specialty', (doctor) => doctor.specialty, Boolean(page))
  const shown = limit ? filtered.slice(0, limit) : filtered
  useReveal('.section--doctors .section-heading')
  useReveal('.doctor-card', [shown.length])
  return (
    <section id="doctors" className="section section--doctors">
      <div className="container">
        <div className="section-topline">
          <SectionHeading as={page ? 'h1' : 'h2'} eyebrow="НАША КОМАНДА" title={<>Люди, которым <em>важно.</em></>} description="Профессионалы своего дела и просто внимательные люди. Познакомьтесь с теми, кто будет рядом." />
          {limit
            ? <Link className="section-side-link" to="/doctors">Все врачи <ArrowRight size={15} /></Link>
            : <span className="doctors-count"><UsersRound size={17} /> {countLabel(doctors.length, ['специалист', 'специалиста', 'специалистов'])} · {countLabel(doctors.filter(isPhysician).length, ['врач', 'врача', 'врачей'])}</span>}
        </div>
        {page && options.length > 1 && <FilterChips param="specialty" label="Специальность" options={options} />}
        <div className="doctors-grid">
          {shown.map((doctor, index) => (
            <article className="doctor-card" key={doctor.id}>
              <div className={`doctor-portrait doctor-portrait--${doctor.accent}`}>
                <div className="doctor-portrait__circle"><span>{doctor.initials}</span></div>
                <span className="doctor-order">{orderNumber(index)}</span>
              </div>
              <div className="doctor-card__body"><p className="eyebrow">{doctor.specialty}</p><h3><Link className="doctor-card__name" to={`/doctors/${doctor.id}`}>{doctor.name}</Link></h3><p>{countLabel(doctor.experienceYears, ['год', 'года', 'лет'])} практики</p><BookLink doctorId={doctor.id}>Записаться <ArrowUpRight size={15} /></BookLink></div>
            </article>
          ))}
          {doctors.length === 0 && <p className="loading-note">Загружаем команду…</p>}
        </div>
      </div>
    </section>
  )
}

export function ContactsSection({ clinic, page }: SectionProps & { clinic: Clinic | null }) {
  const [form, setForm] = useState({ name: '', phone: '', preferredTime: '' })
  const [requestState, setRequestState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [requestError, setRequestError] = useState('')
  const phoneHref = clinic?.phone.replace(/[^\d+]/g, '') ?? ''
  const Heading = page ? 'h1' : 'h2'
  useReveal('.contact-copy, .callback-card')

  async function submitCallback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRequestState('sending')
    setRequestError('')
    try {
      await createCallRequest(form)
      setRequestState('success')
      setForm({ name: '', phone: '', preferredTime: '' })
    } catch (error) {
      setRequestState('error')
      setRequestError(error instanceof Error ? error.message : 'Не удалось отправить заявку. Попробуйте ещё раз.')
    }
  }

  return (
    <section id="contacts" className={`section section--contact ${page ? 'section--page' : ''}`}>
      <div className="container contact-grid">
        <div className="contact-copy">
          <p className="eyebrow">МЫ НА СВЯЗИ</p>
          <Heading>Есть вопрос?<br /><em>Давайте обсудим.</em></Heading>
          <p>Оставьте номер — администратор позвонит, ответит на вопросы и поможет выбрать удобное время.</p>
          <div className="contact-details">
            {clinic?.phone && phoneHref ? <a href={`tel:${phoneHref}`}><span><Phone size={17} /></span><div><small>ТЕЛЕФОН</small><strong>{clinic.phone}</strong></div><ArrowUpRight size={15} /></a> : <div><span><Phone size={17} /></span><div><small>ТЕЛЕФОН</small><strong>Официальный номер не указан в демо-версии</strong></div></div>}
            <div><span><MapPin size={17} /></span><div><small>АДРЕС</small><strong>{clinic?.address || 'Официальный адрес не указан в демо-версии'}</strong></div></div>
            <div><span><Clock3 size={17} /></span><div><small>ГРАФИК ДЕМО-ЗАПИСИ</small><strong>{clinic?.workingHours || '09:00–17:00'}</strong></div></div>
          </div>
        </div>
        <form className="callback-card" onSubmit={submitCallback}>
          <div className="callback-card__top"><span className="callback-icon"><MessageCircleHeart size={20} /></span><span className="callback-label">ОБРАТНЫЙ ЗВОНОК</span><span className="callback-steps">01 <i>/</i> 03</span></div>
          <h3>Заявка на обратный звонок</h3>
          <p>В демо-версии заявка сохраняется только в этом браузере и не отправляется в клинику.</p>
          <label className="form-field"><span>Ваше имя</span><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Например, Алия" autoComplete="name" /></label>
          <label className="form-field"><span>Номер телефона</span><input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+7 (___) ___-__-__" autoComplete="tel" /></label>
          <label className="form-field"><span>Когда удобнее позвонить <small>необязательно</small></span><select value={form.preferredTime} onChange={(event) => setForm({ ...form, preferredTime: event.target.value })}><option value="">Выберите время</option><option>Утром, 08:00–12:00</option><option>Днём, 12:00–17:00</option><option>Вечером, 17:00–20:00</option></select></label>
          <Button className="callback-submit" type="submit" disabled={requestState === 'sending'}>{requestState === 'sending' ? 'Отправляем…' : 'Жду звонка'} <ArrowRight size={17} /></Button>
          {requestState === 'success' && <p className="form-message form-message--success" role="status"><Check size={16} /> Демо-заявка сохранена в этом браузере.</p>}
          {requestState === 'error' && <p className="form-message form-message--error" role="alert">{requestError}</p>}
          <small className="form-privacy">Демо-заявка остаётся в этом браузере. <Link to="/privacy">Политика конфиденциальности</Link></small>
        </form>
      </div>
    </section>
  )
}
