import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../components';
import { BookingPage } from '../pages/public/BookingPage';
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/public/LoginPage';
import { RoleLanding } from '../pages/public/RoleLanding';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<HomePage />} />
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute allowedRoles={['patient']} />}>
        <Route path="patient" element={<RoleLanding />} />
        <Route path="patient/appointments/new" element={<BookingPage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={['doctor']} />}><Route path="doctor" element={<RoleLanding />} /></Route>
      <Route element={<ProtectedRoute allowedRoles={['registrar']} />}><Route path="registrar" element={<RoleLanding />} /></Route>
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}><Route path="admin" element={<RoleLanding />} /></Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>;
}
