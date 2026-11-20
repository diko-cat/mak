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
}
