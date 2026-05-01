'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
  is_active?: boolean
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  async function loadProfiles() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (!error && data) setProfiles(data as Profile[])
    setLoading(false)
  }

  useEffect(() => { loadProfiles() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteMessage('')
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName }),
      })
      const data = await res.json() as { message: string }
      setInviteMessage(data.message)
      setInviteEmail('')
      setInviteName('')
    } catch {
      setInviteMessage('Fehler beim Einladen.')
    }
    setInviteLoading(false)
  }

  async function handleRoleChange(id: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p))
  }

  async function handleToggleActive(id: string, current: boolean) {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
  }

  function getInitial(profile: Profile) {
    return (profile.name ?? profile.email).charAt(0).toUpperCase()
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            Team-Zugänge
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Verwalte Logins für deine Geschäftspartner
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(v => !v); setInviteMessage('') }}
          style={{
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 600,
            backgroundColor: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          + GP einladen
        </button>
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            GP einladen
          </h2>
          <form onSubmit={handleInvite}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Max Mustermann"
                  style={{
                    width: '100%', padding: '9px 11px', fontSize: 13,
                    backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
                    borderRadius: 7, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>E-Mail</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                  placeholder="gp@beispiel.de"
                  style={{
                    width: '100%', padding: '9px 11px', fontSize: 13,
                    backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
                    borderRadius: 7, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            {inviteMessage && (
              <div style={{
                marginBottom: 12, padding: '9px 12px', fontSize: 13,
                backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 7, color: '#6366f1',
              }}>
                {inviteMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={inviteLoading}
              style={{
                padding: '9px 20px', fontSize: 13, fontWeight: 600,
                backgroundColor: '#6366f1', color: '#fff', border: 'none',
                borderRadius: 7, cursor: inviteLoading ? 'not-allowed' : 'pointer',
                opacity: inviteLoading ? 0.7 : 1,
              }}
            >
              {inviteLoading ? 'Sende...' : 'Einladen'}
            </button>
          </form>
        </div>
      )}

      {/* User List */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            Lade...
          </div>
        ) : profiles.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            Keine User gefunden. Stelle sicher, dass die profiles-Tabelle existiert.
          </div>
        ) : (
          profiles.map((profile, idx) => (
            <div key={profile.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 20px',
              borderBottom: idx < profiles.length - 1 ? '1px solid var(--border)' : 'none',
              opacity: profile.is_active === false ? 0.5 : 1,
            }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0,
              }}>
                {getInitial(profile)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                  {profile.name ?? '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                  {profile.email}
                </div>
              </div>

              {/* Role badge */}
              <span style={{
                padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                backgroundColor: profile.role === 'admin' ? 'rgba(99,102,241,0.15)' : 'rgba(34,197,94,0.15)',
                color: profile.role === 'admin' ? '#6366f1' : '#22c55e',
              }}>
                {profile.role === 'admin' ? 'Admin' : 'GP'}
              </span>

              {/* Role select */}
              <select
                value={profile.role}
                onChange={e => handleRoleChange(profile.id, e.target.value)}
                style={{
                  padding: '5px 8px', fontSize: 12,
                  backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer',
                }}
              >
                <option value="admin">Admin</option>
                <option value="gp">GP</option>
              </select>

              {/* Active toggle */}
              <button
                onClick={() => handleToggleActive(profile.id, profile.is_active !== false)}
                style={{
                  padding: '5px 10px', fontSize: 12,
                  backgroundColor: profile.is_active === false ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                  color: profile.is_active === false ? '#22c55e' : '#ef4444',
                  border: '1px solid transparent', borderRadius: 6, cursor: 'pointer',
                }}
              >
                {profile.is_active === false ? 'Aktivieren' : 'Deaktivieren'}
              </button>

              {/* Date */}
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                {new Date(profile.created_at).toLocaleDateString('de-DE')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
