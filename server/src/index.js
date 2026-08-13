/**
 * Uzun ömürlü sunucu girişi (yerel geliştirme, Render, kendi sunucunuz).
 * Vercel gibi serverless ortamlar bunun yerine kökteki api/index.js'i kullanır.
 */
import { app } from './app.js'
import { initDb } from './db.js'
import { mailConfigured } from './mailer.js'

const PORT = Number(process.env.PORT ?? 3001)

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API hazır → http://localhost:${PORT}`)
      console.log(
        mailConfigured
          ? 'E-posta: SMTP tanımlı, sıfırlama kodları e-posta ile gönderilecek.'
          : 'E-posta: SMTP tanımlı değil, sıfırlama kodları bu konsola yazılacak (server/.env.example).'
      )
    })
  })
  .catch((err) => {
    console.error('Veritabanına bağlanılamadı:', err.message)
    process.exit(1)
  })
