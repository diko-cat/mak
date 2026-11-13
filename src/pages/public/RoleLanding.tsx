import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { roleLabel, useSession } from '../../store';

export function RoleLanding() {
  const { user } = useSession();
  const location = useLocation();
  const message = (location.state as { message?: string } | null)?.message;
  return <div className="mx-auto flex min-h-[calc(100vh-152px)] max-w-7xl items-center justify-center px-5 py-12 lg:px-8">
    <Card className="w-full max-w-xl p-7 sm:p-10">
      <span className="grid size-12 place-items-center rounded-2xl bg-mint/60 text-forest dark:bg-forest/35 dark:text-mint"><ShieldCheck size={22} /></span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-forest/65 dark:text-mint/75">{user ? roleLabel[user.role] : 'Личный кабинет'}</p>
      <h1 className="mt-3 font-display text-3xl tracking-tight text-ink dark:text-white">Здравствуйте, {user?.name.split(' ')[0]}.</h1>
      <p className="mt-3 text-sm leading-6 text-ink/60 dark:text-slate-300">Ваш защищённый раздел открыт. Рабочая панель подключается.</p>
      {message && <p className="mt-5 rounded-2xl bg-mint/40 px-4 py-3 text-sm text-forest dark:bg-forest/30 dark:text-mint">{message}</p>}
      <div className="mt-7 flex flex-wrap gap-3"><Link to="/"><Button variant="secondary">На главную</Button></Link>{user?.role === 'patient' && <Link to="/patient/appointments/new"><Button>Записаться на приём <ArrowRight size={16} /></Button></Link>}</div>
    </Card>
  </div>;
}
