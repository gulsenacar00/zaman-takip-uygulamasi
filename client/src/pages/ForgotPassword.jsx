import { useEffect, useState } from 'react'
import { api } from '../api.js'

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 ' +
  'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-400'
const primaryClass =
  'w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 ' +
  'dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300'
const labelClass = 'text-sm font-medium text-slate-700 dark:text-slate-300'
const hintClass = 'mt-1 block text-xs text-slate-500 dark:text-slate-400'
const quietButtonClass =
  'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'

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
    if (password !== passwordAgain) return setError('The passwords do not match.')

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
    <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
      {error}
    </p>
  )

  if (step === 'done') {
    return (
      <Card title="Your password has been updated" subtitle="You can sign in again with your new password.">
        <div className="mt-6 space-y-4">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Your password was changed. For security, your sessions on other devices were signed out.
          </p>
          <button type="button" onClick={() => onDone(email)} className={primaryClass}>
            Sign in
          </button>
        </div>
      </Card>
    )
  }

  if (step === 'password') {
    return (
      <Card title="Set a new password" subtitle={`Enter a new password for ${email}.`}>
        <form onSubmit={submitPassword} className="mt-6 space-y-4">
          <label className="block">
            <span className={labelClass}>New password</span>
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
            <span className={hintClass}>At least 6 characters.</span>
          </label>

          <label className="block">
            <span className={labelClass}>New password (again)</span>
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
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </Card>
    )
  }

  if (step === 'code') {
    return (
      <Card title="Verification code" subtitle={`A 6-digit code was sent to ${email}.`}>
        {!mailSent && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            SMTP is not configured, so the code was written to the <strong>server console</strong>
            instead of being emailed. Check the <code className="ml-1">npm run dev</code> output.
          </p>
        )}

        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <label className="block">
            <span className={labelClass}>Code</span>
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
            <span className={hintClass}>The code is valid for 15 minutes.</span>
          </label>

          {errorBox}

          <button type="submit" disabled={busy || code.length !== 6} className={primaryClass}>
            {busy ? 'Checking…' : 'Verify code'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={requestCode}
            disabled={busy || cooldown > 0}
            className={`${quietButtonClass} disabled:opacity-50`}
          >
            {cooldown > 0 ? `Resend (${cooldown})` : 'Resend code'}
          </button>
          <button type="button" onClick={onCancel} className={quietButtonClass}>
            Cancel
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="Forgot my password"
      subtitle="Enter your account's email address and we will send you a 6-digit verification code."
    >
      <form onSubmit={requestCode} className="mt-6 space-y-4">
        <label className="block">
          <span className={labelClass}>Email</span>
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
          {busy ? 'Sending…' : 'Send code'}
        </button>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className={`mt-4 w-full text-center text-sm ${quietButtonClass}`}
      >
        Back to sign in
      </button>
    </Card>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      {children}
    </div>
  )
}
