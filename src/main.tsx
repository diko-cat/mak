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
