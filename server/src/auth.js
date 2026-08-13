import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import { db } from './db.js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const secretFile = join(here, '..', 'data', '.jwt-secret')

// Sunucu ilk açılışta kendi imza anahtarını üretir; böylece kurulum için
// elle .env doldurmak gerekmez. Anahtar dosyada kalıcı olduğu için
// yeniden başlatmalarda tokenlar geçerliliğini korur.
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString('hex'), 'utf8')
  return readFileSync(secretFile, 'utf8').trim()
}

const SECRET = loadSecret()
const TOKEN_TTL = '30d'
export const RESET_TOKEN_TTL_MINUTES = 15

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: TOKEN_TTL })
}

/**
 * Kod doğrulandıktan sonra "yeni şifre belirle" adımını yetkilendiren kısa ömürlü token.
 * purpose alanı, oturum tokenı ile karıştırılmasını engeller.
 */
export function signResetToken(userId, resetId) {
  return jwt.sign({ sub: userId, rid: resetId, purpose: 'password_reset' }, SECRET, {
    expiresIn: `${RESET_TOKEN_TTL_MINUTES}m`,
  })
}

export function verifyResetToken(token) {
  try {
    const payload = jwt.verify(token, SECRET)
    return payload.purpose === 'password_reset' ? payload : null
  } catch {
    return null
  }
}

/** Authorization: Bearer <token> başlığını doğrular, req.user'ı doldurur. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Giriş yapmanız gerekiyor.' })

  let payload
  try {
    payload = jwt.verify(token, SECRET)
  } catch {
    return res.status(401).json({ error: 'Oturum süresi dolmuş, tekrar giriş yapın.' })
  }

  // Şifre sıfırlama tokenı normal isteklerde kullanılamaz.
  if (payload.purpose) return res.status(401).json({ error: 'Geçersiz oturum.' })

  const user = db.prepare('SELECT id, email, password_changed_at FROM users WHERE id = ?').get(payload.sub)
  if (!user) return res.status(401).json({ error: 'Geçersiz oturum.' })

  // Şifre değiştiyse o andan önce üretilmiş tokenlar geçersizdir.
  const changedAt = user.password_changed_at ? Math.floor(Date.parse(user.password_changed_at) / 1000) : 0
  if (changedAt > payload.iat) {
    return res.status(401).json({ error: 'Şifreniz değişti, tekrar giriş yapın.' })
  }

  req.user = { id: user.id, email: user.email }
  next()
}
