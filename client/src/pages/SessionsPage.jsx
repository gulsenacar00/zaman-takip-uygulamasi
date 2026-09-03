import WeekCalendar from '../components/WeekCalendar.jsx'
import { useSessions } from '../context/SessionsContext.jsx'

export default function SessionsPage() {
  const { sessions, loading, error } = useSessions()

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
  if (error) {
    return (
      <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
        {error}
      </p>
    )
  }

  // Dar ekranda sabit bir yükseklik, geniş ekranda kalan alanın tamamı.
  return (
    <div className="h-[65vh] lg:h-full">
      <WeekCalendar sessions={sessions} />
    </div>
  )
}
