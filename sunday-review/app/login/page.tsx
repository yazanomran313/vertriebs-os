'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Send } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 14px' }}>🧠</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Sunday Review</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Deine wöchentliche Reflexions-Routine
          </div>
        </div>

        {sent ? (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Check deine E-Mails!</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Wir haben einen Magic Link an <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> geschickt.
              Klick den Link um dich einzuloggen.
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Einloggen</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Kein Passwort nötig — wir schicken dir einen Magic Link.
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="deine@email.de"
                required
                autoFocus
                style={{
                  width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 14px', fontSize: 14, color: 'var(--text-primary)',
                  marginBottom: 12,
                }}
              />

              {error && (
                <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  width: '100%', backgroundColor: loading || !email.trim() ? 'var(--bg-hover)' : '#6366f1',
                  color: loading || !email.trim() ? 'var(--text-secondary)' : '#fff',
                  border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
                  cursor: loading || !email.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Send size={15} />
                {loading ? 'Senden…' : 'Magic Link senden'}
              </button>
            </form>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Jeden Sonntag. Eine Frage. Mehr Geld, weniger Zeit.
        </div>
      </div>
    </div>
  )
}
