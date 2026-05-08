'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SetPasswordPage() {
  const [password, setPassword]           = useState('')
  const [confirm, setConfirm]             = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [done, setDone]                   = useState(false)
  const [sessionReady, setSessionReady]   = useState(false)
  const [sessionError, setSessionError]   = useState(false)
  const [userName, setUserName]           = useState('')

  useEffect(() => {
    let cancelled = false

    async function init() {
      // 1. Check if a session is already active (e.g. after server-side code exchange)
      const { data: { session } } = await supabase.auth.getSession()
      if (session && !cancelled) {
        const name = session.user.user_metadata?.name as string | undefined
        if (name) setUserName(name)
        setSessionReady(true)
        return
      }

      // 2. Handle token_hash in query params (Supabase OTP/invite flow)
      const params = new URLSearchParams(window.location.search)
      const token_hash = params.get('token_hash')
      const type = params.get('type') as 'invite' | 'recovery' | 'email' | null

      if (token_hash && type) {
        const { data, error: otpErr } = await supabase.auth.verifyOtp({ token_hash, type })
        if (!otpErr && data.session && !cancelled) {
          const name = data.session.user.user_metadata?.name as string | undefined
          if (name) setUserName(name)
          setSessionReady(true)
          // Clean up URL
          window.history.replaceState({}, '', '/set-password')
          return
        }
      }

      // 3. Listen for hash-based tokens (#access_token=... in URL)
      //    createBrowserClient auto-detects and processes the hash on first auth call
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
        if (sess && !cancelled) {
          const name = sess.user.user_metadata?.name as string | undefined
          if (name) setUserName(name)
          setSessionReady(true)
          subscription.unsubscribe()
        }
      })

      // 4. Timeout — if nothing fires in 8 seconds, show error
      const timeout = setTimeout(() => {
        if (!cancelled) {
          subscription.unsubscribe()
          setSessionError(true)
        }
      }, 8000)

      return () => {
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwörter stimmen nicht überein.'); return }
    if (password.length < 8)  { setError('Passwort muss mindestens 8 Zeichen haben.'); return }

    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => { window.location.href = '/dashboard' }, 2000)
  }

  const iStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 12px', fontSize: 15,
    backgroundColor: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)', padding: 16,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 40, maxWidth: 400, width: '100%', boxSizing: 'border-box',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 16,
          }}>VO</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 4 }}>
            Willkommen{userName ? `, ${userName}` : ''}!
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
            Lege jetzt dein Passwort fest, um dein Konto zu aktivieren.
          </div>
        </div>

        {done ? (
          <div style={{
            backgroundColor: '#30D15820', border: '1px solid #30D15840',
            borderRadius: 12, padding: '20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#30D158', marginBottom: 4 }}>
              Passwort gesetzt!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Du wirst weitergeleitet…
            </div>
          </div>

        ) : sessionError ? (
          <div style={{
            backgroundColor: '#FF453A15', border: '1px solid #FF453A40',
            borderRadius: 12, padding: '20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#FF453A', marginBottom: 8 }}>
              Link abgelaufen oder ungültig
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Bitte einen neuen Einladungslink anfordern oder den Link direkt aus der E-Mail öffnen.
            </div>
            <a href="/login" style={{
              display: 'inline-block', backgroundColor: '#6366f1', color: '#fff',
              borderRadius: 10, padding: '10px 20px', fontWeight: 700, fontSize: 14,
              textDecoration: 'none',
            }}>Zur Anmeldung</a>
          </div>

        ) : !sessionReady ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.2)',
              borderTop: '3px solid #6366f1',
              margin: '0 auto 14px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sitzung wird geprüft…</div>
          </div>

        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Neues Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Mindestens 8 Zeichen"
                autoComplete="new-password"
                style={iStyle}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Passwort bestätigen
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Nochmal eingeben"
                autoComplete="new-password"
                style={iStyle}
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#FF453A15', border: '1px solid #FF453A40',
                borderRadius: 10, padding: '11px 14px', marginBottom: 16,
                fontSize: 13, color: '#FF453A',
              }}>
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              style={{
                width: '100%', padding: '13px',
                backgroundColor: loading || !password || !confirm ? 'var(--bg-hover)' : '#6366f1',
                color: loading || !password || !confirm ? 'var(--text-tertiary)' : '#fff',
                border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {loading ? 'Speichere…' : '🔐 Passwort festlegen'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
