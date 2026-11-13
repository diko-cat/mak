import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { ApiError, type Doctor, type Service } from '../../types';
import { useSession } from '../../store';
import { Button, Card, FieldLabel, Input, Select } from '../../components/ui';

function dateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function BookingPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(dateInDays(1));
  const [time, setTime] = useState('09:00');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([api.doctors.list(), api.services.list()]).then(([doctorList, serviceList]) => {
      setDoctors(doctorList);
      setServices(serviceList);
      setDoctorId(doctorList[0]?.id ?? '');
      setServiceId(serviceList[0]?.id ?? '');
    });
  }, []);
  const selectedService = useMemo(() => services.find((service) => service.id === serviceId), [services, serviceId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.linkedId) {
      setError('В демо-профиле пациента не найдено связанное медицинское дело.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const startsAt = new Date(`${date}T${time}:00`);
      await api.appointments.create({ patientId: user.linkedId, doctorId, serviceId, startsAt: startsAt.toISOString(), note: note.trim() || undefined });
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : 'Не удалось создать запись.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="mx-auto min-h-[calc(100vh-152px)] max-w-7xl px-5 py-12 lg:px-8">
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-forest/70 hover:text-forest dark:text-mint/80 dark:hover:text-mint"><ArrowLeft size={16} /> На главную</Link>
      <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-forest/65 dark:text-mint/75">Запись на приём</p>
      <h1 className="mt-3 font-display text-4xl tracking-[-.04em] text-ink sm:text-5xl dark:text-white">Выберите врача и время.</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-ink/55 dark:text-slate-400">Мы сохраним запись в вашем профиле. Администратор клиники подтвердит детали визита.</p>

      {success ? <Card className="mt-8 p-7 sm:p-9"><div className="grid size-12 place-items-center rounded-2xl bg-mint/60 text-forest dark:bg-forest/35 dark:text-mint"><CheckCircle2 size={24} /></div><h2 className="mt-5 font-display text-3xl text-ink dark:text-white">Вы записаны!</h2><p className="mt-3 text-sm leading-6 text-ink/60 dark:text-slate-300">Визит к врачу {doctors.find((doctor) => doctor.id === doctorId)?.name} назначен на {new Date(`${date}T${time}:00`).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}.</p><Button className="mt-6" onClick={() => navigate('/patient')}>В кабинет пациента <ArrowRight size={16} /></Button></Card> : <Card className="mt-8 p-6 sm:p-9">
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div><FieldLabel htmlFor="appointment-doctor">Специалист</FieldLabel><Select id="appointment-doctor" required value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</Select></div>
            <div><FieldLabel htmlFor="appointment-service">Услуга</FieldLabel><Select id="appointment-service" required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Select></div>
            <div><FieldLabel htmlFor="appointment-date">Дата</FieldLabel><div className="relative"><CalendarDays size={17} className="absolute left-4 top-[26px] text-ink/35 dark:text-slate-500" /><Input className="pl-11" id="appointment-date" type="date" required min={dateInDays(0)} value={date} onChange={(event) => setDate(event.target.value)} /></div></div>
            <div><FieldLabel htmlFor="appointment-time">Время</FieldLabel><div className="relative"><Clock3 size={17} className="absolute left-4 top-[26px] z-10 text-ink/35 dark:text-slate-500" /><Select className="pl-11" id="appointment-time" value={time} onChange={(event) => setTime(event.target.value)}>{['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'].map((slot) => <option key={slot} value={slot}>{slot}</option>)}</Select></div></div>
          </div>
          <div><FieldLabel htmlFor="appointment-note" hint="необязательно">Комментарий</FieldLabel><Input id="appointment-note" maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Коротко расскажите, что вас беспокоит" /></div>
          {selectedService && <div className="flex items-center justify-between rounded-2xl bg-[#f3f6f4] px-4 py-3 dark:bg-white/[.045]"><span className="text-xs text-ink/55 dark:text-slate-400">Продолжительность · {selectedService.durationMinutes} минут</span><strong className="text-sm text-forest dark:text-mint">{new Intl.NumberFormat('ru-RU').format(selectedService.price)} ₸</strong></div>}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          <Button type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Подтвердить запись'} <ArrowRight size={16} /></Button>
        </form>
      </Card>}
    </div>
  </div>;
}
