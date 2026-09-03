import { useEffect, useRef, useState } from 'react'
import { useTimer } from '../hooks/useTimer.js'
import { formatClock, formatStopwatch } from '../lib/time.js'

const BASE_TITLE = 'Time Tracker'

/**
 * "Başlat"ın hemen altında açılan küçük kutu. Ad zorunlu değildir.
 *
 * Konumlandırma `absolute`: üst barda `backdrop-blur` var ve bu, `position:
 * fixed` alt öğeler için kapsayıcı blok oluşturduğundan sabit konumlu bir
 * kutu ekrana değil üst barın kutusuna göre yerleşip kırpılıyor.
 */
function StartPopover({ onStart, onCancel }) {
  const [value, setValue] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onCancel()
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onCancel()
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [onCancel])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3
        text-left shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      <label className="block text-xs text-slate-500 dark:text-slate-400">
        Task name (optional)
        <input
          type="text"
          value={value}
          autoFocus
          maxLength={120}
          placeholder="What will you work on?"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onStart(value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900
            outline-none placeholder:text-slate-400 focus:border-slate-900 dark:border-slate-600
            dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400"
        />
      </label>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => onStart(value)}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white
            transition hover:bg-emerald-700"
        >
          Start
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100
            dark:text-slate-400 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Timer() {
  const { running, startedAt, elapsedSeconds, title, saving, error, start, stop, discard } = useTimer()
  const [asking, setAsking] = useState(false)

  // Sekme başlığında canlı sayaç: uygulama arka plandayken de süre görünür.
  useEffect(() => {
    document.title = running
      ? `${formatStopwatch(elapsedSeconds)} · ${title || BASE_TITLE}`
      : BASE_TITLE
  }, [running, elapsedSeconds, title])

  useEffect(() => () => {
    document.title = BASE_TITLE
  }, [])

  function beginSession(name) {
    start(name)
    setAsking(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <div className="max-w-[14rem] text-right leading-tight">
          <div
            className={`font-mono text-2xl tabular-nums ${
              running ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'
            }`}
          >
            {formatStopwatch(elapsedSeconds)}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {running
              ? `${title || 'Untitled work'} · started at ${formatClock(startedAt)}`
              : 'Timer stopped'}
          </div>
        </div>

        {/* Açılır kutu bu sarmalayıcıya göre konumlanır. */}
        <div className="relative">
          <button
            type="button"
            onClick={running ? stop : () => setAsking((open) => !open)}
            disabled={saving}
            aria-expanded={running ? undefined : asking}
            className={`min-w-[104px] rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition
              disabled:cursor-not-allowed disabled:opacity-60
              ${running ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {saving ? 'Saving…' : running ? 'Stop' : 'Start'}
          </button>

          {asking && !running && (
            <StartPopover onStart={beginSession} onCancel={() => setAsking(false)} />
          )}
        </div>
      </div>

      {running && (
        <button
          type="button"
          onClick={discard}
          disabled={saving}
          className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline
            disabled:opacity-60 dark:hover:text-slate-300"
        >
          discard without saving
        </button>
      )}

      {error && <p className="max-w-xs text-right text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  )
}
