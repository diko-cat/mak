import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { roleHomePath } from '../pages/public/SiteHeader'
import { useSession } from '../store/session'
import type { Role } from '../types'

interface ProtectedRouteProps extends PropsWithChildren {
  role: Role
}

export function ProtectedRoute({ role, children }: ProtectedRouteProps) {
  const user = useSession()
  const location = useLocation()

  if (!user) {
    return <Navigate to={`/login?role=${role}`} replace state={{
      message: 'Чтобы продолжить, войдите в демо-аккаунт. После входа вы вернётесь в нужный раздел.',
      from: { pathname: location.pathname, search: location.search, hash: location.hash },
    }} />
  }

  if (user.role !== role) {
    return <Navigate to={roleHomePath(user.role)} replace state={{
      notice: `Этот раздел доступен роли «${roleName(role)}». Вы вошли как «${roleName(user.role)}», поэтому открыли свой раздел.`,
    }} />
  }

  return children
}

function roleName(role: Role): string {
  return { patient: 'Пациент', doctor: 'Врач', admin: 'Администратор' }[role]
}
