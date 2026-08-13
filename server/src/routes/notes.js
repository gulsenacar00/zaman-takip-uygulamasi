import { Router } from 'express'
import { query, queryOne } from '../db.js'
import { requireAuth } from '../auth.js'

export const notesRouter = Router()
notesRouter.use(requireAuth)

const MAX_LENGTH = 5000

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

function readContent(value) {
  const content = String(value ?? '').trim()
  if (!content) return { error: 'Not içeriği boş olamaz.' }
  if (content.length > MAX_LENGTH) return { error: `Not en fazla ${MAX_LENGTH} karakter olabilir.` }
  return { content }
}

notesRouter.get(
  '/',
  wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT id, content, is_done, created_at, updated_at
         FROM notes
        WHERE user_id = $1
        ORDER BY is_done ASC, created_at DESC`,
      [req.user.id]
    )
    res.json({ notes: rows })
  })
)

notesRouter.post(
  '/',
  wrap(async (req, res) => {
    const { content, error } = readContent(req.body?.content)
    if (error) return res.status(400).json({ error })

    const now = new Date().toISOString()
    const note = await queryOne(
      `INSERT INTO notes (user_id, content, is_done, created_at, updated_at)
       VALUES ($1, $2, FALSE, $3, $3)
       RETURNING id, content, is_done, created_at, updated_at`,
      [req.user.id, content, now]
    )

    res.status(201).json({ note })
  })
)

notesRouter.patch(
  '/:id',
  wrap(async (req, res) => {
    const id = Number(req.params.id)
    const current = await queryOne('SELECT * FROM notes WHERE id = $1 AND user_id = $2', [id, req.user.id])
    if (!current) return res.status(404).json({ error: 'Not bulunamadı.' })

    let content = current.content
    if (req.body?.content !== undefined) {
      const parsed = readContent(req.body.content)
      if (parsed.error) return res.status(400).json({ error: parsed.error })
      content = parsed.content
    }

    const isDone = req.body?.is_done === undefined ? current.is_done : !!req.body.is_done

    const note = await queryOne(
      `UPDATE notes
          SET content = $1, is_done = $2, updated_at = $3
        WHERE id = $4 AND user_id = $5
        RETURNING id, content, is_done, created_at, updated_at`,
      [content, isDone, new Date().toISOString(), id, req.user.id]
    )

    res.json({ note })
  })
)

notesRouter.delete(
  '/:id',
  wrap(async (req, res) => {
    const { rows } = await query('DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id', [
      Number(req.params.id),
      req.user.id,
    ])
    if (!rows.length) return res.status(404).json({ error: 'Not bulunamadı.' })
    res.status(204).end()
  })
)
