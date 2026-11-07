import { useCallback, useEffect, useState } from 'react'
import type { ThemeMode } from '../types'

const STORAGE_KEY = 'notion-like:theme'

function readMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* ignore */
  }
  return 'system'
}

export interface ThemeApi {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  cycle: () => void
}

export function useTheme(): ThemeApi {
  const [mode, setMode] = useState<ThemeMode>(readMode)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved: 'light' | 'dark' = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode, resolved])

  const cycle = useCallback(() => {
    setMode((previous) => {
      const isDark =
        previous === 'dark' ||
        (previous === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      return isDark ? 'light' : 'dark'
    })
  }, [])

  return { mode, resolved, setMode, cycle }
}
