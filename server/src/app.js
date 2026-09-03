import './env.js' // .env'i diğer modüllerden önce yükler

import express from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { initDb } from './db.js'
import { authRouter } from './routes/auth.js'
import { sessionsRouter } from './routes/sessions.js'
import { notesRouter } from './routes/notes.js'
import { timerRouter } from './routes/timer.js'

const here = dirname(fileURLToPath(import.meta.url))

export const app = express()

app.use(cors())
app.use(express.json({ limit: '256kb' }))

// Vekil arkasında (Vercel, Render) gerçek istemci IP'sini görebilmek için;
// istek sınırlayıcı buna dayanıyor.
app.set('trust proxy', 1)

// Şema hazır olmadan hiçbir istek işlenmez. initDb tekrar çağrılabilir olduğu
// için serverless'ta her istekte güvenle beklenebilir (ilk çağrının sözü paylaşılır).
app.use((_req, _res, next) => {
  initDb().then(() => next(), next)
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/notes', notesRouter)
app.use('/api/timer', timerRouter)

// Tek sunucu kurulumunda (yerel üretim, Render) derlenmiş istemci aynı porttan
// servis edilir. Vercel'de statik dosyaları platform sunduğu için bu klasör
// fonksiyon paketinde bulunmaz ve blok atlanır.
const clientDist = join(here, '..', '..', 'client', 'dist')
if (existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(clientDist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error.' })
})
