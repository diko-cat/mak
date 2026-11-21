import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../../store/session'

const BOOKING_PATH = '/patient/appointments/new'

interface BookLinkProps {
  className?: string
  'aria-label'?: string
}

/** Кнопка «Записаться»: пациента ведёт в форму записи, гостя — на вход с возвратом в форму. */
export function BookLink({ children, ...props }: PropsWithChildren<BookLinkProps>) {
  const user = useSession()
  const state = user ? undefined : {
    message: 'Войдите в демо-аккаунт пациента, чтобы выбрать врача и время приёма.',
    from: { pathname: BOOKING_PATH },
  }
  return <Link {...props} to={user ? BOOKING_PATH : '/login?role=patient'} state={state}>{children}</Link>
}
