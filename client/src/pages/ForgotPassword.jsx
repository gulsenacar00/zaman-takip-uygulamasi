import { useEffect, useState } from 'react'
import { api } from '../api.js'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900'
const primaryClass =
  'w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60'

/**
 * Şifremi unuttum akışı:
 *   e-posta → doğrulama kodu → yeni şifre → "tekrar giriş yapın"
 */
export default function ForgotPassword({ initialEmail = '', onCancel, onDone }) {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordAgain, setPasswordAgain] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [mailSent, setMailSent] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Yeniden gönderme sayacı.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function requestCode(event) {
    event?.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('/auth/forgot-password', { method: 'POST', body: { email } })
      setMailSent(data.mailConfigured)
      setCooldown(60)
      setStep('code')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('/auth/verify-reset-code', { method: 'POST', body: { email, code } })
      setResetToken(data.resetToken)
      setStep('password')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function submitPassword(event) {
    event.preventDefault()
    if (password !== passwordAgain) return setError('Şifreler birbiriyle uyuşmuyor.')

    setBusy(true)
    setError('')
    try {
      await api('/auth/reset-password', { method: 'POST', body: { resetToken, password } })
      setStep('done')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const errorBox = error && (
    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
  )

  if (step === 'done') {
    return (
      <Card title="Şifreniz güncellendi" subtitle="Yeni şifrenizle tekrar giriş yapabilirsiniz.">
        <div className="mt-6 space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Şifreniz başarıyla değiştirildi. Güvenlik için diğer cihazlardaki oturumlarınız kapatıldı.
          </p>
          <button type="button" onClick={() => onDone(email)} className={primaryClass}>
            Giriş yap
          </button>
        </div>
      </Card>
    )
  }

  if (step === 'password') {
    return (
      <Card title="Yeni şifre belirleyin" subtitle={`${email} hesabı için yeni bir şifre girin.`}>
        <form onSubmit={submitPassword} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Yeni şifre</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-slate-500">En az 6 karakter.</span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Yeni şifre (tekrar)</span>
            <input
              type="password"
              required
              minLength={6}
              value={passwordAgain}
              onChange={(e) => setPasswordAgain(e.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>

          {errorBox}

          <button type="submit" disabled={busy} className={primaryClass}>
            {busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
          </button>
        </form>
      </Card>
    )
  }

  if (step === 'code') {
    return (
      <Card title="Doğrulama kodu" subtitle={`${email} adresine 6 haneli bir kod gönderildi.`}>
        {!mailSent && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            SMTP ayarlanmadığı için kod e-posta yerine <strong>sunucu konsoluna</strong> yazıldı.
            <code className="ml-1">npm run dev</code> çıktısına bakın.
          </p>
        )}

        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Kod</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
              className={`${inputClass} text-center font-mono text-2xl tracking-[0.4em]`}
              placeholder="000000"
            />
            <span className="mt-1 block text-xs text-slate-500">Kod 15 dakika geçerlidir.</span>
          </label>

          {errorBox}

          <button type="submit" disabled={busy || code.length !== 6} className={primaryClass}>
            {busy ? 'Kontrol ediliyor…' : 'Kodu doğrula'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={requestCode}
            disabled={busy || cooldown > 0}
            className="text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            {cooldown > 0 ? `Tekrar gönder (${cooldown})` : 'Kodu tekrar gönder'}
          </button>
          <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-800">
            Vazgeç
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="Şifremi unuttum"
      subtitle="Hesabınızın e-posta adresini girin, size 6 haneli bir doğrulama kodu gönderelim."
    >
      <form onSubmit={requestCode} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">E-posta</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            className={inputClass}
          />
        </label>

        {errorBox}

        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? 'Gönderiliyor…' : 'Kod gönder'}
        </button>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-800"
      >
        Giriş ekranına dön
      </button>
    </Card>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      {children}
    </div>
  )
}
