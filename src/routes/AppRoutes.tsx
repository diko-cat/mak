import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { AdminPage } from '../pages/admin/AdminPage'
import { HomePage } from '../pages/public/HomePage'
import { LoginPage } from '../pages/public/LoginPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { PrivacyPage } from '../pages/public/PrivacyPage'
import { AboutPage, ContactsPage, DoctorsPage, ServicesPage } from '../pages/public/PublicPages'
import { DoctorCabinet } from '../pages/doctor/DoctorCabinet'
import { PatientCabinet } from '../pages/patient/PatientCabinet'
import { ProtectedRoute } from './ProtectedRoute'

/** Новая страница открывается сверху; при «Назад» браузер сам вернёт прокрутку. */
function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])
  return null
}

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/patient/*" element={<ProtectedRoute role="patient"><PatientCabinet /></ProtectedRoute>} />
        <Route path="/doctor/*" element={<ProtectedRoute role="doctor"><DoctorCabinet /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
