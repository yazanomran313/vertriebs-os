'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('E-Mail oder Passwort ist falsch.')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Bitte E-Mail eingeben.'); return }
    setLoading(true)
    setError('')
    const origin = window.location.origin
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${origin}/auth/callback?next=/set-password`,
    })
    setLoading(false)
    if (resetError) { setError(resetError.message); return }
    setResetSent(true)
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 40,
      maxWidth: 380,
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 16,
          color: '#fff',
          marginBottom: 16,
        }}>
          VO
        </div>
        <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 4 }}>
          Vertriebs-OS
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Yazan Omran · Pro CRM
        </div>
      </div>

      {resetSent ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 8 }}>
            E-Mail gesendet!
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
            Check dein Postfach für <strong>{email}</strong>.<br />Klick den Link um ein neues Passwort zu setzen.
          </div>
          <button onClick={() => { setResetMode(false); setResetSent(false) }}
            style={{ fontSize: 13, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>
            Zurück zum Login
          </button>
        </div>
      ) : resetMode ? (
        <form onSubmit={handleReset}>
          <div style={{ marginBottom: 8, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Gib deine E-Mail ein — du bekommst einen Link zum Passwort zurücksetzen.
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              E-Mail
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" placeholder="deine@email.de"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 12px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px 16px', fontSize: 14, fontWeight: 600, backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: loading ? 0.7 : 1, marginBottom: 12 }}>
            {loading ? 'Sende…' : '📬 Link senden'}
          </button>
          <button type="button" onClick={() => { setResetMode(false); setError('') }}
            style={{ width: '100%', fontSize: 13, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Zurück zum Login
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              E-Mail
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" placeholder="deine@email.de"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Passwort
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password" placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Forgot password */}
          <div style={{ textAlign: 'right', marginBottom: 20 }}>
            <button type="button" onClick={() => { setResetMode(true); setError('') }}
              style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>
              Passwort vergessen?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 12px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px 16px', fontSize: 14, fontWeight: 600, backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s' }}>
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      )}
    </div>
  )
}
