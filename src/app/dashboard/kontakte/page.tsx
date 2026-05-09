'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Upload, Plus, Phone, MessageSquare, ChevronRight, X } from 'lucide-react'
import ClientAnalysis from '@/components/ClientAnalysis'

interface Contact {
  id: string
  name: string
  phone: string | null
  email: string | null
  beruf: string | null
  vg_stage: string | null
  rg_stage: string | null
  einheiten: number | null
  last_contact: string | null
  created_at: string
}

const VG_LABELS: Record<string, { label: string; color: string }> = {
  kundenpotenzial: { label: 'Kundenpotenzial', color: '#6366f1' },
  vorqualifiziert: { label: 'Vorqualifiziert',  color: '#f59e0b' },
  beraten:         { label: 'Beraten',          color: '#06b6d4' },
  abgeschlossen:   { label: 'Abschluss',        color: '#22c55e' },
}
const RG_LABELS: Record<string, { label: string; color: string }> = {
  partnerpotenzial:       { label: 'Partner', color: '#6366f1' },
  vorqualifiziert:        { label: 'Vorq.',   color: '#f59e0b' },
  rekrutierungsgespraech: { label: 'RG',      color: '#8b5cf6' },
  gst:                    { label: 'GST',     color: '#06b6d4' },
  im_team:                { label: 'Im Team', color: '#22c55e' },
}

function avatarColor(name: string) {
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#30D158', '#FF9F0A', '#FF6B6B']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}
function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function formatDE(raw: string): string {
  const d = raw.replace(/\s+/g, '').replace(/[^\d+]/g, '')
  if (d.startsWith('+49')) return d
  if (d.startsWith('0049')) return '+49' + d.slice(4)
  if (d.startsWith('0')) return '+49' + d.slice(1)
  return d
}
function parseVcf(text: string): { name: string; phone: string | null }[] {
  return text.split(/BEGIN:VCARD/i).filter(c => c.trim()).map(card => {
    const get = (key: RegExp) => { const m = card.match(key); return m ? m[1].trim() : null }
    const name  = get(/FN[^:]*:(.+)/i) || get(/N[^:]*:([^;]+)/i) || ''
    const phone = get(/TEL[^:]*:(.+)/i)
    return { name: name.trim(), phone: phone ? formatDE(phone.trim()) : null }
  }).filter(c => c.name)
}

export default function KontaktlistePage() {
  const [contacts, setContacts]     = useState<Contact[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'alle' | 'vg' | 'rg'>('alle')
  const [selected, setSelected]     = useState<Contact | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [importing, setImporting]   = useState(false)
  const [importMsg, setImportMsg]   = useState('')
  const [showAdd, setShowAdd]       = useState(false)
  const [newName, setNewName]       = useState('')
  const [newPhone, setNewPhone]     = useState('')
  const [saving, setSaving]         = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('contacts')
      .select('id,name,phone,email,beruf,vg_stage,rg_stage,einheiten,last_contact,created_at')
      .order('name')
    setContacts((data || []) as Contact[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* ── VCF Import ── */
  async function handleVcf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    setImporting(true); setImportMsg('')
    const text    = await file.text()
    const parsed  = parseVcf(text)
    const existing = new Set(contacts.map(c => c.name.toLowerCase()))
    const newOnes  = parsed.filter(p => p.name && !existing.has(p.name.toLowerCase()))
    if (newOnes.length === 0) { setImportMsg(`Alle ${parsed.length} Kontakte bereits vorhanden.`); setImporting(false); return }
    const { data } = await supabase.from('contacts').insert(
      newOnes.map(p => ({ name: p.name, phone: p.phone }))
    ).select()
    if (data) setContacts(prev => [...prev, ...(data as Contact[])].sort((a, b) => a.name.localeCompare(b.name)))
    setImportMsg(`✅ ${newOnes.length} importiert · ${parsed.length - newOnes.length} Duplikate übersprungen`)
    setImporting(false)
  }

  /* ── Add contact ── */
  async function addContact() {
    if (!newName.trim()) return
    setSaving(true)
    const { data } = await supabase.from('contacts')
      .insert({ name: newName.trim(), phone: newPhone.trim() || null })
      .select().single()
    if (data) setContacts(prev => [...prev, data as Contact].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName(''); setNewPhone(''); setShowAdd(false); setSaving(false)
  }

  /* ── Filtered ── */
  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
    const matchFilter = filter === 'alle' || (filter === 'vg' && c.vg_stage) || (filter === 'rg' && c.rg_stage)
    return matchSearch && matchFilter
  })

  /* ── Group alphabetically ── */
  const grouped: Record<string, Contact[]> = {}
  for (const c of filtered) {
    const letter = c.name[0]?.toUpperCase() || '#'
    if (!grouped[letter]) grouped[letter] = []
    grouped[letter].push(c)
  }
  const letters = Object.keys(grouped).sort()

  const iStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
    borderRadius: 10, fontSize: 15, color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 80px' }}>

      {/* Header */}
      <div style={{ padding: '16px 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>👥 Kontakte</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {loading ? 'Laden…' : `${contacts.length} Kontakte`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <Upload size={14} /> VCF
          </button>
          <button onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', backgroundColor: '#6366f1', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
            <Plus size={14} /> Neu
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".vcf,text/vcard" onChange={handleVcf} style={{ display: 'none' }} />
      </div>

      {importMsg && (
        <div style={{ backgroundColor: '#30D15818', border: '1px solid #30D15840', borderRadius: 12, padding: '10px 14px', marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#30D158', display: 'flex', justifyContent: 'space-between' }}>
          {importMsg}
          <button onClick={() => setImportMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={14} /></button>
        </div>
      )}

      {/* Add contact form */}
      {showAdd && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>NEUEN KONTAKT ANLEGEN</div>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name *"
            style={{ ...iStyle, marginBottom: 8 }} autoFocus />
          <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Telefon (optional)" type="tel"
            style={{ ...iStyle, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowAdd(false); setNewName(''); setNewPhone('') }}
              style={{ flex: 1, padding: '11px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Abbrechen
            </button>
            <button onClick={addContact} disabled={!newName.trim() || saving}
              style={{ flex: 2, padding: '11px', backgroundColor: '#6366f1', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: !newName.trim() ? 0.5 : 1 }}>
              {saving ? 'Speichern…' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name oder Nummer suchen…"
          style={{ ...iStyle, paddingLeft: 38 }} />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['alle', 'Alle'], ['vg', '📈 VG'], ['rg', '🤝 RG']] as const).map(([f, l]) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: filter === f ? '#6366f1' : 'var(--bg-card)', color: filter === f ? '#fff' : 'var(--text-secondary)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {!loading && contacts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Noch keine Kontakte</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Füge deinen ersten Kontakt hinzu oder importiere VCF</div>
          <button onClick={() => setShowAdd(true)}
            style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            + Kontakt anlegen
          </button>
        </div>
      )}

      {/* Alphabetical list */}
      {letters.map(letter => (
        <div key={letter} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', padding: '8px 4px 4px' }}>
            {letter}
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {grouped[letter].map((c, i) => {
              const color = avatarColor(c.name)
              const vg    = c.vg_stage ? VG_LABELS[c.vg_stage] : null
              const rg    = c.rg_stage ? RG_LABELS[c.rg_stage] : null
              return (
                <div key={c.id}
                  onClick={() => { setShowAnalysis(false); setSelected(c) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                    borderBottom: i < grouped[letter].length - 1 ? '0.5px solid var(--border)' : 'none',
                    cursor: 'pointer',
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    backgroundColor: color + '25', color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                      {c.phone && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.phone}</span>}
                      {vg && <span style={{ fontSize: 10, fontWeight: 700, color: vg.color, backgroundColor: vg.color + '18', padding: '1px 6px', borderRadius: 6 }}>{vg.label}</span>}
                      {rg && <span style={{ fontSize: 10, fontWeight: 700, color: rg.color, backgroundColor: rg.color + '18', padding: '1px 6px', borderRadius: 6 }}>{rg.label}</span>}
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--text-tertiary)" />
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* No search results */}
      {!loading && contacts.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: 14 }}>
          Keine Kontakte gefunden für „{search}"
        </div>
      )}

      {/* ── KI-Analyse Modal ── */}
      {showAnalysis && selected && (
        <ClientAnalysis contact={selected} onClose={() => setShowAnalysis(false)} />
      )}

      {/* ── Contact Detail Sheet ── */}
      {selected && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ backgroundColor: '#1C1C1E', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 600, margin: '0 auto', padding: '0 0 44px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, backgroundColor: '#3A3A3C', borderRadius: 2, margin: '12px auto 0' }} />

            {/* Header */}
            <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                backgroundColor: avatarColor(selected.name) + '30', color: avatarColor(selected.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, flexShrink: 0,
              }}>
                {initials(selected.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{selected.name}</div>
                {selected.beruf && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{selected.beruf}</div>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
            </div>

            {/* Actions */}
            {selected.phone && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px 16px' }}>
                <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#30D15820', color: '#30D158', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  <Phone size={16} /> Anrufen
                </a>
                <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f120', color: '#6366f1', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  <MessageSquare size={16} /> WhatsApp
                </a>
              </div>
            )}

            {/* KI-Analyse */}
            <div style={{ padding: '0 20px 14px' }}>
              <button
                onClick={() => setShowAnalysis(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f115', border: '1px solid #6366f130', color: '#6366f1', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                ✨ KI-Analyse
              </button>
            </div>

            {/* Info rows */}
            <div style={{ padding: '0 20px' }}>
              {[
                { label: 'Telefon', val: selected.phone },
                { label: 'E-Mail', val: selected.email },
                { label: 'Beruf', val: selected.beruf },
                { label: 'VG Status', val: selected.vg_stage ? VG_LABELS[selected.vg_stage]?.label : null },
                { label: 'RG Status', val: selected.rg_stage ? RG_LABELS[selected.rg_stage]?.label : null },
                { label: 'Einheiten', val: selected.einheiten ? `${selected.einheiten} E` : null },
                { label: 'Letzter Kontakt', val: selected.last_contact ? new Date(selected.last_contact).toLocaleDateString('de-DE') : null },
              ].filter(r => r.val).map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
