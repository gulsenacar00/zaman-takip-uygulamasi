import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { requireAuth } from '../auth.js'
import { normalizeTitle, validateRange } from '../sessionRules.js'

export const sessionsRouter = Router()
sessionsRouter.use(requireAuth)

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

sessionsRouter.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT id, title, start_time, end_time, duration_seconds, created_at
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
      `INSERT INTO work_sessions (user_id, title, start_time, end_time, duration_seconds, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, start_time, end_time, duration_seconds, created_at`,
      [
        req.user.id,
        normalizeTitle(req.body?.title),
        start.toISOString(),
        end.toISOString(),
        duration,
        new Date().toISOString(),
      ]
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
    if (!current) return res.status(404).json({ error: 'Session not found.' })

    const { start, end, duration, error } = validateRange(
      req.body?.start_time ?? current.start_time,
      req.body?.end_time ?? current.end_time
    )
    if (error) return res.status(400).json({ error })

    // Takvimde çoğunlukla yalnızca ad değişir; gönderilmeyen alanlar korunur.
    const title =
      req.body?.title === undefined ? current.title : normalizeTitle(req.body.title)

    const session = await queryOne(
      `UPDATE work_sessions
          SET title = $1, start_time = $2, end_time = $3, duration_seconds = $4
        WHERE id = $5 AND user_id = $6
        RETURNING id, title, start_time, end_time, duration_seconds, created_at`,
      [title, start.toISOString(), end.toISOString(), duration, id, req.user.id]
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
    if (!rows.length) return res.status(404).json({ error: 'Session not found.' })
    res.status(204).end()
  })
)
