import { Check, Minus } from 'lucide-react'
import { permissionLabels, roleLabels, rolePermissions } from '../../auth/permissions'
import type { Permission, Role } from '../../types'
import { Panel } from '../cabinet/CabinetLayout'

const roles: Role[] = ['patient', 'doctor', 'admin']
const permissions = Object.keys(permissionLabels) as Permission[]

/** Матрица прав: что может каждый тип пользователя. Те же правила проверяет API. */
export function AdminAccess() {
  return (
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
  )
}
