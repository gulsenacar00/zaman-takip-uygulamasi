import { useMemo, useState } from 'react'
import { useSelection } from '../context/SelectionContext.jsx'
import {
  addDays,
  formatClock,
  formatDuration,
  formatWeekRange,
  formatWeekdayShort,
  isSameDay,
  minutesSinceMidnight,
  startOfWeek,
} from '../lib/time.js'

const DEFAULT_FROM = 8 // kayıt yoksa gösterilecek saat aralığı
const DEFAULT_TO = 18

const pad = (n) => String(n).padStart(2, '0')

/**
 * Aynı güne düşen ve zamanı çakışan oturumları yan yana yerleştirir:
 * her oturum, kendisinden önce biten bir şeridi yeniden kullanır.
 */
function layoutDay(items) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  const laneEnds = []

  const placed = sorted.map((item) => {
    let lane = laneEnds.findIndex((end) => end <= item.startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.endMin)
    } else {
      laneEnds[lane] = item.endMin
    }
    return { ...item, lane }
  })

  return { placed, laneCount: Math.max(1, laneEnds.length) }
}

/**
 * Haftalık takvim. Bloklar piksel değil **yüzde** ile konumlanır: ızgara
 * kendisine ayrılan yüksekliğe sığar, saat aralığı genişlese bile sayfa
 * kaydırma gerektirmez.
 */
export default function WeekCalendar({ sessions }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const { selectedId, select } = useSelection()

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])

  const { byDay, fromHour, toHour, weekSeconds } = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => [])
    let seconds = 0
    let min = DEFAULT_FROM
    let max = DEFAULT_TO

    for (const session of sessions) {
      const startDate = new Date(session.start_time)
      if (startDate < weekStart || startDate >= weekEnd) continue

      const dayIndex = Math.floor((startDate - weekStart) / 86_400_000)
      if (dayIndex < 0 || dayIndex > 6) continue

      const startMin = minutesSinceMidnight(session.start_time)
      // Gece yarısını aşan oturum, başladığı günün sonunda kesilerek gösterilir.
      const endMin = Math.min(1440, startMin + session.duration_seconds / 60)

      buckets[dayIndex].push({ session, startMin, endMin })
      seconds += session.duration_seconds
      min = Math.min(min, Math.floor(startMin / 60))
      max = Math.max(max, Math.ceil(endMin / 60))
    }

    return {
      byDay: buckets.map(layoutDay),
      fromHour: Math.max(0, min),
      toHour: Math.min(24, Math.max(max, min + 1)),
      weekSeconds: seconds,
    }
  }, [sessions, weekStart, weekEnd])

  const hours = Array.from({ length: toHour - fromHour }, (_, i) => fromHour + i)
  const rangeStart = fromHour * 60
  const rangeMinutes = (toHour - fromHour) * 60
  const percent = (minutes) => ((minutes - rangeStart) / rangeMinutes) * 100

  const today = new Date()
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today))
  const columns = 'grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))]'

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Previous week"
            className="rounded-lg px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-200
              dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            disabled={isCurrentWeek}
            className="rounded-lg px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200
              disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Next week"
            className="rounded-lg px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-200
              dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ›
          </button>
          <h2 className="ml-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {formatWeekRange(weekStart)}
          </h2>
        </div>

        <span className="text-sm text-slate-500 dark:text-slate-400">
          Week total{' '}
          <strong className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {formatDuration(weekSeconds)}
          </strong>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Gün başlıkları */}
        <div className={`${columns} shrink-0 border-b border-slate-200 dark:border-slate-800`}>
          <div />
          {days.map((day) => {
            const current = isSameDay(day, today)
            return (
              <div
                key={day.toISOString()}
                className={`px-1 py-1.5 text-center ${current ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {formatWeekdayShort(day)}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    current
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Saat ızgarası — kalan yüksekliği kaplar */}
        <div className={`${columns} min-h-0 flex-1`}>
          <div className="relative">
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-slate-400 dark:text-slate-500"
                style={{ top: `${percent(hour * 60)}%` }}
              >
                {pad(hour)}
              </span>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const { placed, laneCount } = byDay[dayIndex]
            const current = isSameDay(day, today)

            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-slate-100 dark:border-slate-800 ${
                  current ? 'bg-slate-50/60 dark:bg-slate-800/30' : ''
                }`}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800"
                    style={{ top: `${percent(hour * 60)}%` }}
                  />
                ))}

                {placed.map(({ session, startMin, endMin, lane }) => {
                  const width = 100 / laneCount
                  const isSelected = session.id === selectedId

                  return (
                    <button
                      type="button"
                      key={session.id}
                      onClick={() => select(session.id)}
                      title={`${session.title || 'Untitled work'} — ${formatClock(
                        session.start_time
                      )}–${formatClock(session.end_time)} (${formatDuration(
                        session.duration_seconds
                      )})`}
                      className={`absolute overflow-hidden rounded border px-1 py-0.5 text-left text-[10px] leading-tight transition
                        ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-100 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-900/70 dark:text-emerald-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400 dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-100 dark:hover:border-emerald-600'
                        }`}
                      style={{
                        top: `${percent(startMin)}%`,
                        height: `${((endMin - startMin) / rangeMinutes) * 100}%`,
                        minHeight: '14px',
                        left: `calc(${lane * width}% + 1px)`,
                        width: `calc(${width}% - 2px)`,
                      }}
                    >
                      <span className="block truncate font-medium">
                        {session.title || 'Untitled work'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {weekSeconds === 0 && (
        <p className="shrink-0 text-center text-xs text-slate-500 dark:text-slate-400">
          No sessions this week. Use the <strong>Start</strong> button in the top right to begin
          one.
        </p>
      )}
    </div>
  )
}
