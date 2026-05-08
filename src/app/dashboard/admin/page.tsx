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

interface PendingInvite {
  id: string
  email: string
  name: string | null
  invited_at: string
}

export default function AdminPage() {
  const [profiles, setProfiles]         = useState<Profile[]>([])
  const [pending, setPending]           = useState<PendingInvite[]>([])
  const [loading, setLoading]           = useState(true)
  const [email, setEmail]               = useState('')
  const [name, setName]                 = useState('')
  const [sending, setSending]           = useState(false)
  const [result, setResult]             = useState<{ ok?: boolean; error?: string } | null>(null)
  const [keyMissing, setKeyMissing]     = useState(false)
  const [revoking, setRevoking]         = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting]       = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id)
    })
  }, [])

  async function loadAll() {
    setLoading(true)
    const [profilesRes, pendingRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      fetch('/api/admin/invitations').then(r => r.json()),
    ])
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[])
    if (pendingRes.pending) setPending(pendingRes.pending as PendingInvite[])
    setLoading(false)
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    setResult(null)
    setKeyMissing(false)

    const res  = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), name: name.trim() }),
    })
    const json = await res.json() as { ok?: boolean; error?: string }

    if (json.ok) {
      setResult({ ok: true })
      setEmail(''); setName('')
      setTimeout(loadAll, 1500)
    } else {
      if (json.error?.includes('SERVICE_ROLE_KEY') || json.error?.includes('konfiguriert')) {
        setKeyMissing(true)
      }
      setResult({ error: json.error })
    }
    setSending(false)
  }

  async function deleteAllUsers() {
    if (!currentUserId) return
    setResetting(true)
    setConfirmReset(false)
    await fetch('/api/admin/invitations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteAllExcept: currentUserId }),
    })
    setResetting(false)
    await loadAll()
  }

  async function revokeInvite(invite: PendingInvite) {
    if (confirmRevoke !== invite.id) { setConfirmRevoke(invite.id); return }
    setRevoking(invite.id)
    setConfirmRevoke(null)
    await fetch('/api/admin/invitations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: invite.id }),
    })
    setPending(prev => prev.filter(p => p.id !== invite.id))
    setRevoking(null)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('profiles').update({ is_active: !current }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
  }

  async function changeRole(id: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p))
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (d > 0) return `vor ${d} Tag${d === 1 ? '' : 'en'}`
    if (h > 0) return `vor ${h} Std.`
    return 'gerade eben'
  }

  const iStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
    borderRadius: 10, fontSize: 15, color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 60px' }}>

      {/* Header */}
      <div style={{ padding: '20px 0 24px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>👥 Team-Zugänge</h1>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Teammitglieder einladen und verwalten
        </div>
      </div>

      {/* Invite form */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px', marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 16 }}>
          ✉️ NEUES MITGLIED EINLADEN
        </div>

        {keyMissing && (
          <div style={{ backgroundColor: '#FF9F0A15', border: '1px solid #FF9F0A40', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#FF9F0A', marginBottom: 4 }}>⚙️ Service Role Key fehlt</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Bitte <code style={{ backgroundColor: '#ffffff20', padding: '1px 5px', borderRadius: 4 }}>SUPABASE_SERVICE_ROLE_KEY</code> in Vercel setzen und neu deployen.
            </div>
          </div>
        )}

        <form onSubmit={invite}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" style={iStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>E-Mail *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="max@beispiel.de" style={iStyle} />
          </div>

          {result?.ok && (
            <div style={{ backgroundColor: '#30D15820', border: '1px solid #30D15840', borderRadius: 10, padding: '11px 14px', marginBottom: 14, fontSize: 14, fontWeight: 600, color: '#30D158' }}>
              ✅ Einladung gesendet! {name || email} bekommt eine E-Mail.
            </div>
          )}
          {result?.error && !keyMissing && (
            <div style={{ backgroundColor: '#FF453A15', border: '1px solid #FF453A40', borderRadius: 10, padding: '11px 14px', marginBottom: 14, fontSize: 13, color: '#FF453A' }}>
              ❌ {result.error}
            </div>
          )}

          <button type="submit" disabled={sending || !email.trim()}
            style={{ width: '100%', padding: '13px', backgroundColor: sending || !email.trim() ? 'var(--bg-hover)' : '#6366f1', color: sending || !email.trim() ? 'var(--text-tertiary)' : '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {sending ? 'Sende…' : '✉️ Einladung senden'}
          </button>
        </form>
      </div>

      {/* Danger zone — delete all users except self */}
      <div style={{ marginBottom: 24 }}>
        {confirmReset ? (
          <div style={{ backgroundColor: '#FF453A15', border: '1px solid #FF453A40', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#FF453A', marginBottom: 6 }}>⚠️ Wirklich alle anderen löschen?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Alle anderen Nutzer (inkl. ausstehende Einladungen) werden unwiderruflich gelöscht.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={deleteAllUsers} disabled={resetting}
                style={{ flex: 1, padding: '11px', fontSize: 14, fontWeight: 700, backgroundColor: '#FF453A', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                {resetting ? 'Lösche…' : 'Ja, alle löschen'}
              </button>
              <button onClick={() => setConfirmReset(false)}
                style={{ flex: 1, padding: '11px', fontSize: 14, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} disabled={resetting}
            style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 600, backgroundColor: '#FF453A15', color: '#FF453A', border: '1px solid #FF453A30', borderRadius: 12, cursor: 'pointer' }}>
            🗑 Alle außer mir löschen
          </button>
        )}
      </div>

      {/* Pending invites */}
      {(loading || pending.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 12 }}>
            ⏳ AUSSTEHENDE EINLADUNGEN ({pending.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 14 }}>Laden…</div>
            ) : pending.map(inv => (
              <div key={inv.id}
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>

                {/* Avatar */}
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #FF9F0A, #FF6B00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
                  {(inv.name ?? inv.email).charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.name ?? '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.email}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Eingeladen {timeAgo(inv.invited_at)}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ fontSize: 11, fontWeight: 600, color: '#FF9F0A', backgroundColor: '#FF9F0A20', padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>
                  Ausstehend
                </div>

                {/* Revoke */}
                {confirmRevoke === inv.id ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => revokeInvite(inv)}
                      disabled={revoking === inv.id}
                      style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, backgroundColor: '#FF453A20', color: '#FF453A', border: '1px solid #FF453A40', borderRadius: 8, cursor: 'pointer' }}>
                      Ja, löschen
                    </button>
                    <button
                      onClick={() => setConfirmRevoke(null)}
                      style={{ padding: '6px 10px', fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                      Abbrechen
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => revokeInvite(inv)}
                    disabled={revoking === inv.id}
                    style={{ padding: '6px 11px', fontSize: 12, fontWeight: 600, backgroundColor: '#FF453A15', color: '#FF453A', border: '1px solid transparent', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
                    {revoking === inv.id ? '…' : 'Widerrufen'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team list */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 12 }}>
        TEAM ({profiles.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)', fontSize: 14 }}>Laden…</div>
        ) : profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)', fontSize: 14 }}>
            Noch keine Mitglieder
          </div>
        ) : profiles.map(p => (
          <div key={p.id}
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, opacity: p.is_active === false ? 0.5 : 1 }}>

            {/* Avatar */}
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
              {(p.name ?? p.email).charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name ?? '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>
            </div>

            {/* Role */}
            <select value={p.role} onChange={e => changeRole(p.id, e.target.value)}
              style={{ padding: '5px 8px', fontSize: 12, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <option value="admin">Admin</option>
              <option value="gp">GP</option>
            </select>

            {/* Active toggle */}
            <button onClick={() => toggleActive(p.id, p.is_active !== false)}
              style={{ padding: '6px 11px', fontSize: 12, fontWeight: 600, backgroundColor: p.is_active === false ? '#30D15820' : '#FF453A15', color: p.is_active === false ? '#30D158' : '#FF453A', border: '1px solid transparent', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>
              {p.is_active === false ? 'Aktivieren' : 'Deaktivieren'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
