import { Link } from 'react-router-dom'

export function NotFoundPage({ title = 'Кажется, вы свернули не туда.' }: { title?: string }) {
  return <main className="not-found"><div className="container"><p className="eyebrow">СТРАНИЦА НЕ НАЙДЕНА</p><h1>{title}</h1><Link className="button button--primary" to="/">На главную</Link></div></main>
}
