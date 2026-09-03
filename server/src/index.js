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
      console.log(`API ready → http://localhost:${PORT}`)
      console.log(
        mailConfigured
          ? 'Email: SMTP configured, reset codes will be sent by email.'
          : 'Email: SMTP not configured, reset codes will be printed to this console (server/.env.example).'
      )
    })
  })
  .catch((err) => {
    console.error('Could not connect to the database:', err.message)
    process.exit(1)
  })
