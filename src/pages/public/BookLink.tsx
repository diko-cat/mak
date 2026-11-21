import { useEffect, useState, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { BOOKING_PATH, bookingSearch, type BookingParams } from '../../routes/booking'
import { useSession } from '../../store/session'

const roleNames = { doctor: 'Врач', admin: 'Администратор' } as const

interface BookLinkProps extends BookingParams {
  className?: string
  'aria-label'?: string
}

/**
 * «Записаться» с выбранным врачом и услугой.
 * Пациент попадает в форму, гость — на вход и после него обратно в форму с тем же выбором,
 * врач и администратор видят сообщение вместо перехода в чужой кабинет.
 */
export function BookLink({ children, doctorId, serviceId, ...props }: PropsWithChildren<BookLinkProps>) {
  const user = useSession()
  const [staffNotice, setStaffNotice] = useState(false)
  const search = bookingSearch({ doctorId, serviceId })
  const loginState = {
    message: 'Войдите в демо-аккаунт пациента — после входа откроется запись с уже выбранным врачом и услугой.',
    from: { pathname: BOOKING_PATH, search },
  }

  useEffect(() => {
    if (!staffNotice) return
    const timer = window.setTimeout(() => setStaffNotice(false), 8000)
    return () => window.clearTimeout(timer)
  }, [staffNotice])

  if (!user) return <Link {...props} to="/login?role=patient" state={loginState}>{children}</Link>
  if (user.role === 'patient') return <Link {...props} to={`${BOOKING_PATH}${search}`}>{children}</Link>

  return (
    <>
      <Link {...props} to={`${BOOKING_PATH}${search}`} onClick={(event) => { event.preventDefault(); setStaffNotice(true) }}>{children}</Link>
      {staffNotice && createPortal(
        <div className="booking-toast" role="alert">
          <p>Записаться на приём может только пациент. Сейчас вы вошли как «{roleNames[user.role]}».</p>
          <div>
            <Link to="/login?role=patient" state={loginState}>Войти как пациент</Link>
            <button type="button" onClick={() => setStaffNotice(false)}>Понятно</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
