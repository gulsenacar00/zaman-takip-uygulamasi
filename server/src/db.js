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
    title            TEXT NOT NULL DEFAULT '',
    start_time       TEXT NOT NULL,
    end_time         TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    created_at       TEXT NOT NULL
  );

  -- Çalışmakta olan sayaç. Kullanıcı başına en fazla bir tane olduğu için
  -- birincil anahtar user_id'dir. Sayaç yalnızca kullanıcı "Bitir" veya
  -- "vazgeç" dediğinde silinir; sekmenin/tarayıcının kapanması etkilemez.
  CREATE TABLE IF NOT EXISTS active_timers (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL DEFAULT '',
    started_at TEXT NOT NULL
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

// Şema yukarıdaki CREATE TABLE IF NOT EXISTS ile kurulduğu için, daha önce
// oluşturulmuş bir veritabanında yeni sütunlar eksik kalır. Sonradan eklenen
// her sütun burada ayrıca tanımlanır; ADD COLUMN IF NOT EXISTS tekrar
// çalıştırılabilir olduğundan her açılışta güvenle koşar.
const MIGRATIONS_SQL = `
  ALTER TABLE work_sessions ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
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
  if (!runQuery) throw new Error('The database is not initialised yet (initDb must be called).')
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
    console.log('Database: embedded PGlite (in-memory, not persistent)')
    return {
      query: (text, params) => db.query(text, params),
      exec: (text) => db.exec(text),
    }
  }

  if (!url) {
    console.error(
      'DATABASE_URL is not set.\n' +
        '  Production : set the Postgres connection string in your host panel.\n' +
        '  Local      : put DATABASE_URL in server/.env, or use DATABASE_URL=pglite\n' +
        '               to try it without any setup.'
    )
    process.exit(1)
  }

  const isLocal = /@(localhost|127\.0\.0\.1)/.test(url)
  // Serverless'ta her örnek kısa ömürlüdür ve aynı anda çok sayıda örnek
  // ayağa kalkabilir; örnek başına tek bağlantı tutup boştakini hızlıca
  // bırakmak veritabanının bağlantı limitini korur.
  const serverless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

  const pool = new pg.Pool({
    connectionString: url,
    // Yönetilen Postgres servisleri TLS ister. Sertifika doğrulaması varsayılan
    // olarak açık; sağlayıcınız kendi imzaladığı bir sertifika kullanıyorsa
    // DATABASE_SSL_INSECURE=1 ile kapatabilirsiniz.
    ssl: isLocal ? false : { rejectUnauthorized: process.env.DATABASE_SSL_INSECURE !== '1' },
    max: serverless ? 1 : 10,
    idleTimeoutMillis: serverless ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  })

  pool.on('error', (err) => console.error('Postgres pool error:', err.message))

  return {
    query: (text, params) => pool.query(text, params),
    exec: (text) => pool.query(text),
  }
}

async function bootstrap() {
  const driver = await createDriver()
  runQuery = driver.query
  await driver.exec(SCHEMA_SQL)
  await driver.exec(MIGRATIONS_SQL)
}

let initPromise = null

/**
 * Sürücüyü kurar ve şemayı oluşturur.
 *
 * Birden çok kez çağrılabilir: uzun ömürlü sunucuda açılışta bir kez, serverless
 * ortamda ise her istekte çağrılır ve ilk çağrının sözü paylaşılır.
 */
export function initDb() {
  if (!initPromise) {
    initPromise = bootstrap().catch((err) => {
      initPromise = null // sonraki istek yeniden denesin
      throw err
    })
  }
  return initPromise
}
