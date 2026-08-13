/**
 * Eski SQLite veritabanındaki kayıtları Postgres'e taşır.
 *
 * Kullanım (server klasöründen):
 *   npm run import:sqlite
 *
 * DATABASE_URL hedef Postgres'i göstermelidir. Aynı id'ye sahip satırlar
 * atlanır, bu yüzden script birden fazla kez çalıştırılabilir.
 */
import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import '../src/env.js'
import { initDb, query } from '../src/db.js'

const here = dirname(fileURLToPath(import.meta.url))
const sqlitePath = process.argv[2] ?? join(here, '..', 'data', 'app.db')

if (!existsSync(sqlitePath)) {
  console.error(`SQLite dosyası bulunamadı: ${sqlitePath}`)
  process.exit(1)
}

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'pglite') {
  console.error('DATABASE_URL kalıcı bir Postgres adresini göstermeli.')
  process.exit(1)
}

const sqlite = new DatabaseSync(sqlitePath, { readOnly: true })
await initDb()

/** Tablodaki tüm satırları, id çakışmalarını atlayarak kopyalar. */
async function copy(table, columns, transform = (row) => row) {
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all()
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
  let inserted = 0

  for (const raw of rows) {
    const row = transform(raw)
    const { rows: result } = await query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      columns.map((c) => row[c] ?? null)
    )
    if (result.length) inserted++
  }

  // SERIAL sayacını en büyük id'nin üstüne al, yoksa sonraki ekleme çakışır.
  await query(
    `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`,
    [table]
  )

  console.log(`${table}: ${rows.length} satır okundu, ${inserted} tanesi aktarıldı`)
}

await copy('users', ['id', 'email', 'password_hash', 'created_at', 'password_changed_at'])
await copy('work_sessions', [
  'id',
  'user_id',
  'start_time',
  'end_time',
  'duration_seconds',
  'created_at',
])
await copy('notes', ['id', 'user_id', 'content', 'is_done', 'created_at', 'updated_at'], (row) => ({
  ...row,
  is_done: !!row.is_done, // SQLite 0/1 → Postgres boolean
}))

console.log('\nAktarım tamamlandı.')
process.exit(0)
