import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, tokenStore, AUTH_EXPIRED_EVENT } from '../api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sayfa açılışında elde token varsa kimin olduğunu sunucuya doğrulatırız.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  const authenticate = useCallback(async (path, email, password) => {
    const data = await api(path, { method: 'POST', body: { email, password } })
    tokenStore.set(data.token)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login: (email, password) => authenticate('/auth/login', email, password),
      register: (email, password) => authenticate('/auth/register', email, password),
      logout: () => {
        tokenStore.clear()
        setUser(null)
      },
    }),
    [user, loading, authenticate]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth can only be used inside AuthProvider.')
  return ctx
}
