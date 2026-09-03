/**
 * Çalışma kaydı doğrulama kuralları. Hem `/api/sessions` hem de `/api/timer`
 * aynı sınırları uyguladığı için tek yerde tutuluyor.
 */

export const MAX_DURATION_SECONDS = 60 * 60 * 24 * 7 // tek oturum en fazla 7 gün
const MAX_TITLE_LENGTH = 120

/**
 * İş adını normalize eder. Ad zorunlu değil: boş bırakılan kayıtlar boş metinle
 * saklanır, arayüz bunları "Untitled work" olarak gösterir.
 */
export function normalizeTitle(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TITLE_LENGTH)
}

/** ISO tarih metnini doğrular ve normalize eder. */
export function parseTime(value) {
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : new Date(ms)
}

export function validateRange(startRaw, endRaw) {
  const start = parseTime(startRaw)
  const end = parseTime(endRaw)
  if (!start || !end) return { error: 'Start and end times must be valid.' }

  const duration = Math.round((end.getTime() - start.getTime()) / 1000)
  if (duration <= 0) return { error: 'The end time must be after the start time.' }
  if (duration > MAX_DURATION_SECONDS) return { error: 'A session cannot be longer than 7 days.' }

  return { start, end, duration }
}
