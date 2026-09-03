import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'zt:theme'
const MODES = ['system', 'light', 'dark']

const prefersDark = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

function readStoredMode() {
  const stored = localStorage.getItem(STORAGE_KEY)
  return MODES.includes(stored) ? stored : 'system'
}

/**
 * Tema üç durumludur: `system` (işletim sisteminin tercihi), `light`, `dark`.
 * Seçim localStorage'da saklanır; `system` seçiliyken tercih değiştiğinde
 * uygulama canlı olarak buna uyar.
 */
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode)
  const [systemDark, setSystemDark] = useState(prefersDark)

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const media = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const dark = mode === 'dark' || (mode === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Aynı hesabın açık diğer sekmeleri de tercihi izlesin.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setMode(readStoredMode())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const applyMode = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next)
    setMode(next)
  }, [])

  /** Düğmeye her basışta açık → koyu → sistem sırasını izler. */
  const cycle = useCallback(() => {
    applyMode(MODES[(MODES.indexOf(readStoredMode()) + 1) % MODES.length])
  }, [applyMode])

  const value = useMemo(
    () => ({ mode, dark, setMode: applyMode, cycle }),
    [mode, dark, applyMode, cycle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme can only be used inside ThemeProvider.')
  return ctx
}
