const pad = (n) => String(n).padStart(2, '0')

const LOCALE = 'en-GB'

/** Canlı sayaç görünümü: 01:23:45 */
export function formatStopwatch(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** Liste görünümü: "8h 00m" */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  return hours > 0 ? `${hours}h ${pad(minutes)}m` : `${minutes}m`
}

export function formatClock(iso) {
  return new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

/** Yerel saate göre gün anahtarı (YYYY-MM-DD) — gruplama bunun üzerinden yapılır. */
export function dayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "Monday 14.07" */
export function formatDayLabel(key) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = date.toLocaleDateString(LOCALE, { weekday: 'long' })
  const capitalized = weekday.charAt(0).toLocaleUpperCase(LOCALE) + weekday.slice(1)
  return `${capitalized} ${pad(day)}.${pad(month)}${year === new Date().getFullYear() ? '' : `.${year}`}`
}

/** ISO → <input type="datetime-local"> değeri (yerel saat). */
export function toInputValue(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> değeri → ISO (yerel saat olarak yorumlanır). */
export function fromInputValue(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

/** Verilen tarihin haftasının Pazartesi 00:00'ı (yerel saat). */
export function startOfWeek(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // getDay(): 0 Pazar … 6 Cumartesi. Hafta Pazartesi başlıyor.
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  return d
}

export function addDays(date, count) {
  const d = new Date(date)
  d.setDate(d.getDate() + count)
  return d
}

/** Haftanın yedi günü, Pazartesi'den Pazar'a. */
export function weekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** "18 – 24 August 2026" (ay veya yıl değişiyorsa iki tarafı da yazar). */
export function formatWeekRange(weekStart) {
  const end = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === end.getMonth()
  const sameYear = weekStart.getFullYear() === end.getFullYear()

  const left = weekStart.toLocaleDateString(LOCALE, {
    day: 'numeric',
    ...(sameMonth && sameYear ? {} : { month: 'long' }),
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const right = end.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
  return `${left} – ${right}`
}

/** "Mon" gibi kısa gün adı. */
export function formatWeekdayShort(date) {
  const short = date.toLocaleDateString(LOCALE, { weekday: 'short' })
  return short.charAt(0).toLocaleUpperCase(LOCALE) + short.slice(1)
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Gün başlangıcından itibaren geçen dakika — takvimde dikey konum için. */
export function minutesSinceMidnight(iso) {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

/** Oturumları güne göre grupla, her gün için toplam süreyi hesapla. */
export function groupByDay(sessions) {
  const groups = new Map()
  for (const session of sessions) {
    const key = dayKey(session.start_time)
    if (!groups.has(key)) groups.set(key, { key, sessions: [], totalSeconds: 0 })
    const group = groups.get(key)
    group.sessions.push(session)
    group.totalSeconds += session.duration_seconds
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
}
