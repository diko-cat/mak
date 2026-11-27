import { SEEN_KEY_PREFIX } from '../api/database'

/**
 * Пометки «просмотрено» для значков «новое» в кабинете пациента.
 * Это состояние интерфейса, а не данные клиники; сбрасывается вместе с демо-данными.
 */
const keyFor = (patientId: string, category: string) => `${SEEN_KEY_PREFIX}${patientId}.${category}`
const legacyKeyFor = (patientId: string, category: string) => `patient:${patientId}:seen:${category}`

function parseIds(raw: string | null): string[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function readSeenIds(patientId: string, category: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const current = window.localStorage.getItem(keyFor(patientId, category))
    // Пометки, сохранённые до переноса в слой хранения, читаем из старого ключа.
    return new Set(parseIds(current ?? window.localStorage.getItem(legacyKeyFor(patientId, category))))
  } catch {
    return new Set()
  }
}

export function markSeenIds(patientId: string, category: string, ids: string[]): void {
  if (typeof window === 'undefined' || ids.length === 0) return
  try {
    const seen = readSeenIds(patientId, category)
    ids.forEach((id) => seen.add(id))
    window.localStorage.setItem(keyFor(patientId, category), JSON.stringify([...seen]))
    window.localStorage.removeItem(legacyKeyFor(patientId, category))
  } catch {
    // Кабинет остаётся рабочим, даже если хранилище браузера недоступно.
  }
}
