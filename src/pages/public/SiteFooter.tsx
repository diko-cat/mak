import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

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
          <a href="/#about">О клинике</a>
          <a href="/#services">Услуги и цены</a>
          <a href="/#doctors">Наши врачи</a>
          <a href="/#contacts">Связаться с нами</a>
        </div>
        <a className="footer-top-link" href="#top">Наверх <ArrowUpRight size={15} /></a>
      </div>
      <div className="container site-footer__bottom">
        <span>© {new Date().getFullYear()} Клиника «Сана»</span>
        <span>Информация на сайте представлена в демонстрационных целях</span>
      </div>
    </footer>
  )
}
