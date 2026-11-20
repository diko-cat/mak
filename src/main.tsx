<<<<<<< HEAD
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { SessionProvider, ThemeProvider } from './store';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SessionProvider>
        <BrowserRouter><AppRoutes /></BrowserRouter>
      </SessionProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
=======
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
>>>>>>> 32a33964d3dfc2c35b3233d1af01f7b8fcfc127e
