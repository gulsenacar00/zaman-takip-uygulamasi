import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSelection } from '../context/SelectionContext.jsx'
import { useSessions } from '../context/SessionsContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { dayKey, formatDuration, groupByDay } from '../lib/time.js'
import Logo from './Logo.jsx'
import SessionProperties from './SessionProperties.jsx'
import Timer from './Timer.jsx'

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive
      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
      : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
  }`

const THEME_MODES = ['system', 'light', 'dark']
const THEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' }

/** E-postadan en fazla iki harflik baş harf üretir: "ali.veli@x.com" → "AV". */
function initialsOf(email) {
  const local = String(email ?? '').split('@')[0]
  const parts = local.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const raw = parts.length >= 2 ? parts[0][0] + parts[1][0] : local.slice(0, 2)
  return (raw || '?').toLocaleUpperCase('en-US')
}

/** Baş harf düğmesi; tıklanınca tema seçimi ve çıkış açılır. */
function UserMenu() {
  const { user, logout } = useAuth()
  const { mode, setMode } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={user?.email}
        aria-label={`Account: ${user?.email ?? ''}`}
        className="flex size-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold
          text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200
          dark:hover:bg-slate-700"
      >
        {initialsOf(user?.email)}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border
            border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="truncate border-b border-slate-100 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {user?.email}
          </div>

          <div className="px-3 py-2">
            <div className="mb-1.5 text-xs text-slate-500 dark:text-slate-400">Theme</div>
            <div className="flex gap-1">
              {THEME_MODES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                    mode === value
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {THEME_LABELS[value]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700
              hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="text-right">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}

export default function Layout() {
  const { sessions } = useSessions()
  const { selectedId } = useSelection()

  const todaySeconds =
    groupByDay(sessions).find((g) => g.key === dayKey(new Date().toISOString()))?.totalSeconds ?? 0
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)

  // Sağ sütun yalnızca bir kayıt seçiliyken açılır; aksi halde takvim tam genişlikte durur.
  const hasPanel = selectedId !== null

  return (
    // Büyük ekranda uygulama tam ekrana oturur ve sayfa kaydırılmaz; dar
    // ekranda başlık sarmalandığı için normal akışa dönülür.
    <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <header className="shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-2.5">
          <div>
            <div className="flex items-center gap-2">
              <Logo className="size-6 shrink-0" />
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Time Tracker
              </h1>
            </div>
            <nav className="mt-1.5 flex gap-1">
              <NavLink to="/" end className={linkClass}>
                Work Sessions
              </NavLink>
              <NavLink to="/notes" className={linkClass}>
                Notes
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <Stat label="Today" value={formatDuration(todaySeconds)} />
            <Stat
              label={`Total (${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'})`}
              value={formatDuration(totalSeconds)}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Sayaç sayfanın sağ üstünde sabit durur. */}
            <Timer />
            <UserMenu />
          </div>
        </div>
      </header>

      <main
        className={`mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-4 lg:min-h-0 ${
          hasPanel ? 'lg:grid-cols-[minmax(0,1fr)_16rem]' : 'lg:grid-cols-1'
        }`}
      >
        <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">
          <Outlet />
        </div>

        {hasPanel && (
          <aside className="lg:min-h-0 lg:overflow-y-auto">
            {/* Takvimde bir kayda tıklanınca özellikleri burada açılır. */}
            <SessionProperties />
          </aside>
        )}
      </main>
    </div>
  )
}
