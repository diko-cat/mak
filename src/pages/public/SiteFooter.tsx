import { ArrowUpRight } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__main">
        <div>
          <Link className="brand brand--footer" to="/">
            <span className="brand__mark"><span /></span>
            <span className="brand__text">сана<span>клиника здоровья</span></span>
          </Link>
          <p className="site-footer__note">Демо-сайт клиники «Сана».<br />Здоровье начинается с внимания.</p>
        </div>
        <div className="site-footer__links">
          <NavLink to="/about">О клинике</NavLink>
          <NavLink to="/services">Услуги и цены</NavLink>
          <NavLink to="/doctors">Наши врачи</NavLink>
          <NavLink to="/contacts">Связаться с нами</NavLink>
          <NavLink to="/privacy">Политика конфиденциальности</NavLink>
        </div>
        <button className="footer-top-link" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Наверх <ArrowUpRight size={15} /></button>
      </div>
      <div className="container site-footer__bottom">
        <span>© {new Date().getFullYear()} Клиника «Сана»</span>
        <span>Демо-сайт: официальные реквизиты и лицензия здесь не указаны</span>
      </div>
    </footer>
  )
}
