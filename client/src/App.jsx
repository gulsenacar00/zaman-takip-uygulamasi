import { Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/Layout.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { SelectionProvider } from './context/SelectionContext.jsx'
import { SessionsProvider } from './context/SessionsContext.jsx'
import Login from './pages/Login.jsx'
import NotesPage from './pages/NotesPage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <SessionsProvider>
      <SelectionProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<SessionsPage />} />
            <Route path="notes" element={<NotesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </SelectionProvider>
    </SessionsProvider>
  )
}
