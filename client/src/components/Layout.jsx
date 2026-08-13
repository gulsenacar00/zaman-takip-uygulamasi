import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Timer from './Timer.jsx'

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
  }`

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Zaman Takip</h1>
            <nav className="mt-2 flex gap-1">
              <NavLink to="/" end className={linkClass}>
                Çalışma Kayıtları
              </NavLink>
              <NavLink to="/notlar" className={linkClass}>
                Notlar
              </NavLink>
            </nav>
          </div>

          {/* Sayaç şartname gereği sayfanın sağ üstünde sabit durur. */}
          <Timer />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="mx-auto flex max-w-4xl items-center justify-between px-4 pb-8 text-xs text-slate-500">
        <span>{user?.email}</span>
        <button type="button" onClick={logout} className="underline underline-offset-2 hover:text-slate-800">
          Çıkış yap
        </button>
      </footer>
    </div>
  )
}
