import { Outlet } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function PublicLayout() {
  return <div className="min-h-screen bg-paper text-ink transition-colors dark:bg-[#101a17] dark:text-slate-100">
    <SiteHeader />
    <main><Outlet /></main>
    <SiteFooter />
  </div>;
}
