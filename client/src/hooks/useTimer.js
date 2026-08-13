import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSessions } from '../context/SessionsContext.jsx'

const keyFor = (userId) => `zt:timer:${userId}`

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

/**
 * Sayaç durumu localStorage'da saklanır ve geçen süre her zaman
 * "şimdi - başlangıç" farkından hesaplanır. Bu yüzden sekme kapatılıp
 * açılsa, bilgisayar uyusa da süre doğru kalır; setInterval yalnızca
 * ekranı tazelemek için çalışır.
 */
export function useTimer() {
  const { user } = useAuth()
  const { createSession } = useSessions()
  const storageKey = user ? keyFor(user.id) : null

  const [startedAt, setStartedAt] = useState(() => readStart(storageKey))
  const [now, setNow] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Kullanıcı değişince (giriş/çıkış) o kullanıcıya ait sayacı yükle.
  useEffect(() => {
    setStartedAt(readStart(storageKey))
    setNow(Date.now())
  }, [storageKey])

  // Ekranı saniyede bir tazele; ayrıca sekmeye dönüldüğünde anında güncelle
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

  return { startedAt, running: !!startedAt, elapsedSeconds, saving, error, start, stop, discard }
}
