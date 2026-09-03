import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { requireAuth } from '../auth.js'
import { MAX_DURATION_SECONDS, normalizeTitle, parseTime, validateRange } from '../sessionRules.js'

export const timerRouter = Router()
timerRouter.use(requireAuth)

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

// İstemcinin saati sunucununkinden biraz ileri olabilir; bu kadarını hoş görüyoruz.
const CLOCK_SKEW_MS = 5 * 60_000

const readTimer = (userId) =>
  queryOne('SELECT title, started_at FROM active_timers WHERE user_id = $1', [userId])

/** Çalışan sayaç (yoksa null). */
timerRouter.get(
  '/',
  wrap(async (req, res) => {
    res.json({ timer: await readTimer(req.user.id) })
  })
)

/**
 * Sayacı başlatır. Başlangıç zamanını istemci gönderir (uygulamanın geri kalanı
 * da yerel saati kullanıyor); makul olmayan değerler reddedilir.
 *
 * Zaten çalışan bir sayaç varsa onu ezmeyip 409 döneriz: başka bir sekmede
 * başlatılmış sayaç sessizce kaybolmasın.
 */
timerRouter.post(
  '/',
  wrap(async (req, res) => {
    const running = await readTimer(req.user.id)
    if (running) return res.status(409).json({ error: 'A timer is already running.', timer: running })

    const started = parseTime(req.body?.started_at) ?? new Date()
    const age = Date.now() - started.getTime()
    if (age < -CLOCK_SKEW_MS) return res.status(400).json({ error: 'The start time cannot be in the future.' })
    if (age > MAX_DURATION_SECONDS * 1000) {
      return res.status(400).json({ error: 'The start time cannot be older than 7 days.' })
    }

    const timer = await queryOne(
      `INSERT INTO active_timers (user_id, title, started_at)
       VALUES ($1, $2, $3)
       RETURNING title, started_at`,
      [req.user.id, normalizeTitle(req.body?.title), started.toISOString()]
    )

    res.status(201).json({ timer })
  })
)

/**
 * Sayacı bitirir: kaydı oluşturur ve çalışan sayacı siler. İkisi tek uçta
 * yapılır; ayrı çağrılar olsaydı arada kesinti olduğunda ya kayıt kaybolur ya
 * da aynı aralık iki kez yazılabilirdi.
 */
timerRouter.post(
  '/stop',
  wrap(async (req, res) => {
    const running = await readTimer(req.user.id)
    if (!running) return res.status(404).json({ error: 'No timer is running.' })

    const { start, end, duration, error } = validateRange(
      running.started_at,
      req.body?.end_time ?? new Date().toISOString()
    )
    if (error) return res.status(400).json({ error })

    // Ad, bitirirken de gönderilebilir; gönderilmezse sayaçtaki ad kullanılır.
    const title = req.body?.title === undefined ? running.title : normalizeTitle(req.body.title)

    const session = await queryOne(
      `INSERT INTO work_sessions (user_id, title, start_time, end_time, duration_seconds, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, start_time, end_time, duration_seconds, created_at`,
      [
        req.user.id,
        title,
        start.toISOString(),
        end.toISOString(),
        duration,
        new Date().toISOString(),
      ]
    )

    await query('DELETE FROM active_timers WHERE user_id = $1', [req.user.id])
    res.status(201).json({ session })
  })
)

/** Sayacı kaydetmeden iptal eder. */
timerRouter.delete(
  '/',
  wrap(async (req, res) => {
    await query('DELETE FROM active_timers WHERE user_id = $1', [req.user.id])
    res.status(204).end()
  })
)
