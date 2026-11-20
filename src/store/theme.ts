import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
const THEME_KEY = 'sana-clinic.theme.v1'

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

let currentTheme = readTheme()
const listeners = new Set<() => void>()

function applyTheme(theme: Theme): void {
<<<<<<< HEAD
  if (typeof document !== 'undefined') document.documentElement.dataset.theme = theme
=======
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
>>>>>>> faa8dcf98c9e6f80c9c31b60de74d202dca5f587
}

function emitChange(): void {
  for (const listener of listeners) listener()
}

applyTheme(currentTheme)

export function setTheme(theme: Theme): void {
  currentTheme = theme
  window.localStorage.setItem(THEME_KEY, theme)
  applyTheme(theme)
  emitChange()
}

export function toggleTheme(): void {
  setTheme(currentTheme === 'light' ? 'dark' : 'light')
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Theme {
  return currentTheme
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'light')
}
