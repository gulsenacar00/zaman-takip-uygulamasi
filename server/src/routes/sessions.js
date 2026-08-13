import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { requireAuth } from '../auth.js'

export const sessionsRouter = Router()
sessionsRouter.use(requireAuth)

const MAX_DURATION_SECONDS = 60 * 60 * 24 * 7 // tek oturum en fazla 7 gün

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

/** ISO tarih metnini doğrular ve normalize eder. */
function parseTime(value) {
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? null : new Date(ms)
}

function validateRange(startRaw, endRaw) {
  const start = parseTime(startRaw)
  const end = parseTime(endRaw)
  if (!start || !end) return { error: 'Başlangıç ve bitiş zamanı geçerli olmalı.' }

  const duration = Math.round((end.getTime() - start.getTime()) / 1000)
  if (duration <= 0) return { error: 'Bitiş zamanı başlangıçtan sonra olmalı.' }
  if (duration > MAX_DURATION_SECONDS) return { error: 'Bir oturum 7 günden uzun olamaz.' }

  return { start, end, duration }
}

sessionsRouter.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT id, start_time, end_time, duration_seconds, created_at
         FROM work_sessions
        WHERE user_id = $1
        ORDER BY start_time DESC`,
      [req.user.id]
    )
    res.json({ sessions: rows })
  })
)

sessionsRouter.post(
  '/',
  wrap(async (req, res) => {
    const { start, end, duration, error } = validateRange(req.body?.start_time, req.body?.end_time)
    if (error) return res.status(400).json({ error })

    const session = await queryOne(
      `INSERT INTO work_sessions (user_id, start_time, end_time, duration_seconds, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, start_time, end_time, duration_seconds, created_at`,
      [req.user.id, start.toISOString(), end.toISOString(), duration, new Date().toISOString()]
    )

    res.status(201).json({ session })
  })
)

sessionsRouter.patch(
  '/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id)
    const current = await queryOne('SELECT * FROM work_sessions WHERE id = $1 AND user_id = $2', [
      id,
      req.user.id,
    ])
    if (!current) return res.status(404).json({ error: 'Kayıt bulunamadı.' })

    const { start, end, duration, error } = validateRange(
      req.body?.start_time ?? current.start_time,
      req.body?.end_time ?? current.end_time
    )
    if (error) return res.status(400).json({ error })

    const session = await queryOne(
      `UPDATE work_sessions
          SET start_time = $1, end_time = $2, duration_seconds = $3
        WHERE id = $4 AND user_id = $5
        RETURNING id, start_time, end_time, duration_seconds, created_at`,
      [start.toISOString(), end.toISOString(), duration, id, req.user.id]
    )

    res.json({ session })
  })
)

sessionsRouter.delete(
  '/:id',
  wrap(async (req, res) => {
    const { rows } = await query('DELETE FROM work_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [
      Number(req.params.id),
      req.user.id,
    ])
    if (!rows.length) return res.status(404).json({ error: 'Kayıt bulunamadı.' })
    res.status(204).end()
  })
)
