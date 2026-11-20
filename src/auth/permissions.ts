import type { Permission, Role, User } from '../types'

/** Права каждого типа пользователя. Единый источник правды для API и интерфейса. */
export const rolePermissions: Record<Role, readonly Permission[]> = {
  patient: [
    'appointments:book',
    'appointments:view-own',
    'appointments:cancel-own',
    'results:view-own',
  ],
  doctor: [
    'appointments:view-own',
    'appointments:complete',
    'patients:view-own',
  ],
  admin: [
    'appointments:view-all',
    'appointments:confirm',
    'appointments:reschedule',
    'appointments:cancel-any',
    'patients:view-all',
    'doctors:manage',
    'services:manage',
    'schedule:manage',
    'calls:manage',
  ],
}

export const permissionLabels: Record<Permission, string> = {
  'appointments:book': 'Записываться на приём',
  'appointments:view-own': 'Видеть свои записи',
  'appointments:cancel-own': 'Отменять свою запись',
  'appointments:view-all': 'Видеть все записи клиники',
  'appointments:confirm': 'Подтверждать записи',
  'appointments:reschedule': 'Переносить приёмы',
  'appointments:cancel-any': 'Отменять любые приёмы',
  'appointments:complete': 'Завершать приём с заключением',
  'results:view-own': 'Видеть свои заключения и анализы',
  'patients:view-own': 'Видеть карты своих пациентов',
  'patients:view-all': 'Видеть всех пациентов',
  'doctors:manage': 'Управлять врачами',
  'services:manage': 'Управлять услугами и ценами',
  'schedule:manage': 'Управлять рабочими часами и расписанием',
  'calls:manage': 'Обрабатывать заявки на звонок',
}

export const roleLabels: Record<Role, string> = {
  patient: 'Пациент',
  doctor: 'Врач',
  admin: 'Администратор',
}

export function hasPermission(user: Pick<User, 'role'> | null | undefined, permission: Permission): boolean {
  return Boolean(user && rolePermissions[user.role].includes(permission))
}
