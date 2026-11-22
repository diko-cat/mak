import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { ConclusionCard, LabTestCard } from './components'
import type { usePatientData } from './usePatientData'
import { useUnseenIds } from './useUnseenIds'

export function PatientResults({ patient }: { patient: ReturnType<typeof usePatientData> }) {
  const { patientId, data, doctorOf, serviceOf } = patient
  const location = useLocation()
  const resultIds = [
    ...(data?.conclusions.map((entry) => entry.id) ?? []),
    ...(data?.labTests.filter((entry) => entry.status === 'ready').map((entry) => entry.id) ?? []),
  ]
  const newResultIds = useUnseenIds(patientId, 'results', resultIds)

  useEffect(() => {
    if (!data || !location.hash) return
    const frame = requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [data, location.hash])

  if (!data) return <LoadingNote />

  return (
    <>
      <p className="results-new" role="status">Новое: {newResultIds.length} результатов</p>
      <div className="cabinet-grid">
      <Panel title={`Заключения врачей · ${data.conclusions.length}`}>
        {data.conclusions.length > 0
          ? <div className="stack">{data.conclusions.map((conclusion) => {
            const appointment = data.appointments.find((entry) => entry.id === conclusion.appointmentId)
            return <ConclusionCard key={conclusion.id} conclusion={conclusion} doctor={doctorOf(conclusion.doctorId)} appointment={appointment} service={appointment ? serviceOf(appointment.serviceId) : undefined} />
          })}</div>
          : <EmptyState>Заключения появятся здесь после приёма у врача.</EmptyState>}
      </Panel>
      <Panel title={`Анализы · ${data.labTests.length}`}>
        {data.labTests.length > 0
          ? <div className="stack">{data.labTests.map((test) => <LabTestCard key={test.id} test={test} doctor={doctorOf(test.doctorId)} />)}</div>
          : <EmptyState>Анализов пока нет.</EmptyState>}
      </Panel>
      </div>
    </>
  )
}
