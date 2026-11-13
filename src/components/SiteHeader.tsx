import { ArrowUpRight, HeartPulse, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { UserRole } from '../types';
import { roleHome, roleLabel, useSession } from '../store';
import { ThemeToggle } from './ui';

export function SiteHeader() {
  const { user, loginAsDemo, logout } = useSession();
  const navigate = useNavigate();

  const switchDemoRole = async (role: string) => {
    if (!role) {
      await logout();
      navigate('/');
      return;
    }
    const nextUser = await loginAsDemo(role as UserRole);
    navigate(roleHome[nextUser.role]);
  };

  return <header className="sticky top-0 z-30 border-b border-forest/[0.06] bg-paper/90 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#101a17]/90">
    <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
      <Link to="/" className="flex shrink-0 items-center gap-3" aria-label="МАК — на главную">
        <span className="grid size-10 place-items-center rounded-2xl bg-forest text-white dark:bg-mint dark:text-forest"><HeartPulse size={21} strokeWidth={2.1} /></span>
        <span><span className="block text-sm font-extrabold tracking-[.12em] text-ink dark:text-white">МАК</span><span className="block text-[10px] font-medium tracking-wide text-ink/50 dark:text-slate-400">МЕДИЦИНСКИЙ ЦЕНТР</span></span>
      </Link>

      <nav className="hidden items-center gap-7 text-sm font-medium text-ink/65 lg:flex dark:text-slate-300">
        <a className="transition hover:text-forest dark:hover:text-white" href="/#about">О клинике</a>
        <a className="transition hover:text-forest dark:hover:text-white" href="/#services">Услуги и цены</a>
        <a className="transition hover:text-forest dark:hover:text-white" href="/#doctors">Врачи</a>
        <a className="transition hover:text-forest dark:hover:text-white" href="/#contacts">Контакты</a>
      </nav>

      <div className="flex items-center gap-2">
        <label className="hidden sm:block">
          <span className="sr-only">Демо-роль</span>
          <select aria-label="Переключить демо-роль" value={user?.role ?? ''} onChange={(event) => void switchDemoRole(event.target.value)} className="h-10 max-w-[155px] rounded-full border border-forest/10 bg-white/75 px-3 text-xs font-semibold text-ink outline-none hover:border-forest/30 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
            <option value="">Демо: гость</option>
            <option value="patient">Демо: пациент</option>
            <option value="doctor">Демо: врач</option>
            <option value="registrar">Демо: регистратор</option>
            <option value="admin">Демо: администратор</option>
          </select>
        </label>
        {user ? <>
          <Link to={roleHome[user.role]} className="hidden items-center gap-1 px-2 text-xs font-semibold text-forest sm:inline-flex dark:text-mint">{roleLabel[user.role]}<ArrowUpRight size={14} /></Link>
          <button type="button" aria-label="Выйти" title="Выйти" onClick={() => { void logout().then(() => navigate('/')); }} className="grid size-10 place-items-center rounded-full text-ink/50 transition hover:bg-forest/5 hover:text-forest dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"><LogOut size={17} /></button>
        </> : <Link to="/login" className="hidden rounded-full px-3 py-2 text-xs font-semibold text-forest hover:bg-forest/5 sm:inline-flex dark:text-mint dark:hover:bg-white/10">Войти</Link>}
        <ThemeToggle />
      </div>
    </div>
  </header>;
}
