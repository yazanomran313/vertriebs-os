'use client'

import { useState, useEffect } from 'react'
import { Plus, Phone, MessageSquare, TrendingUp, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Partner {
  id: string
  name: string
  phone: string
  level: string
  termine: number
  abschluesse: number
  status: 'aktiv' | 'inaktiv' | 'neu'
  notes: string
  join_date: string
}

const statusStyles = {
  aktiv: { bg: '#22c55e20', color: '#22c55e', label: 'Aktiv' },
  inaktiv: { bg: '#ef444420', color: '#ef4444', label: 'Inaktiv' },
  neu: { bg: '#6366f120', color: '#6366f1', label: 'Neu' },
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Partner | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', level: 'Junior', notes: '' })

  useEffect(() => {
    loadPartners()
  }, [])

  async function loadPartners() {
    setLoading(true)
    const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false })
    if (data) setPartners(data)
    setLoading(false)
  }

  async function addPartner() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('partners').insert([{
      ...form,
      termine: 0,
      abschluesse: 0,
      status: 'neu',
      join_date: new Date().toISOString().split('T')[0],
    }]).select().single()
    if (data && !error) {
      setPartners([data, ...partners])
      setForm({ name: '', phone: '', level: 'Junior', notes: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function updateCount(id: string, field: 'termine' | 'abschluesse', delta: number) {
    const partner = partners.find((p) => p.id === id)
    if (!partner) return
    const newVal = Math.max(0, partner[field] + delta)
    await supabase.from('partners').update({ [field]: newVal }).eq('id', id)
    setPartners(partners.map((p) => p.id === id ? { ...p, [field]: newVal } : p))
    setSelected((prev) => prev?.id === id ? { ...prev, [field]: newVal } : prev)
  }

  async function toggleStatus(id: string) {
    const partner = partners.find((p) => p.id === id)
    if (!partner) return
    const next = partner.status === 'aktiv' ? 'inaktiv' : 'aktiv'
    await supabase.from('partners').update({ status: next }).eq('id', id)
    setPartners(partners.map((p) => p.id === id ? { ...p, status: next } : p))
    setSelected((prev) => prev?.id === id ? { ...prev, status: next } : prev)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
        <Loader2 size={20} />
        <span>Lade Partner...</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Geschäftspartner</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {partners.filter((p) => p.status === 'aktiv').length} aktiv · {partners.length} gesamt
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> Partner hinzufügen
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Termine gesamt (Team)', value: partners.reduce((s, p) => s + p.termine, 0), color: '#06b6d4' },
          { label: 'Abschlüsse gesamt', value: partners.reduce((s, p) => s + p.abschluesse, 0), color: '#22c55e' },
          { label: 'Konversionsrate', value: partners.reduce((s, p) => s + p.termine, 0) > 0 ? `${Math.round((partners.reduce((s, p) => s + p.abschluesse, 0) / partners.reduce((s, p) => s + p.termine, 0)) * 100)}%` : '0%', color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {partners.length === 0 ? (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
            Noch keine Partner. Füge deinen ersten Geschäftspartner hinzu.
          </div>
        ) : (
          partners.map((partner) => (
            <div key={partner.id} onClick={() => setSelected(partner)}
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                {partner.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{partner.name}</span>
                  <span style={{ fontSize: 10, backgroundColor: statusStyles[partner.status].bg, color: statusStyles[partner.status].color, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                    {statusStyles[partner.status].label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>
                    {partner.level}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Dabei seit {new Date(partner.join_date).toLocaleDateString('de-DE')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#06b6d4' }}>{partner.termine}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Termine</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{partner.abschluesse}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Abschlüsse</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`tel:${partner.phone}`} onClick={(e) => e.stopPropagation()}
                    style={{ backgroundColor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    <Phone size={13} />
                  </a>
                  <a href={`https://wa.me/${partner.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    style={{ backgroundColor: '#6366f120', color: '#6366f1', border: '1px solid #6366f140', borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                    <MessageSquare size={13} />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 340, backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', padding: 28, overflowY: 'auto', zIndex: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selected.name}</h2>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Termine', field: 'termine' as const, value: selected.termine, color: '#06b6d4' },
              { label: 'Abschlüsse', field: 'abschluesse' as const, value: selected.abschluesse, color: '#22c55e' },
            ].map((item) => (
              <div key={item.label} style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>{item.label}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => updateCount(selected.id, item.field, -1)}
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16 }}>−</button>
                  <button onClick={() => updateCount(selected.id, item.field, 1)}
                    style={{ backgroundColor: item.color + '22', border: `1px solid ${item.color}44`, borderRadius: 6, padding: '4px 10px', color: item.color, cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>+</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => toggleStatus(selected.id)}
            style={{ width: '100%', backgroundColor: selected.status === 'aktiv' ? '#ef444420' : '#22c55e20', color: selected.status === 'aktiv' ? '#ef4444' : '#22c55e', border: `1px solid ${selected.status === 'aktiv' ? '#ef444440' : '#22c55e40'}`, borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
            {selected.status === 'aktiv' ? 'Als inaktiv markieren' : 'Als aktiv markieren'}
          </button>
          {selected.notes && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>NOTIZEN</div>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{selected.notes}</p>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Konversion: {selected.termine > 0 ? `${Math.round((selected.abschluesse / selected.termine) * 100)}%` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: 440, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Partner hinzufügen</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Name *', key: 'name', placeholder: 'Max Mustermann' },
                { label: 'Telefon / WhatsApp', key: 'phone', placeholder: '+49 123 456789' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder}
                    style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Level</label>
                <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
                  style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                  <option>Junior</option>
                  <option>Senior</option>
                  <option>Team Leader</option>
                  <option>Manager</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Notizen</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Wie lerntet ihr euch kennen?..."
                  style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <button onClick={addPartner} disabled={saving}
                style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 8 }}>
                {saving ? 'Speichern...' : 'Partner hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
