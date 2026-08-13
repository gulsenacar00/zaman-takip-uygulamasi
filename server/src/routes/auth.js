import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { db } from '../db.js'
import {
  signToken,
  signResetToken,
  verifyResetToken,
  requireAuth,
  RESET_TOKEN_TTL_MINUTES,
} from '../auth.js'
import { mailConfigured, sendResetCode } from '../mailer.js'

export const authRouter = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_TTL_MINUTES = 15
const RESEND_COOLDOWN_SECONDS = 60
const MAX_CODE_ATTEMPTS = 5

function readCredentials(body) {
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  if (!EMAIL_RE.test(email)) return { error: 'Geçerli bir e-posta adresi girin.' }
  if (password.length < 6) return { error: 'Şifre en az 6 karakter olmalı.' }
  return { email, password }
}

authRouter.post('/register', (req, res) => {
  const { email, password, error } = readCredentials(req.body)
  if (error) return res.status(400).json({ error })

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (exists) return res.status(409).json({ error: 'Bu e-posta ile zaten bir hesap var.' })

  const now = new Date().toISOString()
  const hash = bcrypt.hashSync(password, 10)
  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO users (email, password_hash, created_at, password_changed_at) VALUES (?, ?, ?, ?)'
    )
    .run(email, hash, now, now)

  const user = { id: Number(lastInsertRowid), email }
  res.status(201).json({ token: signToken(user), user })
})

authRouter.post('/login', (req, res) => {
  const { email, password, error } = readCredentials(req.body)
  if (error) return res.status(400).json({ error })

  const row = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email)
  // Kullanıcı yok / şifre yanlış ayrımını dışarı sızdırmıyoruz.
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı.' })
  }

  const user = { id: row.id, email: row.email }
  res.json({ token: signToken(user), user })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

/* ---------------------------------------------------------------------------
 * Şifremi unuttum — 3 adım:
 *   1) /forgot-password  e-posta  → 6 haneli kod üretilir ve gönderilir
 *   2) /verify-reset-code kod     → kısa ömürlü resetToken döner
 *   3) /reset-password   yeni şifre + resetToken
 * ------------------------------------------------------------------------- */

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString()

authRouter.post('/forgot-password', async (req, res, next) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Geçerli bir e-posta adresi girin.' })

  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email)

  // Hesap yoksa da aynı yanıtı veriyoruz: hangi e-postaların kayıtlı olduğu
  // dışarıdan denenerek öğrenilmesin.
  if (!user) return res.json({ ok: true, mailConfigured })

  const recent = db
    .prepare(
      `SELECT created_at FROM password_resets
        WHERE user_id = ? AND used_at IS NULL AND created_at > ?
        ORDER BY created_at DESC LIMIT 1`
    )
    .get(user.id, new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString())

  if (recent) {
    const waitSeconds = Math.ceil(
      (RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - Date.parse(recent.created_at))) / 1000
    )
    return res.status(429).json({ error: `Yeni kod istemek için ${waitSeconds} saniye bekleyin.` })
  }

  // Önceki kullanılmamış kodlar geçersiz olsun; aynı anda tek kod geçerli.
  db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(user.id)

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const now = new Date().toISOString()
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO password_resets (user_id, code_hash, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(
      user.id,
      bcrypt.hashSync(code, 10),
      new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
      now
    )

  try {
    await sendResetCode(user.email, code, CODE_TTL_MINUTES)
    res.json({ ok: true, mailConfigured })
  } catch (err) {
    // Gönderim başarısızsa kodu da geçersiz kılalım, kullanılamayacak bir kod kalmasın.
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(Number(lastInsertRowid))
    console.error('E-posta gönderilemedi:', err.message)
    res.status(502).json({ error: 'Doğrulama e-postası gönderilemedi. SMTP ayarlarını kontrol edin.' })
  }
})

authRouter.post('/verify-reset-code', (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const code = String(req.body?.code ?? '').trim()
  const invalid = { error: 'Kod hatalı veya süresi dolmuş.' }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (!user) return res.status(400).json(invalid)

  const reset = db
    .prepare(
      `SELECT * FROM password_resets
        WHERE user_id = ? AND used_at IS NULL
        ORDER BY created_at DESC LIMIT 1`
    )
    .get(user.id)

  if (!reset || Date.parse(reset.expires_at) < Date.now()) return res.status(400).json(invalid)

  if (reset.attempts >= MAX_CODE_ATTEMPTS) {
    db.prepare('DELETE FROM password_resets WHERE id = ?').run(reset.id)
    return res.status(429).json({ error: 'Çok fazla hatalı deneme. Yeni bir kod isteyin.' })
  }

  if (!bcrypt.compareSync(code, reset.code_hash)) {
    db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?').run(reset.id)
    const left = MAX_CODE_ATTEMPTS - (reset.attempts + 1)
    return res.status(400).json({
      error: left > 0 ? `Kod hatalı. ${left} deneme hakkınız kaldı.` : 'Kod hatalı. Yeni bir kod isteyin.',
    })
  }

  res.json({ resetToken: signResetToken(user.id, reset.id), expiresInMinutes: RESET_TOKEN_TTL_MINUTES })
})

authRouter.post('/reset-password', (req, res) => {
  const password = String(req.body?.password ?? '')
  if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' })

  const payload = verifyResetToken(String(req.body?.resetToken ?? ''))
  if (!payload) {
    return res.status(400).json({ error: 'Doğrulama süresi doldu. Süreci baştan başlatın.' })
  }

  // Token tek kullanımlık: ilgili kayıt hâlâ kullanılmamış olmalı.
  const reset = db
    .prepare('SELECT * FROM password_resets WHERE id = ? AND user_id = ? AND used_at IS NULL')
    .get(payload.rid, payload.sub)
  if (!reset) return res.status(400).json({ error: 'Bu doğrulama kodu zaten kullanılmış.' })

  const now = new Date().toISOString()
  db.prepare('UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?').run(
    bcrypt.hashSync(password, 10),
    now,
    payload.sub
  )
  db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(now, reset.id)
  db.prepare('DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL').run(payload.sub)

  // Yanıtta token dönmüyoruz: kullanıcı yeni şifresiyle tekrar giriş yapsın.
  res.json({ ok: true })
})
