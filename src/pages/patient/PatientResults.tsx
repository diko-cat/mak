import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { ConclusionCard, LabTestCard } from './components'
import type { usePatientData } from './usePatientData'

export function PatientResults({ patient }: { patient: ReturnType<typeof usePatientData> }) {
  const { data, doctorOf } = patient
  if (!data) return <LoadingNote />

  return (
    <div className="cabinet-grid">
      <Panel title={`Заключения врачей · ${data.conclusions.length}`}>
        {data.conclusions.length > 0
          ? <div className="stack">{data.conclusions.map((conclusion) => <ConclusionCard key={conclusion.id} conclusion={conclusion} doctor={doctorOf(conclusion.doctorId)} />)}</div>
          : <EmptyState>Заключения появятся здесь после приёма у врача.</EmptyState>}
      </Panel>
      <Panel title={`Анализы · ${data.labTests.length}`}>
        {data.labTests.length > 0
          ? <div className="stack">{data.labTests.map((test) => <LabTestCard key={test.id} test={test} doctor={doctorOf(test.doctorId)} />)}</div>
          : <EmptyState>Анализов пока нет.</EmptyState>}
      </Panel>
    </div>
  )
}
