import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { EmptyState, LoadingNote, Panel } from '../cabinet/CabinetLayout'
import { ageFrom, formatDate, formatDateTime, isScheduled, pluralYears } from '../cabinet/format'
import type { useDoctorData } from './useDoctorData'

export function DoctorPatients({ doctor }: { doctor: ReturnType<typeof useDoctorData> }) {
  const { data } = doctor
  const [openId, setOpenId] = useState('')

  if (!data) return <LoadingNote />

  const now = Date.now()
  const rows = data.patients.map((patient) => {
    const appointments = data.appointments.filter((item) => item.patientId === patient.id)
    const visits = appointments.filter((item) => item.status === 'completed').length
    const next = appointments.find((item) => isScheduled(item) && new Date(item.startsAt).getTime() > now)
    const conclusions = data.conclusions.filter((item) => item.patientId === patient.id)
    return { patient, visits, next, conclusions }
  }).sort((left, right) => (left.next?.startsAt ?? '9').localeCompare(right.next?.startsAt ?? '9'))

  return (
    <Panel title={`Мои пациенты · ${rows.length}`}>
      {rows.length === 0 ? <EmptyState>У вас пока нет пациентов.</EmptyState> : (
        <ul className="patient-list">
          {rows.map(({ patient, visits, next, conclusions }) => {
            const open = openId === patient.id
            return (
              <li key={patient.id} className={`patient-row ${open ? 'patient-row--open' : ''}`}>
                <button type="button" className="patient-row__head" aria-expanded={open} aria-controls={`history-${patient.id}`} onClick={() => setOpenId(open ? '' : patient.id)}>
                  <span className="patient-row__name"><strong>{patient.name}</strong><small>{pluralYears(ageFrom(patient.birthDate))} · карта {patient.cardNumber ?? '—'}</small></span>
                  <span className="patient-row__stat"><small>Визитов</small><strong>{visits}</strong></span>
                  <span className="patient-row__stat patient-row__stat--wide"><small>Ближайший визит</small><strong>{next ? formatDateTime(next.startsAt) : 'не запланирован'}</strong></span>
                  <ChevronDown className="patient-row__chevron" size={18} aria-hidden="true" />
                </button>
                {open && (
                  <div id={`history-${patient.id}`} className="patient-row__history">
                    <p className="detail-block__label">История заключений</p>
                    {conclusions.length === 0 ? <p className="muted">Заключений пока нет.</p> : (
                      <ul className="history">
                        {conclusions.map((item) => (
                          <li key={item.id}><span className="muted">{formatDate(item.createdAt)}</span><strong>{item.diagnosis}</strong>{item.recommendations && <span>Назначения: {item.recommendations}</span>}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
