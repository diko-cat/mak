import { useSyncExternalStore } from 'react'
import { getDatabaseRevision, subscribeDatabase } from '../api/database'

/**
 * Номер версии демо-данных. Растёт после любого изменения через `src/api`:
 * в этой вкладке и в других вкладках того же браузера (событие `storage`).
 *
 * Хуки загрузки экранов добавляют его в зависимости, чтобы перечитать данные:
 * `const revision = useDemoDataRevision(); useEffect(() => { void reload() }, [reload, revision])`
 */
export function useDemoDataRevision(): number {
  return useSyncExternalStore(subscribeDatabase, getDatabaseRevision, () => 0)
}
