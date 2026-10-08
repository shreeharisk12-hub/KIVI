import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { supabase, configured } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { safeReturnPath } from '../lib/navigation'
import { Busy, Notice } from '../components/UI'
export default function Auth() {
  const { user, loading } = useAuth(),
    location = useLocation(),
    navigate = useNavigate()
  const destination = safeReturnPath(new URLSearchParams(location.search).get('next'))
  const reset = location.pathname === '/reset-password'
  const [mode, setMode] = useState(reset ? 'reset' : 'login'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [show, setShow] = useState(false)
  if (loading) return <Busy />
  if (user && !reset) return <Navigate to={destination} replace />
  async function submit(e) {
    e.preventDefault()
    if (!configured) {
      setError('Configure the Supabase public URL and key to sign in.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    const f = new FormData(e.currentTarget)
    const email = f.get('email'),
      password = f.get('password')
    try {
      let res
      if (mode === 'login') res = await supabase.auth.signInWithPassword({ email, password })
      if (mode === 'register')
        res = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: f.get('name') },
            emailRedirectTo: `${locationOrigin()}/auth?next=${encodeURIComponent(destination)}`,
          },
        })
      if (mode === 'forgot')
        res = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${locationOrigin()}/reset-password`,
        })
      if (mode === 'reset') {
        if (!user) throw new Error('Open the secure password reset link from your email first.')
        res = await supabase.auth.updateUser({ password })
      }
      if (res?.error) throw res.error
      if (mode === 'forgot')
        setMessage(
          'If an account exists, a reset link will arrive shortly. Check your inbox and spam folder.',
        )
      else if (mode === 'register' && !res.data.session)
        setMessage(
          'Check your email to confirm your account, then return to KIVI. Your confirmation link will bring you back here.',
        )
      else navigate(destination, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const title = {
    login: 'Welcome to your\nlistening space.',
    register: 'Find your\nfrequency.',
    forgot: 'Back to\nyour sound.',
    reset: 'A fresh start.',
  }[mode]
  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link className="wordmark" to="/auth">
          kivi<span>®</span>
        </Link>
        <div className="eyebrow">SOUND, CONSIDERED.</div>
        <h1>{title}</h1>
        <img
          src="/products/sony-wh-1000xm6/midnight-blue.png"
          alt="Sony WH-1000XM6 in Midnight Blue"
          className="cutout"
        />
        <p>
          For a world that never stops.
          <br />
          And a moment that’s entirely yours.
        </p>
        <Link className="text-button" to="/preview">
          Explore the local asset preview <ArrowUpRight size={16} />
        </Link>
      </section>
      <section className="auth-form">
        <div className="eyebrow">YOUR KIVI ACCOUNT</div>
        <h2>
          {
            {
              login: 'Good to have you here.',
              register: 'Make yourself at home.',
              forgot: 'Forgot your password?',
              reset: 'Set a new password.',
            }[mode]
          }
        </h2>
        <p className="muted">
          {
            {
              login: 'Sign in to explore, save, and shop the collection.',
              register: 'Your next listening experience starts here.',
              forgot: 'We’ll send a secure link to your email.',
              reset: 'Choose a strong password for your account.',
            }[mode]
          }
        </p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>
              Display name
              <input name="name" autoComplete="name" maxLength={80} required />
            </label>
          )}
          {mode !== 'reset' && (
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required />
            </label>
          )}
          {mode !== 'forgot' && (
            <label>
              Password
              <div className="password-field">
                <input
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  aria-label={show ? 'Hide password' : 'Show password'}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}
          {error && <Notice>{error}</Notice>}
          {message && (
            <div className="success" role="status">
              {message}
            </div>
          )}
          <button className="button" disabled={busy}>
            {busy
              ? 'One moment…'
              : {
                  login: 'Sign in',
                  register: 'Create account',
                  forgot: 'Send reset link',
                  reset: 'Update password',
                }[mode]}
            <ArrowRight size={18} />
          </button>
        </form>
        {mode === 'login' && (
          <button
            className="text-button"
            onClick={() => {
              setMode('forgot')
              setError('')
              setMessage('')
            }}
          >
            Forgot password?
          </button>
        )}
        {!reset && (
          <div className="auth-switch">
            {mode === 'login' ? 'New to KIVI?' : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError('')
                setMessage('')
              }}
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </div>
        )}
        <small>Demo commerce experience. No real payments or shipments.</small>
      </section>
    </main>
  )
}
function locationOrigin() {
  return window.location.origin
}
