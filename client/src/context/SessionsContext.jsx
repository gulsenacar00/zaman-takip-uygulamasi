import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from './AuthContext.jsx'

const SessionsContext = createContext(null)

export function SessionsProvider({ children }) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!user) {
      setSessions([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await api('/sessions')
      setSessions(data.sessions)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    reload()
  }, [reload])

  const sortDesc = (list) => [...list].sort((a, b) => b.start_time.localeCompare(a.start_time))

  const createSession = useCallback(async (startIso, endIso) => {
    const data = await api('/sessions', {
      method: 'POST',
      body: { start_time: startIso, end_time: endIso },
    })
    setSessions((prev) => sortDesc([...prev, data.session]))
    return data.session
  }, [])

  const updateSession = useCallback(async (id, patch) => {
    const data = await api(`/sessions/${id}`, { method: 'PATCH', body: patch })
    setSessions((prev) => sortDesc(prev.map((s) => (s.id === id ? data.session : s))))
    return data.session
  }, [])

  const deleteSession = useCallback(async (id) => {
    await api(`/sessions/${id}`, { method: 'DELETE' })
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const value = useMemo(
    () => ({ sessions, loading, error, reload, createSession, updateSession, deleteSession }),
    [sessions, loading, error, reload, createSession, updateSession, deleteSession]
  )

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>
}

export function useSessions() {
  const ctx = useContext(SessionsContext)
  if (!ctx) throw new Error('useSessions yalnızca SessionsProvider içinde kullanılabilir.')
  return ctx
}
