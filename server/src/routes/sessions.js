import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'

export const sessionsRouter = Router()
sessionsRouter.use(requireAuth)

const MAX_DURATION_SECONDS = 60 * 60 * 24 * 7 // tek oturum en fazla 7 gün

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

sessionsRouter.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, start_time, end_time, duration_seconds, created_at
         FROM work_sessions
        WHERE user_id = ?
        ORDER BY start_time DESC`
    )
    .all(req.user.id)
  res.json({ sessions: rows })
})

sessionsRouter.post('/', (req, res) => {
  const { start, end, duration, error } = validateRange(req.body?.start_time, req.body?.end_time)
  if (error) return res.status(400).json({ error })

  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO work_sessions (user_id, start_time, end_time, duration_seconds, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(req.user.id, start.toISOString(), end.toISOString(), duration, new Date().toISOString())

  const session = db
    .prepare('SELECT id, start_time, end_time, duration_seconds, created_at FROM work_sessions WHERE id = ?')
    .get(Number(lastInsertRowid))

  res.status(201).json({ session })
})

sessionsRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  const current = db
    .prepare('SELECT * FROM work_sessions WHERE id = ? AND user_id = ?')
    .get(id, req.user.id)
  if (!current) return res.status(404).json({ error: 'Kayıt bulunamadı.' })

  const { start, end, duration, error } = validateRange(
    req.body?.start_time ?? current.start_time,
    req.body?.end_time ?? current.end_time
  )
  if (error) return res.status(400).json({ error })

  db.prepare(
    'UPDATE work_sessions SET start_time = ?, end_time = ?, duration_seconds = ? WHERE id = ? AND user_id = ?'
  ).run(start.toISOString(), end.toISOString(), duration, id, req.user.id)

  const session = db
    .prepare('SELECT id, start_time, end_time, duration_seconds, created_at FROM work_sessions WHERE id = ?')
    .get(id)

  res.json({ session })
})

sessionsRouter.delete('/:id', (req, res) => {
  const { changes } = db
    .prepare('DELETE FROM work_sessions WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id)
  if (!changes) return res.status(404).json({ error: 'Kayıt bulunamadı.' })
  res.status(204).end()
})
