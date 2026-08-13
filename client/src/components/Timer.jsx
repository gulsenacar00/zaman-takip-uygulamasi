import { useTimer } from '../hooks/useTimer.js'
import { formatClock, formatDuration, formatStopwatch } from '../lib/time.js'

export default function Timer() {
  const {
    running,
    startedAt,
    elapsedSeconds,
    saving,
    error,
    autoStopped,
    dismissAutoStopped,
    start,
    stop,
    discard,
  } = useTimer()

  const autoStoppedSeconds = autoStopped
    ? Math.round((Date.parse(autoStopped.end_time) - Date.parse(autoStopped.start_time)) / 1000)
    : 0

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

      {autoStopped && (
        <p className="max-w-xs text-right text-xs text-slate-500">
          Sekme kapandığı için sayaç {formatClock(autoStopped.end_time)}'de durduruldu,{' '}
          {formatDuration(autoStoppedSeconds)} kaydedildi.{' '}
          <button
            type="button"
            onClick={dismissAutoStopped}
            className="underline underline-offset-2 hover:text-slate-800"
          >
            tamam
          </button>
        </p>
      )}
    </div>
  )
}
