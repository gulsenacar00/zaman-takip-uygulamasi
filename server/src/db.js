import pg from 'pg'

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id                  SERIAL PRIMARY KEY,
    email               TEXT NOT NULL UNIQUE,
    password_hash       TEXT NOT NULL,
    created_at          TEXT NOT NULL,
    password_changed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS work_sessions (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time       TEXT NOT NULL,
    end_time         TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    created_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    is_done    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    used_at    TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON work_sessions(user_id, start_time DESC);
  CREATE INDEX IF NOT EXISTS idx_notes_user    ON notes(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_resets_user   ON password_resets(user_id, created_at DESC);
`

// Zaman damgaları ISO 8601 (UTC) metin olarak saklanır. Bu biçimde sözlük
// sıralaması kronolojik sıralamayla aynı olduğu için ORDER BY doğru çalışır.

let runQuery = null

/**
 * Tek sorgu çalıştırır. pg ve PGlite'ın imzaları uyumlu olduğu için
 * çağıran taraf hangi sürücünün kullanıldığını bilmek zorunda değil.
 * @returns {Promise<{rows: any[]}>}
 */
export function query(text, params) {
  if (!runQuery) throw new Error('Veritabanı henüz başlatılmadı (initDb çağrılmalı).')
  return runQuery(text, params)
}

/** Tek satır bekleyen sorgular için kısayol. */
export async function queryOne(text, params) {
  const { rows } = await query(text, params)
  return rows[0] ?? null
}

async function createDriver() {
  const url = process.env.DATABASE_URL

  // Geliştirme kolaylığı: DATABASE_URL=pglite ile kurulum gerektirmeyen,
  // bellek içi bir Postgres üzerinde çalışır (veriler kalıcı değildir).
  if (url === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite')
    const db = new PGlite()
    console.log('Veritabanı: gömülü PGlite (bellek içi, kalıcı değil)')
    return {
      query: (text, params) => db.query(text, params),
      exec: (text) => db.exec(text),
    }
  }

  if (!url) {
    console.error(
      'DATABASE_URL tanımlı değil.\n' +
        '  Yayında  : sunucu panelinde Postgres bağlantı adresini ayarlayın.\n' +
        '  Yerelde  : server/.env içine DATABASE_URL yazın veya kurulumsuz denemek\n' +
        '             için DATABASE_URL=pglite kullanın.'
    )
    process.exit(1)
  }

  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)
  const pool = new pg.Pool({
    connectionString: url,
    // Yönetilen Postgres servisleri TLS ister. Sertifika doğrulaması varsayılan
    // olarak açık; sağlayıcınız kendi imzaladığı bir sertifika kullanıyorsa
    // DATABASE_SSL_INSECURE=1 ile kapatabilirsiniz.
    ssl: isLocal ? false : { rejectUnauthorized: process.env.DATABASE_SSL_INSECURE !== '1' },
  })

  pool.on('error', (err) => console.error('Postgres havuz hatası:', err.message))

  return {
    query: (text, params) => pool.query(text, params),
    exec: (text) => pool.query(text),
  }
}

/** Sürücüyü kurar ve şemayı oluşturur. Sunucu dinlemeye başlamadan önce çağrılır. */
export async function initDb() {
  const driver = await createDriver()
  runQuery = driver.query
  await driver.exec(SCHEMA_SQL)
}
