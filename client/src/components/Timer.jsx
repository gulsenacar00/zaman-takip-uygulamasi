import { useTimer } from '../hooks/useTimer.js'
import { formatClock, formatStopwatch } from '../lib/time.js'

export default function Timer() {
  const { running, startedAt, elapsedSeconds, saving, error, start, stop, discard } = useTimer()

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <div
            className={`font-mono text-2xl tabular-nums ${running ? 'text-emerald-600' : 'text-slate-400'}`}
          >
            {formatStopwatch(elapsedSeconds)}
          </div>
          <div className="text-xs text-slate-500">
            {running ? `${formatClock(startedAt)}'de başladı` : 'Sayaç durdu'}
          </div>
        </div>

        <button
          type="button"
          onClick={running ? stop : start}
          disabled={saving}
          className={`min-w-[104px] rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition
            disabled:cursor-not-allowed disabled:opacity-60
            ${running ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          {saving ? 'Kaydediliyor…' : running ? 'Bitir' : 'Başlat'}
        </button>
      </div>

      {running && (
        <button
          type="button"
          onClick={discard}
          className="text-xs text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
        >
          kaydetmeden vazgeç
        </button>
      )}

      {error && <p className="max-w-xs text-right text-xs text-rose-600">{error}</p>}
    </div>
  )
}
