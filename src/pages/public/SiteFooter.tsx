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
<<<<<<< HEAD
          <Link to="/privacy">Политика конфиденциальности</Link>
=======
>>>>>>> 5cff3fa9cf2e135dcbf1bcbb30ce81446945c742
        </div>
        <a className="footer-top-link" href="#top">Наверх <ArrowUpRight size={15} /></a>
      </div>
      <div className="container site-footer__bottom">
        <span>© {new Date().getFullYear()} Клиника «Сана»</span>
<<<<<<< HEAD
        <span>Демо-сайт: официальные реквизиты и лицензия здесь не указаны</span>
=======
        <span>Информация на сайте представлена в демонстрационных целях</span>
>>>>>>> 5cff3fa9cf2e135dcbf1bcbb30ce81446945c742
      </div>
    </footer>
  )
}
