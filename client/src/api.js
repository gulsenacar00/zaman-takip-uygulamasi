const TOKEN_KEY = 'zt:token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

/** Token geçersizleştiğinde AuthContext'in oturumu kapatabilmesi için. */
export const AUTH_EXPIRED_EVENT = 'zt:auth-expired'

const OFFLINE_MESSAGE =
  'Sunucuya ulaşılamıyor. API çalışmıyor olabilir — proje klasöründe `npm run dev` komutunun açık olduğundan emin olun.'

export async function api(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get()

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    // fetch yalnızca ağ seviyesindeki hatalarda throw eder ("Failed to fetch"):
    // API kapalı, port kapalı ya da bağlantı koptu. Ham mesaj kullanıcıya bir şey
    // anlatmadığı için burada anlaşılır bir hataya çeviriyoruz.
    throw new Error(OFFLINE_MESSAGE)
  }

  if (res.status === 401) {
    tokenStore.clear()
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (data?.error) throw new Error(data.error)
    // API'nin kendi hataları her zaman JSON döner. Gövde JSON değilse yanıt API'den
    // değil, araya giren katmandan geliyordur — Vite dev proxy'si upstream kapalıyken
    // düz metin bir 500 üretir. Bu durumu "sunucu kapalı" olarak yorumluyoruz.
    throw new Error(
      res.status >= 500 ? OFFLINE_MESSAGE : `Beklenmeyen bir hata oluştu (HTTP ${res.status}).`
    )
  }
  return data ?? {}
}
