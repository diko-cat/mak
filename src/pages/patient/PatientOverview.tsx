import { ArrowRight, CalendarPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../../components/ui'
import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { formatDate, formatTime, isScheduled } from '../cabinet/format'
import { AppointmentTicket, ConclusionCard, hasDeviations, LabTestCard } from './components'
import type { usePatientData } from './usePatientData'
import { useUnseenIds } from './useUnseenIds'

export function PatientOverview({ patient }: { patient: ReturnType<typeof usePatientData> }) {
  const { patientId, data, doctorOf, serviceOf } = patient
  const newConfirmationIds = useUnseenIds(patientId, 'confirmations', (data?.appointments ?? []).filter((item) => item.status === 'confirmed' && item.confirmedAt).map((item) => item.id))
  if (!data) return <LoadingNote />

  const now = Date.now()
  const next = data.appointments.filter((item) => isScheduled(item) && new Date(item.startsAt).getTime() > now)[0]
  const lastConclusion = data.conclusions[0]
  const readyTests = data.labTests.filter((test) => test.status === 'ready')
  const deviations = readyTests.filter(hasDeviations)
  const conclusionAppointment = lastConclusion && data.appointments.find((item) => item.id === lastConclusion.appointmentId)

  return (
    <div className="cabinet-grid">
      <Panel title="Ближайший приём" action={<Link className="text-link" to="/patient/appointments">Все записи <ArrowRight size={14} /></Link>} className="cabinet-grid__wide">
        {newConfirmationIds.map((id) => {
          const appointment = data.appointments.find((item) => item.id === id)
          if (!appointment) return null
          return <p key={id} className="appointment-confirmation" role="status">Запись подтверждена <span className="new-indicator">новое</span> · {formatDate(appointment.startsAt)} в {formatTime(appointment.startsAt)}</p>
        })}
        {next ? <AppointmentTicket appointment={next} doctor={doctorOf(next.doctorId)} service={serviceOf(next.serviceId)} /> : (
          <div className="empty-cta">
            <EmptyState>У вас нет запланированных приёмов.</EmptyState>
            <Link className={buttonStyles('primary')} to="/patient/appointments/new"><CalendarPlus size={16} />Записаться к врачу</Link>
          </div>
        )}
      </Panel>

      <Panel title="Последнее заключение" action={<Link className="text-link" to="/patient/results">Все результаты <ArrowRight size={14} /></Link>}>
        {lastConclusion ? <ConclusionCard conclusion={lastConclusion} doctor={doctorOf(lastConclusion.doctorId)} appointment={conclusionAppointment} service={conclusionAppointment ? serviceOf(conclusionAppointment.serviceId) : undefined} /> : <EmptyState>Заключений пока нет.</EmptyState>}
      </Panel>

      <Panel title="Анализы с отклонениями">
        {deviations.length > 0
          ? <div className="stack">{deviations.map((test) => <LabTestCard key={test.id} test={test} doctor={doctorOf(test.doctorId)} onlyDeviations />)}</div>
          : data.labTests.length === 0
            ? <EmptyState>Анализов пока нет.</EmptyState>
            : readyTests.length === 0
              ? <EmptyState>Результаты появятся здесь после готовности анализов.</EmptyState>
              : <EmptyState>Все готовые показатели в пределах нормы.</EmptyState>}
      </Panel>
    </div>
  )
}
