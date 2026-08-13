import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import ForgotPassword from './ForgotPassword.jsx'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const isLogin = mode === 'login'

  if (mode === 'forgot') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ForgotPassword
          initialEmail={email}
          onCancel={() => setMode('login')}
          onDone={(resetEmail) => {
            // Şifre değişti: e-postayı taşıyıp temiz bir giriş formu açıyoruz.
            setEmail(resetEmail)
            setPassword('')
            setError('')
            setNotice('Şifreniz güncellendi. Yeni şifrenizle giriş yapın.')
            setMode('login')
          }}
        />
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await (isLogin ? login(email, password) : register(email, password))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">Zaman Takip</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isLogin ? 'Hesabınıza giriş yapın.' : 'Yeni bir hesap oluşturun.'}
        </p>

        {notice && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">E-posta</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Şifre</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
            />
            {!isLogin && <span className="mt-1 block text-xs text-slate-500">En az 6 karakter.</span>}
            {isLogin && (
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setNotice('')
                  setMode('forgot')
                }}
                className="mt-1.5 text-xs text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
              >
                Şifremi unuttum
              </button>
            )}
          </label>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? 'Lütfen bekleyin…' : isLogin ? 'Giriş yap' : 'Kayıt ol'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isLogin ? 'register' : 'login')
            setError('')
            setNotice('')
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-800"
        >
          {isLogin ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </button>
      </div>
    </div>
  )
}
