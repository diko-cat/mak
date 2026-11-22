import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, Heart, Sparkles, Stethoscope, UsersRound } from 'lucide-react'
import gsap from 'gsap'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clinicWorkingHours, workingRange } from '../../api/schedule'
import { Badge, buttonStyles } from '../../components/ui'
import { useReveal } from '../../hooks/useReveal'
import { BookLink } from './BookLink'
import { AboutSection, ContactsSection, DoctorsSection, ServicesSection } from './sections'
import { countLabel, isPhysician, orderNumber, usePublicData } from './usePublicData'

const roles = [
  { role: 'patient', title: 'Пациент', description: 'Запись к врачу, история визитов, заключения и результаты анализов.', icon: Heart, tone: 'sage' },
  { role: 'doctor', title: 'Врач', description: 'Расписание приёма, карта пациента, заключения и назначения.', icon: Stethoscope, tone: 'blue' },
  { role: 'admin', title: 'Администратор', description: 'Записи, расписание врачей и заявки на звонок.', icon: UsersRound, tone: 'sand' },
]

export function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { clinic, doctors, services } = usePublicData()
  const [notice, setNotice] = useState('')
  const activePhysicians = doctors.filter(isPhysician)
  const hoursRange = workingRange(clinicWorkingHours(doctors))

  useEffect(() => {
    const message = (location.state as { notice?: string } | null)?.notice
    if (message) {
      setNotice(message)
      // Убираем уведомление из истории, не ломая её состояние у роутера.
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  // Вступительная анимация первого экрана
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.hero-copy > *', { autoAlpha: 0, y: 22, duration: 0.6, stagger: 0.09, ease: 'power2.out', clearProps: 'all' })
      gsap.from('.hero-art', { autoAlpha: 0, scale: 0.96, duration: 0.8, delay: 0.15, ease: 'power2.out', clearProps: 'all' })
    })
    return () => mm.revert()
  }, [])

  useReveal('.access-panel')

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
                <BookLink className={buttonStyles('primary', 'button--large')}>Записаться на приём <ArrowRight size={17} /></BookLink>
                <a className="text-link" href="#about">Узнать о клинике <ArrowDown size={15} /></a>
              </div>
              <div className="hero-proof">
                <div className="proof-avatars" aria-hidden="true"><span>АС</span><span>ДА</span><span>ЖК</span></div>
                <div><strong>Наша команда</strong><span>{countLabel(doctors.length, ['специалист', 'специалиста', 'специалистов'])} · {countLabel(activePhysicians.length, ['врач', 'врача', 'врачей'])}</span></div>
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
              <div className="hero-art__caption"><span>01 / 04</span><span>Внимание к деталям — основа заботы</span></div>
            </div>
          </div>
          <div className="container hero-metrics">
            <div><strong>{clinic?.foundedYear ?? 'Уточняется'}</strong><span>год основания клиники</span></div>
            <div><strong>{activePhysicians.length}</strong><span>принимающих врачей</span></div>
            <div><strong>{hoursRange ? <>{hoursRange.start} <i>—</i> {hoursRange.end}</> : '—'}</strong><span>часы приёма врачей</span></div>
            <a href="#services">Знакомьтесь с клиникой <ArrowDown size={14} /></a>
          </div>
        </section>

        <AboutSection clinic={clinic} />
        <ServicesSection services={services} limit={5} />
        <DoctorsSection doctors={doctors} limit={3} />

        <section className="section section--access">
          <div className="container access-panel">
            <div className="access-intro">
              <Badge tone="white"><span className="badge-dot" /> ПРОСТО И БЕЗОПАСНО</Badge>
              <h2>Забота — <em>в ваших руках.</em></h2>
              <p>У каждого свой удобный доступ: нужная информация всегда под рукой.</p>
              <Link className="button button--light" to="/login">Войти в кабинет <ArrowUpRight size={15} /></Link>
            </div>
            <div className="access-roles">
              {roles.map(({ role, title, description, icon: Icon, tone }, index) => (
                <Link className="access-role" key={role} to={`/login?role=${role}`}>
                  <span className={`access-role__icon access-role__icon--${tone}`}><Icon size={18} /></span>
                  <span className="access-role__copy"><strong>{title}</strong><small>{description}</small></span>
                  <span className="access-role__number">{orderNumber(index)}</span>
                  <ArrowUpRight className="access-role__arrow" size={16} />
                </Link>
              ))}
            </div>
            <span className="access-panel__decoration" aria-hidden="true">сана</span>
          </div>
        </section>

        <ContactsSection clinic={clinic} doctors={doctors} />
        <div className="closing-strip"><div className="container"><span><Heart size={16} fill="currentColor" /> Берегите себя. Мы рядом.</span><a href="#top">К началу страницы <ArrowUpRight size={14} /></a></div></div>
      </main>
    </>
  )
}
