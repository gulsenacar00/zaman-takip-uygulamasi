import { useState } from 'react'
import { useSessions } from '../context/SessionsContext.jsx'
import {
  dayKey,
  formatClock,
  formatDayLabel,
  formatDuration,
  fromInputValue,
  groupByDay,
  toInputValue,
} from '../lib/time.js'

function SessionRow({ session, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [start, setStart] = useState(() => toInputValue(session.start_time))
  const [end, setEnd] = useState(() => toInputValue(session.end_time))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function openEditor() {
    setStart(toInputValue(session.start_time))
    setEnd(toInputValue(session.end_time))
    setError('')
    setEditing(true)
  }

  async function save() {
    const startIso = fromInputValue(start)
    const endIso = fromInputValue(end)
    if (!startIso || !endIso) return setError('Geçerli tarih/saat girin.')

    setBusy(true)
    try {
      await onUpdate(session.id, { start_time: startIso, end_time: endIso })
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    setBusy(true)
    try {
      await onDelete(session.id)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <li className="px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-500">
            Başlangıç
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
          <label className="text-xs text-slate-500">
            Bitiş
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            Kaydet
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
            Vazgeç
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
      </li>
    )
  }

  return (
    <li className="group flex items-center justify-between gap-4 px-4 py-3">
      <span className="font-mono text-sm text-slate-700">
        {formatClock(session.start_time)} – {formatClock(session.end_time)}
      </span>

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums">
          {formatDuration(session.duration_seconds)}
        </span>
        <div className="flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={openEditor}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            Düzenle
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
          >
            Sil
          </button>
        </div>
      </div>
    </li>
  )
}

export default function SessionsPage() {
  const { sessions, loading, error, updateSession, deleteSession } = useSessions()
  const groups = groupByDay(sessions)

  const todayKey = dayKey(new Date().toISOString())
  const todaySeconds = groups.find((g) => g.key === todayKey)?.totalSeconds ?? 0
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>
  if (error) return <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Bugün</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{formatDuration(todaySeconds)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Toplam ({sessions.length} oturum)</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{formatDuration(totalSeconds)}</div>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Henüz kayıt yok. Sağ üstteki <strong>Başlat</strong> düğmesiyle ilk oturumunuzu başlatın.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-slate-800">{formatDayLabel(group.key)}</h2>
              <span className="text-sm font-semibold tabular-nums text-slate-600">
                {formatDuration(group.totalSeconds)}
              </span>
            </header>
            <ul className="divide-y divide-slate-100">
              {group.sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onDelete={deleteSession}
                  onUpdate={updateSession}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
