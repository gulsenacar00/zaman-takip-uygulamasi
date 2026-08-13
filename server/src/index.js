import './env.js' // .env'i diğer modüllerden önce yükler

import express from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import './db.js'
import { mailConfigured } from './mailer.js'
import { authRouter } from './routes/auth.js'
import { sessionsRouter } from './routes/sessions.js'
import { notesRouter } from './routes/notes.js'

const here = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3001)

const app = express()
app.use(cors())
app.use(express.json({ limit: '256kb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/notes', notesRouter)

// Üretimde tek sunucu yeter: client build edilmişse aynı porttan servis edilir.
const clientDist = join(here, '..', '..', 'client', 'dist')
if (existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(clientDist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Sunucu hatası.' })
})

app.listen(PORT, () => {
  console.log(`API hazır → http://localhost:${PORT}`)
  console.log(
    mailConfigured
      ? 'E-posta: SMTP tanımlı, sıfırlama kodları e-posta ile gönderilecek.'
      : 'E-posta: SMTP tanımlı değil, sıfırlama kodları bu konsola yazılacak (server/.env.example).'
  )
})
