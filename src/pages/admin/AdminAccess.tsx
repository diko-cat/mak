import { useState } from 'react'
import { Check, Minus, RotateCcw } from 'lucide-react'
import { resetDemoData } from '../../api'
import { Button } from '../../components/ui'
import { permissionLabels, roleLabels, rolePermissions } from '../../auth/permissions'
import type { Permission, Role } from '../../types'
import { Panel } from '../cabinet/CabinetLayout'

const roles: Role[] = ['patient', 'doctor', 'admin']
const permissions = Object.keys(permissionLabels) as Permission[]

/** Матрица прав: что может каждый тип пользователя. Те же правила проверяет API. */
export function AdminAccess({ onReset }: { onReset: () => Promise<void> }) {
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function reset() {
    if (!window.confirm('Вернуть демо-данные к исходному состоянию? Текущая сессия останется активной.')) return
    setResetting(true)
    setMessage('')
    setError('')
    try {
      await resetDemoData()
      await onReset()
      setMessage('Демо-данные обновлены. Вы остались в аккаунте.')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Не удалось сбросить демо-данные.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="stack">
    <Panel title="Права доступа по ролям">
      <p className="muted small admin-access__lead">Права проверяются на уровне API: даже если открыть чужой раздел по ссылке, действие будет отклонено.</p>
      <table className="access-table">
        <thead>
          <tr>
            <th scope="col">Действие</th>
            {roles.map((role) => <th key={role} scope="col">{roleLabels[role]}</th>)}
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission}>
              <th scope="row">{permissionLabels[permission]}</th>
              {roles.map((role) => {
                const allowed = rolePermissions[role].includes(permission)
                return (
                  <td key={role} data-allowed={allowed}>
                    {allowed ? <Check size={16} aria-label="Разрешено" /> : <Minus size={16} aria-label="Запрещено" />}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
    <Panel title="Демо-данные">
      <p className="muted small">Если демонстрационные записи устарели или были изменены, восстановите исходный набор.</p>
      <Button type="button" variant="secondary" onClick={reset} disabled={resetting}><RotateCcw size={15} aria-hidden="true" />{resetting ? 'Сбрасываем…' : 'Сбросить демо-данные'}</Button>
      {message && <p className="form-message form-message--success" role="status">{message}</p>}
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
    </Panel>
    </div>
  )
}
