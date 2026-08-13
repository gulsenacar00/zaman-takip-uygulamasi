import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSessions } from '../context/SessionsContext.jsx'

const timerKey = (userId) => `zt:timer:${userId}`
const pendingKey = (userId) => `zt:pending:${userId}`
const tabMarkerKey = (userId) => `zt:tab-session:${userId}`

const LAST_SEEN_KEY = 'zt:last-seen' // en son bir sekmenin canlı olduğu an
const LAST_CLOSE_KEY = 'zt:last-close' // kapanışı yakalayabildiğimiz an (garanti değil)

const HEARTBEAT_MS = 5_000
const TAB_CHANNEL = 'zt:tabs'
const PING_WAIT_MS = 300

// Bu sayfa yüklemesine ait kimlik: kendi ping'imize kendimiz cevap vermeyelim.
const TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`

// Sayacın akıbeti sayfa yükleme başına bir kez kararlaştırılır (StrictMode'un
// efektleri iki kez çalıştırması kaydı iki kez oluşturmasın).
const resolvedUsers = new Set()

function readStart(storageKey) {
  if (!storageKey) return null
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null
  // Bozuk/eski bir değer sayacı sonsuza kadar kilitlemesin.
  if (Number.isNaN(Date.parse(raw))) {
    localStorage.removeItem(storageKey)
    return null
  }
  return raw
}

function readTime(key) {
  const value = Number(localStorage.getItem(key))
  return Number.isFinite(value) ? value : 0
}

/** sessionStorage sekme kapanınca silinir, yenilemede korunur. */
function isSameTabSession(userId) {
  const key = tabMarkerKey(userId)
  const existed = sessionStorage.getItem(key) !== null
  sessionStorage.setItem(key, '1')
  return existed
}

/**
 * Açık başka bir sekme var mı diye sorar.
 *
 * Kapanışı `pagehide` ile yakalamaya güvenmiyoruz: sekme kapatılırken bu olay
 * tetiklenmeyebiliyor. Onun yerine doğrudan soruyoruz — cevap veren yoksa
 * uygulamanın açık başka bir sekmesi yok demektir.
 */
function askOtherTabs() {
  if (typeof BroadcastChannel === 'undefined') {
    // Yedek ölçüt: yakın zamanda nabız atan bir sekme var mı?
    return Promise.resolve(Date.now() - readTime(LAST_SEEN_KEY) < HEARTBEAT_MS * 2)
  }

  return new Promise((resolve) => {
    const channel = new BroadcastChannel(TAB_CHANNEL)
    let settled = false
    const finish = (alive) => {
      if (settled) return
      settled = true
      channel.close()
      resolve(alive)
    }

    channel.onmessage = (event) => {
      const data = event.data
      if (data?.from !== TAB_ID && data?.type === 'pong') finish(true)
    }
    channel.postMessage({ type: 'ping', from: TAB_ID })
    setTimeout(() => finish(false), PING_WAIT_MS)
  })
}

/**
 * Sekme kapatıldığı için sayacı sonlandırır: oturum, son canlı anda bitmiş
 * sayılır ve "bekleyen kayıt" olarak saklanır.
 * @returns {boolean} kaydedilecek bir oturum oluştu mu
 */
function finalizeClosedSession(userId, startedAt) {
  const closedAt = Math.max(readTime(LAST_CLOSE_KEY), readTime(LAST_SEEN_KEY))
  localStorage.removeItem(timerKey(userId))

  // Bir saniyeden kısa oturumu kaydetmiyoruz (sunucu da kabul etmez).
  if (closedAt - Date.parse(startedAt) < 1000) return false

  localStorage.setItem(
    pendingKey(userId),
    JSON.stringify({ start_time: startedAt, end_time: new Date(closedAt).toISOString() })
  )
  return true
}

/**
 * Sayaç durumu localStorage'da saklanır ve geçen süre her zaman
 * "şimdi - başlangıç" farkından hesaplanır; setInterval yalnızca ekranı
 * tazelemek için çalışır. Böylece bilgisayar uyusa da süre doğru kalır.
 *
 * Sekme tamamen kapatıldığında sayaç durur: oturum, sekmenin kapandığı anda
 * bitirilmiş sayılır ve uygulama bir daha açıldığında kaydedilir. Sayfayı
 * yenilemek veya uygulamayı ikinci bir sekmede açmak sayacı durdurmaz.
 */
export function useTimer() {
  const { user } = useAuth()
  const { createSession } = useSessions()
  const userId = user?.id ?? null
  const storageKey = userId ? timerKey(userId) : null

  const [startedAt, setStartedAt] = useState(() => readStart(storageKey))
  const [now, setNow] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoStopped, setAutoStopped] = useState(null)

  /** Sekme kapandığı için bitirilmiş oturumu sunucuya yazar. */
  const flushPending = useCallback(() => {
    if (!userId) return
    const raw = localStorage.getItem(pendingKey(userId))
    if (!raw) return

    let record
    try {
      record = JSON.parse(raw)
    } catch {
      record = null
    }
    if (!record?.start_time || !record?.end_time) {
      localStorage.removeItem(pendingKey(userId))
      return
    }

    // Kaydı hemen kuyruktan alıyoruz ki iki kez gönderilmesin; hata olursa
    // geri koyup bir sonraki açılışta tekrar deniyoruz (veri kaybolmasın).
    localStorage.removeItem(pendingKey(userId))
    createSession(record.start_time, record.end_time)
      .then(() => setAutoStopped(record))
      .catch(() => localStorage.setItem(pendingKey(userId), raw))
  }, [userId, createSession])

  // Diğer sekmelerin "açık mısın?" sorusunu yanıtla.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel(TAB_CHANNEL)
    channel.onmessage = (event) => {
      const data = event.data
      if (data?.from !== TAB_ID && data?.type === 'ping') {
        channel.postMessage({ type: 'pong', from: TAB_ID })
      }
    }
    return () => channel.close()
  }, [])

  // Bu sekmenin canlı olduğunu duyur; yakalayabilirsek kapanış anını damgala.
  useEffect(() => {
    const beat = () => localStorage.setItem(LAST_SEEN_KEY, String(Date.now()))
    const onPageHide = (event) => {
      if (event.persisted) return // bfcache'e alınıyor, kapanmıyor
      const stamp = String(Date.now())
      localStorage.setItem(LAST_SEEN_KEY, stamp)
      localStorage.setItem(LAST_CLOSE_KEY, stamp)
    }

    beat()
    const id = setInterval(beat, HEARTBEAT_MS)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      clearInterval(id)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  // Sayfa açılışında sayacın akıbetine karar ver.
  useEffect(() => {
    if (!userId) {
      setStartedAt(null)
      return
    }

    const stored = readStart(timerKey(userId))
    if (resolvedUsers.has(userId)) {
      setStartedAt(stored)
      return
    }
    resolvedUsers.add(userId)

    // Yenileme / uygulama içi gezinme: sayaç kaldığı yerden devam eder.
    if (!stored || isSameTabSession(userId)) {
      setStartedAt(stored)
      return
    }

    askOtherTabs().then((alive) => {
      if (alive) {
        setStartedAt(stored)
        return
      }
      const hasRecord = finalizeClosedSession(userId, stored)
      setStartedAt(null)
      if (hasRecord) flushPending()
    })
  }, [userId, flushPending])

  // Önceki denemede sunucuya yazılamamış kayıt varsa tekrar dene.
  useEffect(() => {
    flushPending()
  }, [flushPending])

  // Ekranı saniyede bir tazele; sekmeye dönüldüğünde anında güncelle
  // (arka plan sekmelerinde interval kısılabiliyor).
  useEffect(() => {
    if (!startedAt) return
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 1000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [startedAt])

  // Aynı hesabın açık diğer sekmeleriyle senkron kal.
  useEffect(() => {
    if (!storageKey) return
    const onStorage = (event) => {
      if (event.key !== storageKey) return
      setStartedAt(readStart(storageKey))
      setNow(Date.now())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [storageKey])

  const start = useCallback(() => {
    if (!storageKey || startedAt) return
    const iso = new Date().toISOString()
    localStorage.setItem(storageKey, iso)
    setStartedAt(iso)
    setNow(Date.now())
    setError('')
    setAutoStopped(null)
  }, [storageKey, startedAt])

  const stop = useCallback(async () => {
    if (!startedAt || saving) return
    const endMs = Date.now()
    if (endMs - Date.parse(startedAt) < 1000) {
      setError('Kaydetmek için en az 1 saniye çalışması gerekiyor.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await createSession(startedAt, new Date(endMs).toISOString())
      localStorage.removeItem(storageKey)
      setStartedAt(null)
    } catch (err) {
      // Kayıt başarısızsa sayaç durmuyor; kullanıcı tekrar deneyebilir.
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [startedAt, saving, storageKey, createSession])

  /** Yanlışlıkla başlatılan sayacı kaydetmeden iptal eder. */
  const discard = useCallback(() => {
    if (!storageKey) return
    localStorage.removeItem(storageKey)
    setStartedAt(null)
    setError('')
  }, [storageKey])

  const elapsedSeconds = startedAt ? Math.floor((now - Date.parse(startedAt)) / 1000) : 0

  return {
    startedAt,
    running: !!startedAt,
    elapsedSeconds,
    saving,
    error,
    autoStopped,
    dismissAutoStopped: () => setAutoStopped(null),
    start,
    stop,
    discard,
  }
}
