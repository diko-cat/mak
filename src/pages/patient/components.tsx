import { AlertTriangle, ArrowDown, ArrowUp, FileText, FlaskConical } from 'lucide-react'
import type { Appointment, Doctor, LabTest, MedicalConclusion, Service } from '../../types'
import { formatDate, formatTime, indicatorState, longDayFormat } from '../cabinet/format'

export function AppointmentTicket({ appointment, doctor, service }: { appointment: Appointment; doctor?: Doctor; service?: Service }) {
  const starts = new Date(appointment.startsAt)
  return (
    <article className="ticket" aria-label={`Талон ${appointment.ticketNumber ?? ''}`}>
      <div className="ticket__main">
        <p className="ticket__label">Дата</p>
        <p className="ticket__date">{longDayFormat.format(starts)}</p>
        <div className="ticket__grid">
          <div><p className="ticket__label">Время</p><p className="ticket__value">{formatTime(appointment.startsAt)}</p></div>
          <div><p className="ticket__label">Кабинет</p><p className="ticket__value">{doctor?.room ?? '—'}</p></div>
          <div className="ticket__wide"><p className="ticket__label">Специалист</p><p className="ticket__value">{doctor?.name ?? 'Специалист клиники'}</p><p className="ticket__hint">{doctor?.specialty}{service ? ` · ${service.name}` : ''}</p></div>
        </div>
      </div>
      <div className="ticket__stub">
        <p className="ticket__label">Талон</p>
        <p className="ticket__number">{appointment.ticketNumber ?? '—'}</p>
        <p className="ticket__hint">Покажите на ресепшене</p>
      </div>
    </article>
  )
}

export function ConclusionCard({ conclusion, doctor }: { conclusion: MedicalConclusion; doctor?: Doctor }) {
  return (
    <article className="conclusion">
      <div className="conclusion__meta"><FileText size={15} aria-hidden="true" /><span>{formatDate(conclusion.createdAt)}</span>{doctor && <span>· {doctor.name}, {doctor.specialty.toLowerCase()}</span>}</div>
      <h3>{conclusion.diagnosis}</h3>
      {conclusion.recommendations && <p><strong>Назначения:</strong> {conclusion.recommendations}</p>}
    </article>
  )
}

const labStatus: Record<LabTest['status'], string> = { ordered: 'Назначен', 'in-progress': 'В лаборатории', ready: 'Готов' }

/** Что сейчас происходит с анализом, пока результата нет. */
const labPending: Record<LabTest['status'], string> = {
  ordered: 'Врач назначил этот анализ. Сдайте его в процедурном кабинете — результат появится здесь.',
  'in-progress': 'Анализ сдан и сейчас в лаборатории. Результат появится здесь, как только будет готов.',
  ready: 'Результат готов, подробности уточните у врача.',
}

export function hasDeviations(test: LabTest): boolean {
  return Boolean(test.indicators?.some((indicator) => indicatorState(indicator) !== 'normal'))
}

export function LabTestCard({ test, doctor, onlyDeviations = false }: { test: LabTest; doctor?: Doctor; onlyDeviations?: boolean }) {
  const indicators = (test.indicators ?? []).filter((indicator) => !onlyDeviations || indicatorState(indicator) !== 'normal')
  return (
    <article className="lab">
      <div className="conclusion__meta"><FlaskConical size={15} aria-hidden="true" /><span>Анализ</span>{doctor && <span>· назначил {doctor.name}, {doctor.specialty.toLowerCase()}</span>}</div>
      <div className="lab__head">
        <h3>{test.name}</h3>
        <span className={`lab__status lab__status--${test.status}`}>{labStatus[test.status]}</span>
      </div>
      <p className="lab__meta">{test.resultAt ? `Результат от ${formatDate(test.resultAt)}` : `Назначен ${formatDate(test.orderedAt)}`}</p>
      {indicators.length > 0 ? (
        <table className="lab__table">
          <thead><tr><th scope="col">Показатель</th><th scope="col">Значение</th><th scope="col">Норма</th></tr></thead>
          <tbody>
            {indicators.map((indicator) => {
              const state = indicatorState(indicator)
              return (
                <tr key={indicator.name} className={state !== 'normal' ? 'lab__row--out' : ''}>
                  <td>{indicator.name}</td>
                  <td>
                    <span className="lab__value">
                      {indicator.value} {indicator.unit}
                      {state === 'high' && <span className="lab__flag"><ArrowUp size={12} aria-hidden="true" />выше нормы</span>}
                      {state === 'low' && <span className="lab__flag"><ArrowDown size={12} aria-hidden="true" />ниже нормы</span>}
                    </span>
                  </td>
                  <td className="lab__range">{indicator.min}–{indicator.max}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : test.result ? <p className="lab__result">{test.result}</p> : <p className="lab__result lab__result--pending">{labPending[test.status]}</p>}
      {!onlyDeviations && hasDeviations(test) && <p className="lab__warning"><AlertTriangle size={14} aria-hidden="true" />Есть значения вне нормы — обсудите их с врачом.</p>}
    </article>
  )
}
