import { AlertTriangle, ArrowDown, ArrowUp, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonStyles } from '../../components/ui'
import type { Appointment, Doctor, LabTest, MedicalConclusion, Service } from '../../types'
import { formatDate, formatPrice, formatTime, indicatorState, longDayFormat } from '../cabinet/format'

export function AppointmentTicket({ appointment, doctor, service }: { appointment: Appointment; doctor?: Doctor; service?: Service }) {
  const starts = new Date(appointment.startsAt)
  const serviceName = appointment.serviceName ?? service?.name ?? 'Услуга'
  const price = appointment.price ?? service?.price

  return (
    <article className="ticket" aria-label={`Талон ${appointment.ticketNumber ?? ''}`}>
      <div className="ticket__main">
        <p className="ticket__label">Дата</p>
        <p className="ticket__date">{longDayFormat.format(starts)}</p>
        <div className="ticket__grid">
          <div><p className="ticket__label">Время</p><p className="ticket__value">{formatTime(appointment.startsAt)}</p></div>
          <div><p className="ticket__label">Кабинет</p><p className="ticket__value">{doctor?.room ?? '—'}</p></div>
          <div className="ticket__wide"><p className="ticket__label">Специалист</p><p className="ticket__value">{doctor?.name ?? 'Специалист клиники'}</p><p className="ticket__hint">{doctor?.specialty ? `${doctor.specialty} · ` : ''}{serviceName}</p></div>
          <div><p className="ticket__label">Стоимость</p><p className="ticket__value">{price !== undefined ? formatPrice(price) : '—'}</p></div>
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

export function ConclusionCard({ conclusion, doctor, appointment, service }: { conclusion: MedicalConclusion; doctor?: Doctor; appointment?: Appointment; service?: Service }) {
  const bookingParams = new URLSearchParams({ doctor: conclusion.doctorId })
  const serviceId = appointment?.serviceId ?? service?.id
  if (serviceId) bookingParams.set('service', serviceId)

  return (
    <article className="conclusion">
      <div className="conclusion__meta">
        <FileText size={15} aria-hidden="true" />
        <span>{formatDate(appointment?.startsAt ?? conclusion.createdAt)}</span>
        <span>{appointment?.serviceName ?? service?.name ?? 'Услуга не указана'}</span>
        <span>{doctor?.name ?? 'Врач не указан'}</span>
        <span>каб. {doctor?.room ?? '—'}</span>
      </div>
      <p className="detail-block__label">Заключение</p>
      <h3>{conclusion.diagnosis}</h3>
      <p><strong>Назначения:</strong> {conclusion.recommendations || '—'}</p>
      <div className="row-actions conclusion__actions">
        <Link className={buttonStyles('secondary', 'button--compact')} to={`/patient/appointments/new?${bookingParams.toString()}`}>Записаться на повторный приём</Link>
      </div>
    </article>
  )
}

const labStatus: Record<LabTest['status'], string> = { ordered: 'Назначен', 'in-progress': 'В работе', ready: 'Готов' }

export function hasDeviations(test: LabTest): boolean {
  return Boolean(test.indicators?.some((indicator) => indicatorState(indicator) !== 'normal'))
}

export function LabTestCard({ test, doctor, onlyDeviations = false }: { test: LabTest; doctor?: Doctor; onlyDeviations?: boolean }) {
  const indicators = (test.indicators ?? []).filter((indicator) => !onlyDeviations || indicatorState(indicator) !== 'normal')
  const deviates = hasDeviations(test)

  return (
    <article className="lab">
      <div className="lab__head">
        <h3>{test.name}</h3>
        <span className={`lab__status lab__status--${test.status}`}>{labStatus[test.status]}</span>
      </div>
      <p className="lab__meta">
        {test.status === 'ordered' ? `Назначен ${formatDate(test.orderedAt)}` : test.status === 'in-progress' ? `В работе с ${formatDate(test.orderedAt)}` : `Результат от ${formatDate(test.resultAt ?? test.orderedAt)}`}
        {doctor && <> · Назначил: {doctor.name}</>}
      </p>
      {test.status === 'ordered' && <p className="lab__instruction">Сдайте анализ в лаборатории клиники до следующего приёма. Время забора и подготовку уточните у администратора.</p>}
      {test.status === 'in-progress' && <p className="lab__result lab__result--pending">Анализ выполняется. Результат появится в кабинете после готовности.</p>}
      {test.result && <p className="lab__result"><strong>Итог:</strong> {test.result}</p>}
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
      ) : test.status === 'ready' && !test.result ? (
        <p className="lab__result">Анализ готов. Обратитесь к врачу, назначившему исследование, чтобы получить и обсудить результат.</p>
      ) : null}
      {!onlyDeviations && deviates && <p className="lab__warning"><AlertTriangle size={14} aria-hidden="true" />Есть значения вне нормы — обсудите их с врачом.</p>}
      {deviates && doctor && <div className="row-actions lab__actions"><Link className={buttonStyles('secondary', 'button--compact')} to={`/patient/appointments/new?doctor=${encodeURIComponent(doctor.id)}`}>Записаться к врачу, назначившему анализ</Link></div>}
    </article>
  )
}
