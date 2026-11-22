import { useEffect, useRef, useState } from 'react'

function readSeenIds(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function markSeen(key: string, ids: string[]): void {
  if (typeof window === 'undefined' || ids.length === 0) return
  try {
    const seen = readSeenIds(key)
    ids.forEach((id) => seen.add(id))
    window.localStorage.setItem(key, JSON.stringify([...seen]))
  } catch {
    // Keep the cabinet usable when browser storage is unavailable.
  }
}

/** Keeps "new" indicators visible until the patient leaves the section once. */
export function useUnseenIds(patientId: string | undefined, category: string, ids: string[]): string[] {
  const storageKey = `patient:${patientId ?? 'unknown'}:seen:${category}`
  const [seenIds] = useState(() => readSeenIds(storageKey))
  const unseenIds = ids.filter((id) => !seenIds.has(id))
  const pendingIds = useRef<string[]>(unseenIds)
  pendingIds.current = unseenIds

  useEffect(() => () => markSeen(storageKey, pendingIds.current), [storageKey])

  return unseenIds
}
