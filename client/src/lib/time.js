const pad = (n) => String(n).padStart(2, '0')

/** Canlı sayaç görünümü: 01:23:45 */
export function formatStopwatch(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/** Liste görünümü: "8s 00dk" */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  return hours > 0 ? `${hours}s ${pad(minutes)}dk` : `${minutes}dk`
}

export function formatClock(iso) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

/** Yerel saate göre gün anahtarı (YYYY-MM-DD) — gruplama bunun üzerinden yapılır. */
export function dayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "Pazartesi 14.07" */
export function formatDayLabel(key) {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = date.toLocaleDateString('tr-TR', { weekday: 'long' })
  const capitalized = weekday.charAt(0).toLocaleUpperCase('tr-TR') + weekday.slice(1)
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
