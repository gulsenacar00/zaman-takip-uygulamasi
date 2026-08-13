import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Bu modül index.js'te en başta import edilir: ESM importları sırayla
// değerlendirdiği için process.env'i okuyan diğer modüllerden (mailer.js gibi)
// önce çalışması garanti olur.
const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env')

if (existsSync(envFile)) {
  process.loadEnvFile(envFile)
}
