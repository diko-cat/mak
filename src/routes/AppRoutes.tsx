<<<<<<< HEAD
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
=======
import { Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/public/HomePage'
import { LoginPage } from '../pages/public/LoginPage'
import { AppointmentBookingRoute } from './AppointmentBookingRoute'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleLanding } from './RoleLanding'

function NotFoundPage() {
  return <main className="not-found"><div className="container"><p className="eyebrow">СТРАНИЦА НЕ НАЙДЕНА</p><h1>Кажется, вы свернули не туда.</h1><a className="button button--primary" href="/">На главную</a></div></main>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/patient" element={<ProtectedRoute role="patient"><RoleLanding role="patient" /></ProtectedRoute>} />
      <Route path="/patient/appointments/new" element={<ProtectedRoute role="patient"><AppointmentBookingRoute /></ProtectedRoute>} />
      <Route path="/doctor/*" element={<ProtectedRoute role="doctor"><RoleLanding role="doctor" /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute role="admin"><RoleLanding role="admin" /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
>>>>>>> 46ee541 (Set up clinic foundation and public flows)
}
