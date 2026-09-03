import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useSessions } from '../context/SessionsContext.jsx'

/**
 * Aynı tarayıcıdaki diğer sekmelere "sayaç değişti, tazele" demek için kullanılan
 * işaret. Değerin kendisi önemsiz; yalnızca `storage` olayını tetikler.
 */
const SYNC_KEY = 'zt:timer-sync'

/** Başka cihazda başlatılan/durdurulan sayacı da yakalamak için arka plan tazelemesi. */
const POLL_MS = 60_000

// Sayaç eskiden localStorage'da tutuluyordu. Sürüm geçişinde çalışan bir sayaç
// kaybolmasın diye bu anahtarlar bir kereye mahsus sunucuya taşınır.
const legacyStartKey = (userId) => `zt:timer:${userId}`
const legacyTitleKey = (userId) => `zt:timer-title:${userId}`

function readLegacyTimer(userId) {
  const raw = localStorage.getItem(legacyStartKey(userId))
  if (!raw || Number.isNaN(Date.parse(raw))) return null
  return { started_at: raw, title: localStorage.getItem(legacyTitleKey(userId)) || '' }
}

function clearLegacyTimer(userId) {
  localStorage.removeItem(legacyStartKey(userId))
  localStorage.removeItem(legacyTitleKey(userId))
}

/** Diğer sekmeleri uyar. */
function announce() {
  localStorage.setItem(SYNC_KEY, String(Date.now()))
}

/**
 * Çalışan sayaç **veritabanında** tutulur. Sekmeyi, tarayıcıyı ya da bilgisayarı
 * kapatmak sayacı etkilemez; yalnızca kullanıcının "Bitir" veya "kaydetmeden
 * vazgeç" demesi durdurur. Aynı hesapla başka bir cihazdan girildiğinde de sayaç
 * çalışmaya devam ediyor görünür.
 *
 * Ekranda gösterilen süre her zaman `şimdi - başlangıç` farkından hesaplanır;
 * `setInterval` yalnızca ekranı tazelemek için çalışır, bu yüzden bilgisayar
 * uyusa da süre sapmaz.
 */
export function useTimer() {
  const { user } = useAuth()
  const { addSession } = useSessions()
  const userId = user?.id ?? null

  const [startedAt, setStartedAt] = useState(null)
  const [title, setTitle] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const apply = useCallback((timer) => {
    setStartedAt(timer?.started_at ?? null)
    setTitle(timer?.title ?? '')
  }, [])

  /** Sunucudaki sayacı okur; ilk açılışta eski yerel sayacı da taşır. */
  const reload = useCallback(async () => {
    if (!userId) return
    try {
      const data = await api('/timer')
      if (data.timer) {
        apply(data.timer)
        clearLegacyTimer(userId)
        return
      }

      const legacy = readLegacyTimer(userId)
      if (!legacy) {
        apply(null)
        return
      }

      const moved = await api('/timer', { method: 'POST', body: legacy })
      clearLegacyTimer(userId)
      apply(moved.timer)
      announce()
    } catch {
      // Ağ hatasında ekrandaki durumu bozmuyoruz; sonraki tazelemede düzelir.
    }
  }, [userId, apply])

  useEffect(() => {
    if (!userId) {
      apply(null)
      return
    }
    reload()
  }, [userId, reload, apply])

  // Diğer sekmeler, sekmeye dönüş ve arka plan tazelemesi.
  useEffect(() => {
    if (!userId) return

    const onStorage = (event) => {
      if (event.key === SYNC_KEY) reload()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', onVisible)
    const id = setInterval(reload, POLL_MS)

    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(id)
    }
  }, [userId, reload])

  // Ekranı saniyede bir tazele; sekmeye dönüldüğünde anında güncelle
  // (arka plan sekmelerinde interval kısılabiliyor).
  useEffect(() => {
    if (!startedAt) return
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 1000)
    window.addEventListener('focus', tick)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('focus', tick)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [startedAt])

  const start = useCallback(
    async (name = '') => {
      if (startedAt || saving) return
      setSaving(true)
      setError('')
      try {
        const data = await api('/timer', {
          method: 'POST',
          body: { title: name.trim(), started_at: new Date().toISOString() },
        })
        apply(data.timer)
        setNow(Date.now())
        announce()
      } catch (err) {
        setError(err.message)
        // Başka bir sekmede/cihazda başlatılmış olabilir; gerçek durumu alalım.
        reload()
      } finally {
        setSaving(false)
      }
    },
    [startedAt, saving, apply, reload]
  )

  const stop = useCallback(async () => {
    if (!startedAt || saving) return
    const endMs = Date.now()
    if (endMs - Date.parse(startedAt) < 1000) {
      setError('The timer must run for at least 1 second to be saved.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = await api('/timer/stop', {
        method: 'POST',
        body: { end_time: new Date(endMs).toISOString() },
      })
      addSession(data.session)
      apply(null)
      announce()
    } catch (err) {
      // Kayıt başarısızsa sayaç durmuyor; kullanıcı tekrar deneyebilir.
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [startedAt, saving, addSession, apply])

  /** Yanlışlıkla başlatılan sayacı kaydetmeden iptal eder. */
  const discard = useCallback(async () => {
    if (!startedAt || saving) return
    setSaving(true)
    setError('')
    try {
      await api('/timer', { method: 'DELETE' })
      apply(null)
      announce()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }, [startedAt, saving, apply])

  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000)) : 0

  return {
    startedAt,
    running: !!startedAt,
    elapsedSeconds,
    title,
    saving,
    error,
    start,
    stop,
    discard,
  }
}
