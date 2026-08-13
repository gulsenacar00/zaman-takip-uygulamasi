import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'

export const notesRouter = Router()
notesRouter.use(requireAuth)

const MAX_LENGTH = 5000

function readContent(value) {
  const content = String(value ?? '').trim()
  if (!content) return { error: 'Not içeriği boş olamaz.' }
  if (content.length > MAX_LENGTH) return { error: `Not en fazla ${MAX_LENGTH} karakter olabilir.` }
  return { content }
}

notesRouter.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, content, is_done, created_at, updated_at
         FROM notes
        WHERE user_id = ?
        ORDER BY is_done ASC, created_at DESC`
    )
    .all(req.user.id)
  res.json({ notes: rows.map((n) => ({ ...n, is_done: !!n.is_done })) })
})

notesRouter.post('/', (req, res) => {
  const { content, error } = readContent(req.body?.content)
  if (error) return res.status(400).json({ error })

  const now = new Date().toISOString()
  const { lastInsertRowid } = db
    .prepare('INSERT INTO notes (user_id, content, is_done, created_at, updated_at) VALUES (?, ?, 0, ?, ?)')
    .run(req.user.id, content, now, now)

  res.status(201).json({
    note: { id: Number(lastInsertRowid), content, is_done: false, created_at: now, updated_at: now },
  })
})

notesRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  const current = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, req.user.id)
  if (!current) return res.status(404).json({ error: 'Not bulunamadı.' })

  let content = current.content
  if (req.body?.content !== undefined) {
    const parsed = readContent(req.body.content)
    if (parsed.error) return res.status(400).json({ error: parsed.error })
    content = parsed.content
  }

  const isDone = req.body?.is_done === undefined ? !!current.is_done : !!req.body.is_done
  const now = new Date().toISOString()

  db.prepare('UPDATE notes SET content = ?, is_done = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(content, isDone ? 1 : 0, now, id, req.user.id)

  res.json({
    note: { id, content, is_done: isDone, created_at: current.created_at, updated_at: now },
  })
})

notesRouter.delete('/:id', (req, res) => {
  const { changes } = db
    .prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.user.id)
  if (!changes) return res.status(404).json({ error: 'Not bulunamadı.' })
  res.status(204).end()
})
