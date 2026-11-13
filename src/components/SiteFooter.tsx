import { ArrowUpRight, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

export function SiteFooter() {
  return <footer className="border-t border-forest/10 bg-white/50 dark:border-white/10 dark:bg-[#101a17]">
    <div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <Link to="/" className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-forest text-white dark:bg-mint dark:text-forest"><HeartPulse size={19} /></span>
        <span><span className="block text-xs font-extrabold tracking-[.12em] text-ink dark:text-white">МАК</span><span className="block text-[9px] text-ink/50 dark:text-slate-400">Здоровье начинается с доверия</span></span>
      </Link>
      <p className="text-xs text-ink/45 dark:text-slate-500">© {new Date().getFullYear()} Медицинский центр МАК</p>
      <a href="#top" className="inline-flex items-center gap-1 text-xs font-semibold text-forest dark:text-mint">Наверх <ArrowUpRight size={14} /></a>
    </div>
  </footer>;
}
