import { useState } from 'react'
import { useSessions } from '../context/SessionsContext.jsx'
import { useSelection } from '../context/SelectionContext.jsx'
import { formatDuration, fromInputValue, toInputValue } from '../lib/time.js'

const fieldClass =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 ' +
  'outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ' +
  'dark:focus:border-slate-400'
const labelClass = 'block text-xs text-slate-500 dark:text-slate-400'

/**
 * Seçili kaydın özellikleri — sağ sütunda, takvimin yanında durur.
 * Seçim yoksa hiç çizilmez.
 */
export default function SessionProperties() {
  const { sessions, updateSession, deleteSession } = useSessions()
  const { selectedId, clear } = useSelection()

  const session = sessions.find((s) => s.id === selectedId) ?? null
  if (!session) return null

  return (
    <Editor
      // Başka bir bloğa geçilince alanlar yeni kayıttan tazelensin.
      key={session.id}
      session={session}
      onSave={updateSession}
      onDelete={deleteSession}
      onClose={clear}
    />
  )
}

function Editor({ session, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(session.title ?? '')
  const [start, setStart] = useState(() => toInputValue(session.start_time))
  const [end, setEnd] = useState(() => toInputValue(session.end_time))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const startIso = fromInputValue(start)
    const endIso = fromInputValue(end)
    if (!startIso || !endIso) return setError('Enter a valid date and time.')

    setBusy(true)
    try {
      await onSave(session.id, { title, start_time: startIso, end_time: endIso })
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Are you sure you want to delete this session?')) return
    setBusy(true)
    try {
      await onDelete(session.id)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Session</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="rounded px-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          ✕
        </button>
      </header>

      <div className="space-y-3 px-3 py-3">
        <label className={labelClass}>
          Task name
          <input
            type="text"
            value={title}
            maxLength={120}
            placeholder="Untitled work"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            className={fieldClass}
          />
        </label>

        <label className={labelClass}>
          Start
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className={labelClass}>
          End
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={fieldClass}
          />
        </label>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Duration{' '}
          <strong className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {formatDuration(session.duration_seconds)}
          </strong>
        </p>

        {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700
              disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Save
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-60
              dark:text-rose-400 dark:hover:bg-rose-950"
          >
            Delete
          </button>
        </div>
      </div>
    </section>
  )
}
