'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Phone, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Channel = 'instagram' | 'whatsapp' | 'telefon' | 'sonstiges'
type Status = 'gesendet' | 'beantwortet' | 'kein_feedback' | 'termin'

interface OutreachEntry {
  id: string
  name: string
  channel: Channel
  status: Status
  message: string
  created_at: string
}

const channelIcons: Record<Channel, React.ReactNode> = {
  instagram: <span style={{ fontSize: 12 }}>📸</span>,
  whatsapp: <MessageSquare size={14} />,
  telefon: <Phone size={14} />,
  sonstiges: <MessageSquare size={14} />,
}

const statusColors: Record<Status, { bg: string; color: string; label: string }> = {
  gesendet: { bg: '#6366f120', color: '#6366f1', label: 'Gesendet' },
  beantwortet: { bg: '#22c55e20', color: '#22c55e', label: 'Beantwortet' },
  kein_feedback: { bg: '#ef444420', color: '#ef4444', label: 'Kein Feedback' },
  termin: { bg: '#f59e0b20', color: '#f59e0b', label: 'Termin vereinbart' },
}

export default function OutreachPage() {
  const [entries, setEntries] = useState<OutreachEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', channel: 'instagram' as Channel, message: '', status: 'gesendet' as Status })

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    setLoading(true)
    const { data } = await supabase.from('outreach').select('*').order('created_at', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
  }

  async function addEntry() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('outreach').insert([form]).select().single()
    if (data && !error) {
      setEntries([data, ...entries])
      setForm({ name: '', channel: 'instagram', message: '', status: 'gesendet' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: Status) {
    await supabase.from('outreach').update({ status }).eq('id', id)
    setEntries(entries.map((e) => e.id === id ? { ...e, status } : e))
  }

  const stats = {
    total: entries.length,
    beantwortet: entries.filter((e) => e.status === 'beantwortet').length,
    termine: entries.filter((e) => e.status === 'termin').length,
    rate: entries.length > 0 ? Math.round((entries.filter((e) => e.status !== 'kein_feedback').length / entries.length) * 100) : 0,
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
        <Loader2 size={20} />
        <span>Lade Outreach...</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Outreach</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Instagram, WhatsApp & Telefon Tracking</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Outreach loggen
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Gesamt', value: stats.total, color: '#6366f1' },
          { label: 'Beantwortet', value: stats.beantwortet, color: '#22c55e' },
          { label: 'Termine', value: stats.termine, color: '#f59e0b' },
          { label: 'Reply Rate', value: `${stats.rate}%`, color: '#06b6d4' },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr', padding: '12px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          <span>NAME</span><span>KANAL</span><span>DATUM</span><span>NACHRICHT</span><span>STATUS</span>
        </div>
        {entries.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            Noch keine Einträge. Klicke auf &quot;Outreach loggen&quot; um zu starten.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr 1fr', padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>{entry.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                {channelIcons[entry.channel]}
                {entry.channel.charAt(0).toUpperCase() + entry.channel.slice(1)}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{new Date(entry.created_at).toLocaleDateString('de-DE')}</span>
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.message || '—'}</span>
              <select value={entry.status} onChange={(e) => updateStatus(entry.id, e.target.value as Status)}
                style={{ backgroundColor: statusColors[entry.status].bg, color: statusColors[entry.status].color, border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                {Object.entries(statusColors).map(([key, val]) => (
                  <option key={key} value={key} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>{val.label}</option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: 460, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Outreach loggen</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Person oder Account-Name"
                  style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Kanal</label>
                  <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}
                    style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telefon">Telefon</option>
                    <option value="sonstiges">Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                    style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                    <option value="gesendet">Gesendet</option>
                    <option value="beantwortet">Beantwortet</option>
                    <option value="kein_feedback">Kein Feedback</option>
                    <option value="termin">Termin vereinbart</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nachricht / Notiz</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Kurze Notiz..." rows={3}
                  style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <button onClick={addEntry} disabled={saving}
                style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 8 }}>
                {saving ? 'Speichern...' : 'Eintrag speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
