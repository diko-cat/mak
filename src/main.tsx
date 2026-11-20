import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes/AppRoutes'
import { SiteFooter } from './pages/public/SiteFooter'
import { SiteHeader } from './pages/public/SiteHeader'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <AppRoutes />
        <SiteFooter />
      </div>
    </BrowserRouter>
  </React.StrictMode>,
)
<<<<<<< HEAD
=======
>>>>>>> 32a33964d3dfc2c35b3233d1af01f7b8fcfc127e
>>>>>>> 53d41b56e91a232979132ad699ea09408bd59c65
