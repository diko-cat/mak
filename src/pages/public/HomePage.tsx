import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  Heart,
  HeartHandshake,
  MapPin,
  MessageCircleHeart,
  Microscope,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
} from 'lucide-react'
import gsap from 'gsap'
import { Link, useLocation } from 'react-router-dom'
import { createCallRequest, getClinic, getDoctors, getServices } from '../../api'
import { Badge, Button, SectionHeading, buttonStyles } from '../../components/ui'
import { useReveal } from '../../hooks/useReveal'
import { useSession } from '../../store/session'
import type { Clinic, Doctor, Service } from '../../types'

const currency = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 })
const roles = [
  { title: 'Пациент', description: 'Запись к врачу, история визитов, заключения и результаты анализов.', icon: Heart, tone: 'sage' },
  { title: 'Врач', description: 'Расписание приёма, карта пациента, заключения и назначения.', icon: Stethoscope, tone: 'blue' },
  { title: 'Администратор', description: 'Управление врачами, расписанием, услугами и заявками.', icon: UsersRound, tone: 'sand' },
  { title: 'Гость', description: 'Знакомство с клиникой, выбор специалиста и запрос звонка.', icon: Sparkles, tone: 'lilac' },
]

export function HomePage() {
  const user = useSession()
  const location = useLocation()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState({ name: '', phone: '', preferredTime: '' })
  const [requestState, setRequestState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [requestError, setRequestError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getClinic(), getDoctors(), getServices()]).then(([clinicData, doctorData, serviceData]) => {
      if (!active) return
      setClinic(clinicData)
      setDoctors(doctorData)
      setServices(serviceData)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const message = (location.state as { notice?: string } | null)?.notice
    if (message) {
      setNotice(message)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

<<<<<<< HEAD
  const isPatient = user?.role === 'patient'
  const bookTarget = isPatient ? '/patient/appointments/new' : '/login?role=patient'
  const bookState = isPatient ? undefined : {
    message: 'Это демонстрационная запись. Войдите в демо-аккаунт пациента, чтобы выбрать услугу, врача и свободное время.',
=======
  // Вступительная анимация первого экрана
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.hero-copy > *', { autoAlpha: 0, y: 22, duration: 0.6, stagger: 0.09, ease: 'power2.out', clearProps: 'all' })
      gsap.from('.hero-art', { autoAlpha: 0, scale: 0.96, duration: 0.8, delay: 0.15, ease: 'power2.out', clearProps: 'all' })
    })
    return () => mm.revert()
  }, [])

  // Появление блоков при прокрутке
  useReveal('.about-aside, .section-heading, .principle-card, .services-intro-card, .access-panel, .contact-copy, .callback-card')
  useReveal('.service-row', [services.length])
  useReveal('.doctor-card', [doctors.length])

  const bookTarget = user ? '/patient/appointments/new' : '/login'
  const bookState = user ? undefined : {
    message: 'Войдите в демо-аккаунт пациента, чтобы выбрать врача и время приёма.',
>>>>>>> 53d41b56e91a232979132ad699ea09408bd59c65
    from: { pathname: '/patient/appointments/new' },
  }

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
    <>
      {notice && <div className="notice-bar" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Скрыть">×</button></div>}
      <main id="top">
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <Badge><span className="badge-dot" /> Медицина с человеческим лицом</Badge>
              <h1>Здоровье начинается <span>с внимания.</span></h1>
              <p className="hero-lead">Внимательные врачи, понятные решения и забота, которая остаётся с вами после приёма.</p>
              <div className="hero-actions">
                <Link className={buttonStyles('primary', 'button--large')} to={bookTarget} state={bookState}>Записаться · демо <ArrowRight size={17} /></Link>
                <a className="text-link" href="#about">Узнать о клинике <ArrowDown size={15} /></a>
              </div>
              <div className="hero-proof">
                <div className="proof-avatars" aria-hidden="true"><span>АС</span><span>ДА</span><span>ЖК</span></div>
                <div><strong>Команда, которой доверяют</strong><span>6 специалистов рядом с вами</span></div>
              </div>
            </div>

            <div className="hero-art" aria-label="Иллюстрация заботы и медицинской помощи" role="img">
              <div className="hero-art__sun" />
              <div className="hero-art__arch">
                <div className="hero-art__person">
                  <div className="person-hair" />
                  <div className="person-face"><span className="person-eye person-eye--left" /><span className="person-eye person-eye--right" /><span className="person-smile" /></div>
                  <div className="person-neck" />
                  <div className="person-coat"><span className="coat-cross">+</span></div>
                  <div className="person-shirt" />
                </div>
              </div>
              <div className="hero-art__sparkle hero-art__sparkle--one"><Sparkles size={19} /></div>
              <div className="hero-art__sparkle hero-art__sparkle--two"><Heart size={16} /></div>
              <div className="floating-card floating-card--appointment">
                <span className="floating-card__icon"><CalendarDays size={17} /></span>
                <span><strong>Приём без спешки</strong><small>Время для ваших вопросов</small></span>
                <Check size={16} className="floating-card__check" />
              </div>
              <div className="floating-card floating-card--rating"><span className="rating-star">✦</span><strong>4.9</strong><small>средняя оценка</small></div>
              <div className="hero-art__caption"><span>01 / 04</span><span>Внимание к деталям — основа заботы</span></div>
            </div>
          </div>
          <div className="container hero-metrics">
            <div><strong>{clinic?.foundedYear ?? 2012}</strong><span>год, когда мы открылись</span></div>
            <div><strong>{doctors.length || 6}</strong><span>врачей разных специальностей</span></div>
            <div><strong>08:00 <i>—</i> 20:00</strong><span>принимаем каждый день</span></div>
            <a href="#services">Знакомьтесь с клиникой <ArrowDown size={14} /></a>
          </div>
        </section>

        <section id="about" className="section section--about">
          <div className="container about-grid">
            <div className="about-aside">
              <p className="eyebrow">О КЛИНИКЕ</p>
              <div className="about-number">{String(clinic?.foundedYear ?? 2012).slice(-2)}<span> лет<br />рядом</span></div>
              <div className="about-aside__line" />
              <p>Заботимся о здоровье семьи с {clinic?.foundedYear ?? 2012} года</p>
            </div>
            <div className="about-main">
              <SectionHeading eyebrow="МЕДИЦИНА, КОТОРОЙ МОЖНО ДОВЕРЯТЬ" title={<>Сначала — <em>вы</em>, потом диагнозы.</>} description={clinic?.description ?? 'Мы создали пространство, где современная медицина встречается с человеческим отношением.'} />
              <div className="principles-grid">
                <article className="principle-card"><span className="principle-icon"><HeartHandshake size={21} /></span><h3>Слышим человека</h3><p>На приёме достаточно времени, чтобы спокойно обсудить всё важное.</p></article>
                <article className="principle-card"><span className="principle-icon principle-icon--sage"><ShieldCheck size={21} /></span><h3>Объясняем решения</h3><p>Говорим понятным языком и опираемся на современные рекомендации.</p></article>
                <article className="principle-card"><span className="principle-icon principle-icon--sand"><BadgeCheck size={21} /></span><h3>Берём ответственность</h3><p>Сопровождаем вас от первого вопроса до результата лечения.</p></article>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="section section--services">
          <div className="container">
            <div className="section-topline"><SectionHeading eyebrow="УСЛУГИ И ЦЕНЫ" title={<>Забота, которая <em>понятна.</em></>} description="Выбирайте нужное и заранее знайте стоимость. Итоговый план врач обсудит с вами на приёме." /><a className="section-side-link" href="#contacts">Спросить о стоимости <ArrowUpRight size={15} /></a></div>
            <div className="services-layout">
              <div className="services-intro-card">
                <span className="services-intro-card__icon"><Microscope size={22} /></span>
                <p className="eyebrow">БЕЗ НЕОЖИДАННОСТЕЙ</p>
                <h3>Всё важное — заранее</h3>
                <p>Врач расскажет, какие исследования действительно нужны, и согласует каждый следующий шаг.</p>
                <Link to={bookTarget} state={bookState}>Выбрать специалиста · демо <ArrowRight size={15} /></Link>
                <span className="services-intro-card__decoration"><Activity size={66} strokeWidth={1} /></span>
              </div>
              <div className="services-list">
                {services.map((service, index) => (
                  <article className="service-row" key={service.id}>
                    <span className="service-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="service-row__copy"><h3>{service.name}</h3><p>{service.description}</p></div>
                    <strong className="service-price">{currency.format(service.price)} <small>₸</small></strong>
                    <Link className="service-row__arrow" to={bookTarget} state={bookState} aria-label={`Демо-запись: ${service.name}`}><ArrowUpRight size={16} /></Link>
                  </article>
                ))}
                {services.length === 0 && <p className="loading-note">Загружаем список услуг…</p>}
              </div>
            </div>
          </div>
        </section>

        <section id="doctors" className="section section--doctors">
          <div className="container">
            <div className="section-topline"><SectionHeading eyebrow="НАША КОМАНДА" title={<>Люди, которым <em>важно.</em></>} description="Профессионалы своего дела и просто внимательные люди. Познакомьтесь с теми, кто будет рядом." /><span className="doctors-count"><UsersRound size={17} /> 6 специалистов</span></div>
            <div className="doctors-grid">
              {doctors.map((doctor, index) => (
                <article className="doctor-card" key={doctor.id}>
                  <div className={`doctor-portrait doctor-portrait--${doctor.accent}`}>
                    <div className="doctor-portrait__circle"><span>{doctor.initials}</span></div>
                    <span className="doctor-order">0{index + 1}</span>
                    <span className="doctor-rating">✦ {doctor.rating.toFixed(1)}</span>
                  </div>
                  <div className="doctor-card__body"><p className="eyebrow">{doctor.specialty}</p><h3>{doctor.name}</h3><p>{doctor.experienceYears} лет практики</p><Link to={bookTarget} state={bookState}>Записаться · демо <ArrowUpRight size={15} /></Link></div>
                </article>
              ))}
              {doctors.length === 0 && <p className="loading-note">Загружаем команду…</p>}
            </div>
          </div>
        </section>

        <section className="section section--access">
          <div className="container access-panel">
            <div className="access-intro">
              <Badge tone="white"><span className="badge-dot" /> ПРОСТО И БЕЗОПАСНО</Badge>
              <h2>Забота — <em>в ваших руках.</em></h2>
              <p>У каждого свой удобный доступ: нужная информация всегда под рукой.</p>
              <Link className="button button--light" to="/login">Демо-вход в кабинет <ArrowUpRight size={15} /></Link>
            </div>
            <div className="access-roles">
              {roles.map(({ title, description, icon: Icon, tone }) => (
                <Link className="access-role" key={title} to={`/login?role=${title === 'Пациент' ? 'patient' : title === 'Врач' ? 'doctor' : title === 'Администратор' ? 'admin' : 'patient'}`}>
                  <span className={`access-role__icon access-role__icon--${tone}`}><Icon size={18} /></span>
                  <span className="access-role__copy"><strong>{title}</strong><small>{description}</small></span>
                  <span className="access-role__number">Демо</span>
                  <ArrowUpRight className="access-role__arrow" size={16} />
                </Link>
              ))}
            </div>
            <span className="access-panel__decoration" aria-hidden="true">сана</span>
          </div>
        </section>

        <section id="contacts" className="section section--contact">
          <div className="container contact-grid">
            <div className="contact-copy">
              <p className="eyebrow">МЫ НА СВЯЗИ</p>
              <h2>Есть вопрос?<br /><em>Давайте обсудим.</em></h2>
              <p>Оставьте номер, чтобы сохранить демонстрационную заявку и посмотреть этот сценарий.</p>
              <div className="contact-details">
                <a href={`tel:${clinic?.phone ?? '+77273551414'}`}><span><Phone size={17} /></span><div><small>ПОЗВОНИТЕ НАМ</small><strong>{clinic?.phone ?? '+7 (727) 355-14-14'}</strong></div><ArrowUpRight size={15} /></a>
                <div><span><MapPin size={17} /></span><div><small>МЫ НАХОДИМСЯ</small><strong>{clinic?.address ?? 'Алматы, проспект Достык, 128'}</strong></div></div>
                <div><span><Clock3 size={17} /></span><div><small>ЧАСЫ РАБОТЫ</small><strong>{clinic?.workingHours ?? 'Ежедневно, 08:00–20:00'}</strong></div></div>
              </div>
            </div>
            <form className="callback-card" onSubmit={submitCallback}>
              <div className="callback-card__top"><span className="callback-icon"><MessageCircleHeart size={20} /></span><span className="callback-label">ОБРАТНЫЙ ЗВОНОК</span><span className="callback-steps">01 <i>/</i> 03</span></div>
              <h3>Перезвоним в удобное время</h3>
              <p>Заполните форму — это займёт меньше минуты.</p>
              <label className="form-field"><span>Ваше имя</span><input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Например, Алия" autoComplete="name" /></label>
              <label className="form-field"><span>Номер телефона</span><input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+7 (___) ___-__-__" autoComplete="tel" /></label>
              <label className="form-field"><span>Когда удобнее позвонить <small>необязательно</small></span><select value={form.preferredTime} onChange={(event) => setForm({ ...form, preferredTime: event.target.value })}><option value="">Выберите время</option><option>Утром, 08:00–12:00</option><option>Днём, 12:00–17:00</option><option>Вечером, 17:00–20:00</option></select></label>
              <Button className="callback-submit" type="submit" disabled={requestState === 'sending'}>{requestState === 'sending' ? 'Сохраняем…' : 'Сохранить демо-заявку'} <ArrowRight size={17} /></Button>
              {requestState === 'success' && <p className="form-message form-message--success" role="status"><Check size={16} /> Демо-заявка сохранена в этом браузере. Реальный звонок не выполняется.</p>}
              {requestState === 'error' && <p className="form-message form-message--error" role="alert">{requestError}</p>}
              <small className="form-privacy">Нажимая кнопку, вы соглашаетесь на обработку персональных данных.</small>
            </form>
          </div>
        </section>
        <div className="closing-strip"><div className="container"><span><Heart size={16} fill="currentColor" /> Берегите себя. Мы рядом.</span><a href="#top">К началу страницы <ArrowUpRight size={14} /></a></div></div>
      </main>
    </>
  )
<<<<<<< HEAD
=======
>>>>>>> 32a33964d3dfc2c35b3233d1af01f7b8fcfc127e
>>>>>>> 53d41b56e91a232979132ad699ea09408bd59c65
}
