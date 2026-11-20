import { useSyncExternalStore } from 'react'
import type { User } from '../types'

const SESSION_KEY = 'sana-clinic.session.v1'

function readSession(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    return null
  }
}

let currentSession = readSession()
const listeners = new Set<() => void>()

function emitChange(): void {
  for (const listener of listeners) listener()
}

export function setSession(user: User): void {
  currentSession = user
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  emitChange()
}

export function clearSession(): void {
  currentSession = null
  window.localStorage.removeItem(SESSION_KEY)
  emitChange()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): User | null {
  return currentSession
}

export function useSession(): User | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

export function getSession(): User | null {
  return currentSession
}
