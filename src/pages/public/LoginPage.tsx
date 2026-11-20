import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, HeartPulse, LockKeyhole, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, FieldLabel, Input, Select } from '../../components/ui';
import { useSession, roleHome, roleLabel } from '../../store';
import type { UserRole } from '../../types';
import { readDatabase } from '../../api/storage';

const roles: UserRole[] = ['patient', 'doctor', 'registrar', 'admin'];

export function LoginPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useSession();
  const requestedRole = params.get('role') as UserRole | null;
  const initialRole = requestedRole && roles.includes(requestedRole) ? requestedRole : 'patient';
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const account = readDatabase().users.find((user) => user.role === role);

  useEffect(() => {
    const demo = readDatabase().users.find((user) => user.role === role);
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
    }
  }, [role]);

  const fromState = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const message = params.get('message') ?? (fromState ? 'Войдите, чтобы открыть выбранный раздел.' : '');
  const next = params.get('next') ?? fromState;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const user = await login({ email, password });
      const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : undefined;
      const destination = safeNext && (user.role === 'patient' || !safeNext.startsWith('/patient')) ? safeNext : roleHome[user.role];
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось войти. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="mx-auto grid min-h-[calc(100vh-152px)] max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:px-8">
    <div className="mx-auto w-full max-w-lg">
      <Link to="/" className="mb-9 inline-flex items-center gap-2 text-sm font-semibold text-forest/70 transition hover:text-forest dark:text-mint/80 dark:hover:text-mint"><ArrowLeft size={16} /> На главную</Link>
      <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-forest/65 dark:text-mint/75">Личный кабинет</p>
      <h1 className="font-display text-4xl tracking-[-.04em] text-ink sm:text-5xl dark:text-white">Добро пожаловать.</h1>
      <p className="mt-4 text-sm leading-6 text-ink/55 dark:text-slate-400">Выберите роль и войдите в аккаунт клиники.</p>
      {message && <div role="status" className="mt-6 rounded-2xl border border-forest/10 bg-mint/40 px-4 py-3 text-sm text-forest dark:border-white/10 dark:bg-forest/30 dark:text-mint">{message}</div>}

      <Card className="mt-6 p-6 sm:p-8">
        <form className="space-y-5" onSubmit={(event) => void submit(event)}>
          <div><FieldLabel htmlFor="login-role">Ваша роль</FieldLabel><Select id="login-role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            {roles.map((item) => <option key={item} value={item}>{roleLabel[item]}</option>)}
          </Select></div>
          <div><FieldLabel htmlFor="login-email">Email</FieldLabel><div className="relative"><Mail size={17} className="absolute left-4 top-[26px] text-ink/35 dark:text-slate-500" /><Input className="pl-11" id="login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></div></div>
          <div><FieldLabel htmlFor="login-password">Пароль</FieldLabel><div className="relative"><LockKeyhole size={17} className="absolute left-4 top-[26px] text-ink/35 dark:text-slate-500" /><Input className="pl-11" id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Входим…' : 'Войти'} <ArrowRight size={16} /></Button>
        </form>
        <div className="mt-6 rounded-2xl bg-[#f3f6f4] p-4 dark:bg-white/[.045]"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-ink/45 dark:text-slate-500">Демо-доступ · {roleLabel[role]}</p><p className="mt-2 text-xs text-ink/70 dark:text-slate-300"><strong className="font-semibold">{account?.email}</strong><span className="px-2 text-ink/25">·</span>{account?.password}</p><p className="mt-2 text-[10px] leading-4 text-ink/40 dark:text-slate-500">Email и пароль подставлены автоматически. Можно войти сразу.</p></div>
      </Card>
    </div>
    <div className="relative hidden min-h-[590px] overflow-hidden rounded-[34px] bg-[#183f36] p-9 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-28 -top-16 size-[520px] rounded-full border border-white/10" /><div className="absolute -right-3 top-14 size-[340px] rounded-full border border-white/10" />
      <Link to="/" className="relative flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white/10"><HeartPulse size={22} /></span><span className="text-sm font-bold tracking-[.14em]">МАК</span></Link>
      <div className="relative max-w-md"><p className="text-xs font-bold uppercase tracking-[.18em] text-mint/75">Забота рядом</p><h2 className="mt-4 font-display text-5xl leading-[1.05] tracking-[-.04em]">Пространство, где вас слышат.</h2><p className="mt-5 text-sm leading-7 text-white/65">Записи, заключения и результаты анализов — в одном месте. Мы рядом на каждом шаге.</p></div>
      <div className="relative flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/55"><span>Доказательно · внимательно · по-человечески</span><span>01 / 04</span></div>
    </div>
  </div>;
}
