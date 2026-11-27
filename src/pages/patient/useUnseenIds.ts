import { useEffect, useRef, useState } from 'react'
import { markSeenIds, readSeenIds } from '../../store/seenIds'

/** Keeps "new" indicators visible until the patient leaves the section once. */
export function useUnseenIds(patientId: string | undefined, category: string, ids: string[]): string[] {
  const owner = patientId ?? 'unknown'
  const [seenIds] = useState(() => readSeenIds(owner, category))
  const unseenIds = ids.filter((id) => !seenIds.has(id))
  const pendingIds = useRef<string[]>(unseenIds)
  pendingIds.current = unseenIds

  useEffect(() => () => markSeenIds(owner, category, pendingIds.current), [owner, category])

  return unseenIds
}
