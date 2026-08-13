/**
 * Basit, bellek içi istek sınırlayıcı.
 *
 * Uygulama tek bir sunucu örneğinde çalıştığı için bellek yeterli. Birden fazla
 * örneğe çıkılırsa (veya sunucu yeniden başlarsa) sayaçlar sıfırlanır; amaç
 * kaba kuvvet denemelerini yavaşlatmak, kusursuz bir kota uygulamak değil.
 */
const buckets = new Map()

function clientKey(req) {
  // Render/Heroku gibi vekil arkasında gerçek IP bu başlıkta gelir.
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded ? String(forwarded).split(',')[0].trim() : req.socket.remoteAddress
  return ip || 'bilinmeyen'
}

export function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = `${req.baseUrl}${req.path}:${clientKey(req)}`
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    bucket.count += 1
    if (bucket.count > max) {
      const seconds = Math.ceil((bucket.resetAt - now) / 1000)
      res.setHeader('Retry-After', String(seconds))
      return res.status(429).json({ error: message ?? `Çok fazla deneme. ${seconds} saniye sonra tekrar deneyin.` })
    }

    next()
  }
}

// Süresi dolmuş kayıtları ara sıra temizle ki bellek sınırsız büyümesin.
const cleanup = setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key)
  }
}, 60_000)
cleanup.unref()
