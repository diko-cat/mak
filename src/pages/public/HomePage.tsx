import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Heart, MapPin, Phone, ShieldCheck, Sparkles, Stethoscope, Users, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { Clinic, Doctor, Service, UserRole } from '../../types';
import { roleHome, useSession } from '../../store';
import { Button, Card, FieldLabel, Input, SectionHeading } from '../../components/ui';

const roleCards: { role: UserRole; title: string; description: string; icon: typeof Heart }[] = [
  { role: 'patient', title: 'Пациент', description: 'Записывайтесь к врачу, смотрите заключения и результаты анализов.', icon: Heart },
  { role: 'doctor', title: 'Врач', description: 'Работайте с расписанием, картами пациентов и медицинскими заключениями.', icon: Stethoscope },
  { role: 'registrar', title: 'Регистратор', description: 'Помогайте пациентам с записью и управляйте обращениями.', icon: Users },
  { role: 'admin', title: 'Администратор', description: 'Следите за работой клиники и управляйте справочниками.', icon: ShieldCheck },
];

const initials = (name: string) => name.split(' ').slice(0, 2).map((part) => part[0]).join('');

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', preferredTime: '' });
  const [callbackState, setCallbackState] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void Promise.all([api.clinic.get(), api.doctors.list(), api.services.list()]).then(([clinicData, doctorData, serviceData]) => {
      setClinic(clinicData);
      setDoctors(doctorData);
      setServices(serviceData);
    });
  }, []);

  const goToBooking = () => {
    if (!user) {
      navigate('/login?next=%2Fpatient%2Fappointments%2Fnew&message=Войдите%2C%20чтобы%20выбрать%20врача%20и%20время%20приёма.');
      return;
    }
    navigate(user.role === 'patient' ? '/patient/appointments/new' : roleHome[user.role]);
  };

  const submitCallback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setCallbackState(null);
    try {
      await api.callbacks.create(form);
      setForm({ name: '', phone: '', preferredTime: '' });
      setCallbackState({ kind: 'success', message: 'Спасибо! Заявка сохранена, мы скоро вам позвоним.' });
    } catch (error) {
      setCallbackState({ kind: 'error', message: error instanceof Error ? error.message : 'Не удалось отправить заявку.' });
    } finally {
      setSending(false);
    }
  };

  const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₸`;

  return <div id="top">
    <section className="relative overflow-hidden px-5 pb-16 pt-10 sm:pb-24 sm:pt-14 lg:px-8 lg:pt-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
        <div className="relative z-10 py-4">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-forest/10 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[.12em] text-forest dark:border-white/10 dark:bg-white/[0.06] dark:text-mint"><Sparkles size={14} /> Медицина с человеческим лицом</div>
          <h1 className="max-w-[680px] font-display text-[clamp(3rem,7.4vw,6.2rem)] leading-[.99] tracking-[-.055em] text-ink dark:text-white">Здоровье начинается <span className="text-forest dark:text-mint">с доверия.</span></h1>
          <p className="mt-7 max-w-[490px] text-base leading-7 text-ink/65 sm:text-lg sm:leading-8 dark:text-slate-300">{clinic?.description ?? 'Внимательные врачи, точная диагностика и понятный план заботы о вас — в одном месте.'}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button className="min-h-12 px-6" onClick={goToBooking}>Записаться на приём <ArrowRight size={17} /></Button>
            <a href="#about" className="inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-ink/70 transition hover:bg-forest/5 dark:text-slate-300 dark:hover:bg-white/10">Узнать о клинике <ArrowDown size={15} /></a>
          </div>
          <div className="mt-10 flex items-center gap-4 border-t border-forest/10 pt-6 dark:border-white/10">
            <div className="flex -space-x-2">
              {['АН', 'ТА', 'СБ', 'ЕО'].map((person, index) => <span key={person} className={`grid size-9 place-items-center rounded-full border-2 border-paper text-[10px] font-bold text-forest dark:border-[#101a17] ${['bg-[#d6e5d9]', 'bg-[#f0dfc9]', 'bg-[#efd9ce]', 'bg-[#d6dfee]'][index]}`}>{person}</span>)}
            </div>
            <p className="text-xs leading-5 text-ink/55 dark:text-slate-400"><strong className="font-bold text-ink dark:text-white">6 специалистов</strong><br />на вашей стороне каждый день</p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[580px] lg:max-w-none">
          <div className="absolute -right-3 -top-4 size-44 rounded-full bg-[#e2eee6] blur-2xl dark:bg-forest/35" />
          <div className="absolute -bottom-5 -left-5 size-40 rounded-full bg-[#fae7d8] blur-3xl dark:bg-[#824b39]/25" />
          <div className="relative min-h-[420px] overflow-hidden rounded-[34px] bg-[#183f36] p-6 text-white shadow-soft sm:min-h-[510px] sm:p-9">
            <div className="absolute inset-0 opacity-35" style={{ background: 'radial-gradient(circle at 78% 25%, #93b8a7 0, transparent 28%), radial-gradient(circle at 17% 93%, #8eaa91 0, transparent 34%)' }} />
            <div className="absolute -right-20 top-12 size-[390px] rounded-full border border-white/15" />
            <div className="absolute -right-5 top-28 size-[250px] rounded-full border border-white/15" />
            <div className="relative flex h-full min-h-[370px] flex-col justify-between sm:min-h-[430px]">
              <div className="flex items-start justify-between gap-5">
                <div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-white/60">Место, где слышат</p><p className="mt-3 max-w-[290px] font-display text-3xl leading-tight tracking-[-.035em] sm:text-4xl">Ваше здоровье — наша общая забота</p></div>
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10"><Heart size={20} /></span>
              </div>
              <div className="relative flex items-end justify-center py-4">
                <div className="absolute bottom-5 h-14 w-[82%] rounded-[50%] bg-black/20 blur-xl" />
                <div className="relative flex h-[225px] w-[205px] items-end justify-center overflow-hidden rounded-t-[100px] bg-gradient-to-b from-[#d8e7da] to-[#93b6a4] sm:h-[280px] sm:w-[250px]">
                  <div className="absolute top-9 size-[92px] rounded-full bg-[#d8b49e] shadow-[inset_-10px_-7px_0_rgba(80,46,37,.08)] sm:size-[112px]" />
                  <div className="absolute top-[26px] h-14 w-[105px] rounded-t-full bg-[#342b2a] sm:h-16 sm:w-[128px]" />
                  <div className="absolute bottom-[-32px] h-[150px] w-[190px] rounded-t-[90px] bg-[#f4f5ef] sm:h-[175px] sm:w-[225px]" />
                  <div className="absolute bottom-[73px] left-1/2 h-[78px] w-[2px] -translate-x-1/2 rotate-[12deg] bg-[#d8b49e] sm:bottom-[88px] sm:h-[91px]" />
                  <div className="absolute bottom-0 h-10 w-full bg-[#316a57]/30" />
                </div>
                <div className="absolute bottom-5 right-0 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md sm:right-2 sm:p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-7 place-items-center rounded-full bg-[#b8d8c5] text-forest"><Check size={15} /></span>Доказательная медицина</div>
                  <p className="mt-1 pl-9 text-[10px] text-white/65">Ничего лишнего — только нужное</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/15 pt-4 text-xs text-white/70"><span>Забота с 2012 года</span><span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-[#b8d8c5]" /> Открыты сегодня до 20:00</span></div>
            </div>
          </div>
          <div className="absolute -left-3 top-[42%] hidden -translate-y-1/2 rounded-2xl border border-forest/10 bg-white px-4 py-3 shadow-soft sm:block dark:border-white/10 dark:bg-[#1c2d27]">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#eff5ef] text-forest dark:bg-forest/30 dark:text-mint"><Clock3 size={19} /></span><span><span className="block text-xs font-bold text-ink dark:text-white">Без спешки</span><span className="mt-1 block text-[10px] text-ink/50 dark:text-slate-400">Врач уделит вам время</span></span></div>
          </div>
        </div>
      </div>
    </section>

    <section className="border-y border-forest/[0.07] bg-white/65 dark:border-white/[0.07] dark:bg-white/[0.025]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-forest/10 px-5 py-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-8 dark:divide-white/10">
        {[
          { value: clinic?.foundedYear ?? 2012, label: 'год заботы о здоровье', icon: Heart },
          { value: `${doctors.length || 6}`, label: 'внимательных специалистов', icon: Users },
          { value: '08–20', label: 'часы работы · Пн–Сб', icon: Clock3 },
        ].map(({ value, label, icon: Icon }) => <div key={label} className="flex items-center gap-4 py-4 sm:justify-center sm:py-3"><span className="grid size-11 place-items-center rounded-2xl bg-mint/65 text-forest dark:bg-forest/35 dark:text-mint"><Icon size={19} /></span><span><strong className="block font-display text-2xl tracking-tight text-ink dark:text-white">{value}</strong><small className="text-xs text-ink/55 dark:text-slate-400">{label}</small></span></div>)}
      </div>
    </section>

    <section id="about" className="scroll-mt-24 px-5 py-20 sm:py-24 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[.86fr_1.14fr]">
        <div><SectionHeading eyebrow="О клинике" title="Медицина, в которой есть место человеку.">Мы создали клинику, куда можно прийти без тревоги. Здесь объясняют, отвечают на вопросы и вместе с вами выбирают следующий шаг.</SectionHeading><a href="#contacts" className="inline-flex items-center gap-2 text-sm font-bold text-forest dark:text-mint">Познакомиться с нами <ArrowUpRight size={16} /></a></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(clinic?.principles ?? ['Слушаем и объясняем простыми словами', 'Опираемся на доказательную медицину', 'Уважаем ваше время и выбор']).map((principle, index) => <Card key={principle} className="min-h-[190px] p-5 sm:p-6">
            <span className="mb-9 grid size-10 place-items-center rounded-xl bg-[#edf4ee] font-display text-lg text-forest dark:bg-forest/30 dark:text-mint">0{index + 1}</span><p className="text-sm font-semibold leading-6 text-ink dark:text-slate-100">{principle}</p>
          </Card>)}
        </div>
      </div>
    </section>

    <section id="services" className="scroll-mt-24 bg-[#edf3ef] px-5 py-20 sm:py-24 dark:bg-[#14231e]">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><SectionHeading eyebrow="Прайс-лист" title="Понятная стоимость лечения."><span>Все цены указаны в тенге. Перед приёмом администратор подтвердит стоимость выбранной услуги.</span></SectionHeading><span className="mb-9 inline-flex items-center gap-2 text-xs text-ink/50 dark:text-slate-400"><Wallet size={16} /> Без скрытых услуг</span></div>
        <div className="grid gap-2 md:grid-cols-2">
          {services.map((service, index) => <div key={service.id} className="flex items-center justify-between gap-4 rounded-2xl border border-forest/[0.06] bg-white/80 p-4 sm:px-5 dark:border-white/[0.07] dark:bg-white/[0.035]">
            <div className="flex min-w-0 items-center gap-4"><span className="hidden size-9 shrink-0 place-items-center rounded-xl bg-[#edf4ee] text-xs font-bold text-forest sm:grid dark:bg-forest/30 dark:text-mint">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0"><strong className="block truncate text-sm font-semibold text-ink dark:text-slate-100">{service.name}</strong><small className="mt-1 block truncate text-xs text-ink/50 dark:text-slate-400">{service.description}</small></span></div>
            <span className="shrink-0 text-sm font-bold text-forest dark:text-mint">{money(service.price)}</span>
          </div>)}
        </div>
        <div className="mt-7 flex justify-center"><Button variant="secondary" onClick={goToBooking}>Подобрать приём <ArrowRight size={16} /></Button></div>
      </div>
    </section>

    <section id="doctors" className="scroll-mt-24 px-5 py-20 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><SectionHeading eyebrow="Команда" title="Люди, которым можно доверить здоровье.">Опытные специалисты, внимательные к деталям и к вам.</SectionHeading><a href="#contacts" className="mb-9 inline-flex items-center gap-2 text-sm font-bold text-forest dark:text-mint">Все специалисты <ArrowRight size={16} /></a></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor, index) => <Card key={doctor.id} className="group overflow-hidden p-4 transition hover:-translate-y-1 hover:shadow-soft sm:p-5">
            <div className={`relative mb-5 flex h-48 items-end justify-center overflow-hidden rounded-[22px] ${['bg-[#e5eee6]', 'bg-[#f2e9dc]', 'bg-[#f4e4dc]', 'bg-[#e4eaf1]', 'bg-[#f2e1e6]', 'bg-[#ebe6f1]'][index % 6]} dark:brightness-[.82]`}>
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/10 to-transparent" />
              <div className="relative mb-[-2px] flex size-32 items-center justify-center rounded-t-[90px] bg-white/50 font-display text-3xl font-medium text-forest/75 ring-1 ring-white/40 dark:bg-white/15 dark:text-white/85">{initials(doctor.name)}</div>
              <span className="absolute bottom-3 left-3 rounded-full border border-white/50 bg-white/70 px-3 py-1.5 text-[10px] font-semibold text-forest backdrop-blur dark:border-white/10 dark:bg-black/25 dark:text-white">Стаж {doctor.experienceYears} лет</span>
            </div>
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-forest dark:text-mint">{doctor.specialty}</p><h3 className="mt-1 text-lg font-semibold tracking-tight text-ink dark:text-white">{doctor.name}</h3></div><span className="mt-1 grid size-9 place-items-center rounded-full bg-mint/60 text-forest transition group-hover:bg-forest group-hover:text-white dark:bg-forest/40 dark:text-mint"><ArrowUpRight size={16} /></span></div>
            <p className="mt-3 min-h-10 text-xs leading-5 text-ink/55 dark:text-slate-400">{doctor.bio}</p>
            <button onClick={goToBooking} className="mt-4 w-full rounded-xl border border-forest/10 py-2.5 text-xs font-bold text-forest transition hover:bg-forest hover:text-white dark:border-white/10 dark:text-mint dark:hover:bg-mint dark:hover:text-forest">Записаться к врачу</button>
          </Card>)}
        </div>
      </div>
    </section>

    <section className="bg-[#183f36] px-5 py-20 text-white sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl"><div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-mint/80">Личный кабинет</p><h2 className="max-w-2xl font-display text-3xl leading-tight tracking-[-.035em] sm:text-4xl">Четыре вида доступа. Одна команда.</h2></div><p className="max-w-sm text-sm leading-6 text-white/65">Выберите свою роль, чтобы продолжить работу или позаботиться о здоровье.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roleCards.map(({ role, title, description, icon: Icon }, index) => <button key={role} onClick={() => navigate(`/login?role=${role}`)} className="group rounded-2xl border border-white/15 bg-white/[.055] p-5 text-left transition hover:-translate-y-1 hover:border-white/35 hover:bg-white/10">
            <div className="mb-8 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-mint"><Icon size={19} /></span><span className="text-xs text-white/35">0{index + 1}</span></div>
            <h3 className="text-base font-semibold">{title}</h3><p className="mt-2 min-h-[60px] text-xs leading-5 text-white/60">{description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-mint">Войти <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
          </button>)}
        </div>
      </div>
    </section>

    <section id="contacts" className="scroll-mt-24 px-5 py-20 sm:py-24 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.9fr_1.1fr]">
        <div><SectionHeading eyebrow="Контакты" title="Мы рядом, когда нужны.">Будем рады помочь с выбором врача, услугой или удобным временем для визита.</SectionHeading>
          <div className="space-y-4">
            <a href={`tel:${(clinic?.phone ?? '+77172552020').replace(/\s/g, '')}`} className="flex items-center gap-4 rounded-2xl p-3 transition hover:bg-white dark:hover:bg-white/[.05]"><span className="grid size-11 place-items-center rounded-2xl bg-mint/60 text-forest dark:bg-forest/35 dark:text-mint"><Phone size={18} /></span><span><small className="block text-xs text-ink/50 dark:text-slate-400">Позвоните нам</small><strong className="mt-1 block text-sm text-ink dark:text-white">{clinic?.phone ?? '+7 (7172) 55-20-20'}</strong></span></a>
            <div className="flex items-center gap-4 rounded-2xl p-3"><span className="grid size-11 place-items-center rounded-2xl bg-mint/60 text-forest dark:bg-forest/35 dark:text-mint"><MapPin size={18} /></span><span><small className="block text-xs text-ink/50 dark:text-slate-400">Адрес клиники</small><strong className="mt-1 block text-sm text-ink dark:text-white">{clinic?.address ?? 'Астана, проспект Мәңгілік Ел, 42'}</strong></span></div>
            <div className="flex items-center gap-4 rounded-2xl p-3"><span className="grid size-11 place-items-center rounded-2xl bg-mint/60 text-forest dark:bg-forest/35 dark:text-mint"><Clock3 size={18} /></span><span><small className="block text-xs text-ink/50 dark:text-slate-400">Время работы</small><strong className="mt-1 block text-sm text-ink dark:text-white">{clinic?.workHours ?? 'Пн–Сб · 08:00–20:00'}</strong></span></div>
          </div>
          <div className="mt-7 h-40 overflow-hidden rounded-3xl bg-[#e7eee9] dark:bg-[#1a3028]"><div className="relative grid h-full place-items-center overflow-hidden"><div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(28deg, transparent 46%, rgba(42,101,79,.15) 47%, rgba(42,101,79,.15) 49%, transparent 50%), linear-gradient(120deg, transparent 55%, rgba(42,101,79,.12) 56%, rgba(42,101,79,.12) 58%, transparent 59%)', backgroundSize: '120px 100px, 150px 120px' }} /><span className="relative inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-forest shadow dark:bg-[#203b31] dark:text-mint"><MapPin size={15} /> МАК · Астана</span></div></div>
        </div>
        <Card className="p-6 sm:p-9">
          <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-forest/65 dark:text-mint/75">Обратный звонок</p><h3 className="mt-3 font-display text-3xl tracking-tight text-ink dark:text-white">Оставьте номер — мы перезвоним.</h3><p className="mt-3 text-sm leading-6 text-ink/55 dark:text-slate-400">Ответим на вопросы и подскажем, к какому специалисту записаться.</p></div>
          <form className="space-y-5" onSubmit={(event) => void submitCallback(event)}>
            <div><FieldLabel htmlFor="callback-name">Как к вам обращаться</FieldLabel><Input id="callback-name" autoComplete="name" required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ваше имя" /></div>
            <div><FieldLabel htmlFor="callback-phone">Номер телефона</FieldLabel><Input id="callback-phone" type="tel" autoComplete="tel" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+7 (___) ___-__-__" /></div>
            <div><FieldLabel htmlFor="callback-time" hint="необязательно">Когда удобно позвонить?</FieldLabel><Input id="callback-time" value={form.preferredTime} onChange={(event) => setForm({ ...form, preferredTime: event.target.value })} placeholder="Например, после 16:00" /></div>
            {callbackState && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${callbackState.kind === 'success' ? 'bg-mint/50 text-forest dark:bg-forest/30 dark:text-mint' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'}`}>{callbackState.message}</p>}
            <Button className="w-full" type="submit" disabled={sending}>{sending ? 'Отправляем…' : 'Заказать звонок'} <ArrowRight size={16} /></Button>
            <p className="text-center text-[10px] leading-4 text-ink/40 dark:text-slate-500">Нажимая кнопку, вы соглашаетесь на обратный звонок от клиники.</p>
          </form>
        </Card>
      </div>
    </section>
  </div>;
}
