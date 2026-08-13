/**
 * Vercel serverless fonksiyon girişi.
 *
 * vercel.json'daki yeniden yazma kuralı tüm /api/* isteklerini buraya yönlendirir;
 * Express orijinal yolu görmeye devam ettiği için yönlendirme normal çalışır.
 * Statik dosyaları (client/dist) Vercel kendisi sunar.
 */
import { app } from '../server/src/app.js'

export default app
