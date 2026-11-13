<<<<<<< HEAD
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../components/ui';
import { roleHome, roleLabel, useSession } from '../store';
import type { UserRole } from '../types';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <LoadingState label="Проверяем доступ…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location, message: 'Войдите, чтобы открыть личный кабинет.' }} />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={roleHome[user.role]} replace state={{ message: `Этот раздел доступен для другой роли. Вы вошли как: ${roleLabel[user.role]}.` }} />;
  }
  return <Outlet />;
=======
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
>>>>>>> 46ee541 (Set up clinic foundation and public flows)
}
