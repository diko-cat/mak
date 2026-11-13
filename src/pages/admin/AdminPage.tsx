import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Card } from '../../components/ui';
import type { Appointment, CallbackRequest, Doctor, Patient, Service } from '../../types';

export function AdminPage() {
  const [data, setData] = useState<{ appointments: Appointment[]; callbacks: CallbackRequest[]; doctors: Doctor[]; patients: Patient[]; services: Service[] }>();
  useEffect(() => {
    Promise.all([api.appointments.list(), api.callbacks.list(), api.doctors.list(), api.patients.list(), api.services.list()])
      .then(([appointments, callbacks, doctors, patients, services]) => setData({ appointments, callbacks, doctors, patients, services }));
  }, []);
  if (!data) return <p className="mx-auto max-w-7xl px-5 py-12" role="status">Загрузка панели…</p>;
  const today = new Date().toDateString();
  const todayAppointments = data.appointments.filter((a) => new Date(a.startsAt).toDateString() === today && a.status !== 'cancelled');
  const fresh = data.callbacks.filter((c) => c.status === 'new');
  const earnings = todayAppointments.reduce((sum, appointment) => sum + (data.services.find((s) => s.id === appointment.serviceId)?.price ?? 0), 0);
  const patient = (id: string) => data.patients.find((p) => p.id === id)?.name ?? 'Пациент';
  return <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <h1 className="font-display text-3xl text-ink dark:text-white">Панель администратора</h1>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Записей сегодня', todayAppointments.length], ['Новых заявок', fresh.length], ['Врачи на приёме', data.doctors.length], ['Ожидаемая выручка', `${earnings.toLocaleString('ru-RU')} ₸`]].map(([label, value]) => <Card key={label} className="p-5"><p className="text-sm text-ink/60 dark:text-slate-300">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</div>
    <section className="mt-8"><h2 className="text-xl font-semibold">Загрузка врачей</h2><div className="mt-4 grid gap-3">{data.doctors.map((doctor) => { const count = todayAppointments.filter((a) => a.doctorId === doctor.id).length; return <Card key={doctor.id} className="p-4"><div className="flex justify-between gap-4 text-sm"><span>{doctor.name}</span><span>{count} / 16</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-forest/10" role="progressbar" aria-label={`Загрузка: ${doctor.name}`} aria-valuemin={0} aria-valuemax={16} aria-valuenow={count}><div className="h-full rounded-full bg-forest dark:bg-mint" style={{ width: `${Math.min(100, count / 16 * 100)}%` }} /></div></Card>; })}</div></section>
    <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Новые заявки</h2><Link className="text-sm underline" to="/admin/callbacks">Все заявки</Link></div><div className="mt-4 grid gap-3">{fresh.slice(0, 3).map((callback) => <Card className="p-4" key={callback.id}><p className="font-medium">{callback.name} · {callback.phone}</p><p className="mt-1 text-sm text-ink/60 dark:text-slate-300">{callback.preferredTime ?? 'Время не указано'}</p></Card>)}{fresh.length === 0 && <p>Новых заявок нет.</p>}</div></section>
    <section className="mt-8"><h2 className="text-xl font-semibold">Последние записи</h2><div className="mt-4 grid gap-3">{[...data.appointments].sort((a,b) => b.startsAt.localeCompare(a.startsAt)).slice(0,5).map((a) => <Card className="p-4" key={a.id}>{patient(a.patientId)} · {new Date(a.startsAt).toLocaleString('ru-RU')}</Card>)}</div></section>
  </div>;
}
