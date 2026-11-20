import { Route, Routes } from 'react-router-dom'
import { AdminPage } from '../pages/admin/AdminPage'
import { HomePage } from '../pages/public/HomePage'
import { LoginPage } from '../pages/public/LoginPage'
import { DoctorCabinet } from '../pages/doctor/DoctorCabinet'
import { PatientCabinet } from '../pages/patient/PatientCabinet'
import { ProtectedRoute } from './ProtectedRoute'

function NotFoundPage() {
  return <main className="not-found"><div className="container"><p className="eyebrow">СТРАНИЦА НЕ НАЙДЕНА</p><h1>Кажется, вы свернули не туда.</h1><a className="button button--primary" href="/">На главную</a></div></main>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/patient/*" element={<ProtectedRoute role="patient"><PatientCabinet /></ProtectedRoute>} />
      <Route path="/doctor/*" element={<ProtectedRoute role="doctor"><DoctorCabinet /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
<<<<<<< HEAD
=======
>>>>>>> 32a33964d3dfc2c35b3233d1af01f7b8fcfc127e
>>>>>>> 53d41b56e91a232979132ad699ea09408bd59c65
}
