import { useState } from 'react'
import Logo from '../components/Logo.jsx'
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
            setNotice('Your password has been updated. Sign in with your new password.')
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
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <Logo className="size-9 shrink-0" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Focus
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isLogin ? 'Sign in to your account.' : 'Create a new account.'}
        </p>

        {notice && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none
                focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100
                dark:focus:border-slate-400"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none
                focus:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100
                dark:focus:border-slate-400"
            />
            {!isLogin && (
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                At least 6 characters.
              </span>
            )}
            {isLogin && (
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setNotice('')
                  setMode('forgot')
                }}
                className="mt-1.5 text-xs text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline
                  dark:text-slate-400 dark:hover:text-slate-200"
              >
                Forgot my password
              </button>
            )}
          </label>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition
              hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            {busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isLogin ? 'register' : 'login')
            setError('')
            setNotice('')
          }}
          className="mt-4 w-full text-center text-sm text-slate-500 hover:text-slate-800
            dark:text-slate-400 dark:hover:text-slate-200"
        >
          {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
