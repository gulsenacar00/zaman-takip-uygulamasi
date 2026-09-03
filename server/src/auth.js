import jwt from 'jsonwebtoken'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { queryOne } from './db.js'

const here = dirname(fileURLToPath(import.meta.url))
const secretFile = join(here, '..', 'data', '.jwt-secret')

/**
 * İmza anahtarı öncelikle JWT_SECRET ortam değişkeninden okunur.
 * Yerelde kurulum kolay olsun diye, yoksa bir dosyada üretilip saklanır —
 * ama yayında dosya sistemi kalıcı olmayabileceği için bu durum uyarılır:
 * anahtar değişirse herkesin oturumu kapanır.
 */
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET

  // Yerelde kurulum kolay olsun diye anahtarı bir dosyada saklamayı deneriz.
  // Serverless ortamlarda dosya sistemi salt okunur olduğu için bu başarısız
  // olabilir; o durumda geçici bir anahtar üretiyoruz.
  try {
    mkdirSync(dirname(secretFile), { recursive: true })
    if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(48).toString('hex'), 'utf8')
    const fromFile = readFileSync(secretFile, 'utf8').trim()
    if (fromFile) {
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          'WARNING: JWT_SECRET is not set, so the key was read from a file. In production\n' +
            '         this file may not persist; set JWT_SECRET from your host panel.'
        )
      }
      return fromFile
    }
  } catch {
    // dosya sistemi yazılamıyor — aşağıdaki geçici anahtara düşülür
  }

  console.warn(
    'WARNING: JWT_SECRET is not set and the key could not be written to disk. A\n' +
      '         temporary key was generated: every restart will sign all users out.\n' +
      '         Set the JWT_SECRET environment variable from your host panel.'
  )
  return randomBytes(48).toString('hex')
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
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'You need to sign in.' })

  let payload
  try {
    payload = jwt.verify(token, SECRET)
  } catch {
    return res.status(401).json({ error: 'Your session has expired, please sign in again.' })
  }

  // Şifre sıfırlama tokenı normal isteklerde kullanılamaz.
  if (payload.purpose) return res.status(401).json({ error: 'Invalid session.' })

  try {
    const user = await queryOne(
      'SELECT id, email, password_changed_at FROM users WHERE id = $1',
      [payload.sub]
    )
    if (!user) return res.status(401).json({ error: 'Invalid session.' })

    // Şifre değiştiyse o andan önce üretilmiş tokenlar geçersizdir.
    const changedAt = user.password_changed_at
      ? Math.floor(Date.parse(user.password_changed_at) / 1000)
      : 0
    if (changedAt > payload.iat) {
      return res.status(401).json({ error: 'Your password changed, please sign in again.' })
    }

    req.user = { id: user.id, email: user.email }
    next()
  } catch (err) {
    next(err)
  }
}
