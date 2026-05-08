'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trophy, Target, TrendingUp, LogOut, ChevronRight, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Profile {
  name: string | null
  email: string | null
  role: string | null
}

interface CoachingGoal {
  currentStufe: string
  targetStufe: string
  targetEinheiten: number
}

interface Contact {
  vg_stage: string | null
  einheiten: number | null
}

const STUFEN = [
  { key: 'Rep',  label: 'Repräsentant',              color: '#6b7280' },
  { key: 'LR',   label: 'Leit. Repräsentant',        color: '#6366f1' },
  { key: 'HR',   label: 'Hauptrepräsentant',         color: '#8b5cf6' },
  { key: 'CR',   label: 'Chefrepräsentant',          color: '#f59e0b' },
  { key: 'DR5',  label: 'Direktionsrep. Stufe 5',    color: '#ef4444' },
  { key: 'DR6',  label: 'Direktionsrep. Stufe 6',    color: '#e1306c' },
]

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function loadGoal(): CoachingGoal {
  try {
    const raw = localStorage.getItem('ergo_coaching_goal')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { currentStufe: 'Rep', targetStufe: 'LR', targetEinheiten: 50 }
}

function saveGoal(g: CoachingGoal) {
  localStorage.setItem('ergo_coaching_goal', JSON.stringify(g))
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function IchPage() {
  const router = useRouter()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [goal, setGoal]         = useState<CoachingGoal>(loadGoal)
  const [saved, setSaved]       = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase
          .from('profiles').select('name,email,role').eq('id', user.id).single()
        setProfile(p ? { name: p.name, email: p.email ?? user.email ?? null, role: p.role } : { name: null, email: user.email ?? null, role: null })
      }
      const { data: cData } = await supabase
        .from('contacts').select('vg_stage,einheiten')
      setContacts((cData || []) as Contact[])
      setLoading(false)
    }
    load()
  }, [])

  const earnedEinheiten = contacts
    .filter(c => c.vg_stage === 'abgeschlossen')
    .reduce((s, c) => s + (c.einheiten || 0), 0)

  const coachPct = Math.min(100, Math.round((earnedEinheiten / goal.targetEinheiten) * 100))

  function handleSave() {
    saveGoal(goal)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)', fontSize: 13 }}>
      Lade…
    </div>
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>Mein Profil</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
          Ziele & Einstellungen
        </p>
      </div>

      {/* ── PROFILE CARD ── */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '20px',
        marginBottom: 16,
      }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            backgroundColor: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
            color: '#fff',
            flexShrink: 0,
          }}>
            {(profile?.name || profile?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{profile?.name || 'Kein Name'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{profile?.email}</div>
            {profile?.role && (
              <div style={{
                display: 'inline-block',
                marginTop: 4,
                padding: '2px 8px',
                backgroundColor: profile.role === 'admin' ? '#f59e0b20' : '#6366f120',
                color: profile.role === 'admin' ? '#f59e0b' : '#6366f1',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
              }}>
                {profile.role === 'admin' ? '👑 Admin' : '👤 GP'}
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ backgroundColor: 'var(--bg-hover)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Einheiten (gesamt)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#6366f1' }}>{earnedEinheiten.toFixed(1)}</div>
          </div>
          <div style={{ backgroundColor: 'var(--bg-hover)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Ziel-Fortschritt</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e' }}>{coachPct}%</div>
          </div>
        </div>
      </div>

      {/* ── STUFENZIEL EINSTELLUNGEN ── */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '20px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Trophy size={16} color="#6366f1" />
          <span style={{ fontWeight: 700, fontSize: 15 }}>Stufenziel</span>
        </div>

        {/* Current Stufe */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            Meine aktuelle Stufe
          </label>
          <select
            value={goal.currentStufe}
            onChange={e => setGoal({ ...goal, currentStufe: e.target.value })}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {STUFEN.map(s => (
              <option key={s.key} value={s.key}>{s.key} — {s.label}</option>
            ))}
          </select>
        </div>

        {/* Target Stufe */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            Ziel-Stufe
          </label>
          <select
            value={goal.targetStufe}
            onChange={e => setGoal({ ...goal, targetStufe: e.target.value })}
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              color: 'var(--text-primary)',
              fontSize: 14,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {STUFEN.map(s => (
              <option key={s.key} value={s.key}>{s.key} — {s.label}</option>
            ))}
          </select>
        </div>

        {/* Target Einheiten */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            Einheiten-Ziel für Aufstieg
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              min="1"
              value={goal.targetEinheiten}
              onChange={e => setGoal({ ...goal, targetEinheiten: Number(e.target.value) })}
              style={{
                flex: 1,
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
              }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Einheiten</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 5 }}>
            Dein ERGO-Betreuer kann dir den genauen Zielwert nennen.
          </div>
        </div>

        {/* Progress preview */}
        <div style={{ backgroundColor: 'var(--bg-hover)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Aktuell: {earnedEinheiten.toFixed(1)} E</span>
            <span style={{ color: 'var(--text-secondary)' }}>Ziel: {goal.targetEinheiten} E</span>
          </div>
          <div style={{ height: 8, backgroundColor: 'var(--bg-card)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${coachPct}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              borderRadius: 4,
            }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {coachPct}% erreicht · Noch {Math.max(0, goal.targetEinheiten - earnedEinheiten).toFixed(1)} E bis {goal.targetStufe}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            backgroundColor: saved ? '#22c55e' : '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '13px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background-color 0.3s',
          }}
        >
          {saved ? <><CheckCircle size={16} /> Gespeichert!</> : 'Ziel speichern'}
        </button>
      </div>

      {/* ── LINKS ── */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        {[
          { label: 'Habits & KPIs', href: '/dashboard/habits', icon: <Target size={16} color="#6366f1" /> },
          { label: 'Finanzen', href: '/dashboard/finanzen', icon: <TrendingUp size={16} color="#22c55e" /> },
        ].map((item, i) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              textDecoration: 'none',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {item.icon}
              <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
            </div>
            <ChevronRight size={16} color="var(--text-secondary)" />
          </a>
        ))}
      </div>

      {/* ── LOGOUT ── */}
      <button
        onClick={handleLogout}
        style={{
          width: '100%',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid #ef444430',
          borderRadius: 14,
          padding: '14px',
          fontSize: 14,
          fontWeight: 600,
          color: '#ef4444',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <LogOut size={16} />
        Abmelden
      </button>

    </div>
  )
}
