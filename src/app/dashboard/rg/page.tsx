'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, ChevronRight, Loader2, AlertCircle, Users, Pencil, Check, Phone, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RG_STAGES } from '@/lib/ergo'

type RGStage = 'partnerpotenzial' | 'vorqualifiziert' | 'rekrutierungsgespraech' | 'gst' | 'im_team'

interface Partner {
  id: string
  name: string
  beruf: string | null
  phone: string | null
  source: string | null
  stage: string
  rg_stage: string | null
  pipeline: string
  notes: string | null
  created_at: string
  last_contact: string | null
}

const iStyle: React.CSSProperties = { width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }
const lStyle: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 5, fontWeight: 600 }

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function RGPage() {
  const isMobile = useIsMobile()
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Partner | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', beruf: '', phone: '', notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', beruf: '', phone: '', source: 'Instagram', notes: '' })
  const [activeMobileStage, setActiveMobileStage] = useState<string>('partnerpotenzial')

  // Schnelleintrag
  const [qName, setQName] = useState('')
  const [qBeruf, setQBeruf] = useState('')
  const [qSaving, setQSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const berufRef = useRef<HTMLInputElement>(null)

  const loadPartners = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error: err } = await supabase.from('contacts').select('*').not('rg_stage', 'is', null).order('created_at', { ascending: false })
    if (err) setError('Fehler beim Laden: ' + err.message)
    else setPartners((data || []) as Partner[])
    setLoading(false)
  }, [])

  useEffect(() => { loadPartners() }, [loadPartners])

  async function addPartner() {
    if (!form.name.trim()) return
    setSaving(true); setError('')
    const { data, error: err } = await supabase.from('contacts').insert([{
      name: form.name.trim(), beruf: form.beruf.trim() || null,
      phone: form.phone.trim() || null, source: form.source,
      pipeline: 'rg', stage: 'partnerpotenzial', type: 'partner',
      rg_stage: 'partnerpotenzial',
      notes: form.notes.trim() || null,
      last_contact: new Date().toISOString().split('T')[0],
    }]).select().single()
    if (err) setError('Fehler: ' + err.message)
    else if (data) { setPartners(prev => [data as Partner, ...prev]); setShowForm(false); setForm({ name: '', beruf: '', phone: '', source: 'Instagram', notes: '' }) }
    setSaving(false)
  }

  async function quickAdd() {
    if (!qName.trim()) return
    setQSaving(true)
    const { data, error: err } = await supabase.from('contacts').insert([{
      name: qName.trim(), beruf: qBeruf.trim() || null,
      pipeline: 'rg', stage: 'namensliste', type: 'partner',
      source: 'Namensliste', last_contact: new Date().toISOString().split('T')[0],
    }]).select().single()
    if (!err && data) setPartners(prev => [data as Partner, ...prev])
    setQName(''); setQBeruf('')
    setQSaving(false)
    nameRef.current?.focus()
  }

  async function moveStage(id: string, rg_stage: RGStage) {
    const { error: err } = await supabase.from('contacts').update({ rg_stage, stage: rg_stage, last_contact: new Date().toISOString().split('T')[0] }).eq('id', id)
    if (!err) {
      setPartners(prev => prev.map(p => p.id === id ? { ...p, stage: rg_stage, rg_stage } : p))
      setSelected(prev => prev?.id === id ? { ...prev, stage: rg_stage, rg_stage } : prev)
    }
  }

  async function deletePartner(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setPartners(prev => prev.filter(p => p.id !== id))
    setSelected(null)
  }

  function startEdit(p: Partner) {
    setEditForm({ name: p.name, beruf: p.beruf || '', phone: p.phone || '', notes: p.notes || '' })
    setEditing(true)
  }

  async function saveEdit() {
    if (!selected) return
    const updates = { name: editForm.name.trim(), beruf: editForm.beruf.trim() || null, phone: editForm.phone.trim() || null, notes: editForm.notes.trim() || null }
    await supabase.from('contacts').update(updates).eq('id', selected.id)
    const updated = { ...selected, ...updates }
    setPartners(prev => prev.map(p => p.id === selected.id ? updated : p))
    setSelected(updated); setEditing(false)
  }

  const namensliste: Partner[] = []
  const pipeline = partners
  const imTeam = pipeline.filter(p => p.rg_stage === 'im_team')
  const gst = pipeline.filter(p => p.rg_stage === 'gst')

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
      <Loader2 size={20} /><span>Lade RG-Pipeline...</span>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>RG — Rekrutierung</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{pipeline.length} in Pipeline · {namensliste.length} in Namensliste</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> {isMobile ? '' : 'Neuer Partner'}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#ef444420', border: '1px solid #ef444440', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Im Team', value: imTeam.length, color: '#22c55e' },
          { label: 'GST', value: gst.length, color: '#06b6d4' },
          { label: 'Potenziale', value: pipeline.length, color: '#6366f1' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── NAMENSLISTE ── */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14 }}>📋 Namensliste</span>
            <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-secondary)' }}>Potenzielle Partner</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, backgroundColor: '#22c55e20', color: '#22c55e', padding: '3px 10px', borderRadius: 20 }}>{namensliste.length}</span>
        </div>

        {/* Schnelleintrag */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
            <input ref={nameRef} value={qName} onChange={e => setQName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (isMobile ? quickAdd() : berufRef.current?.focus())}
              placeholder="Name *" style={iStyle} />
            {!isMobile && (
              <input ref={berufRef} value={qBeruf} onChange={e => setQBeruf(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && quickAdd()}
                placeholder="Beruf" style={iStyle} />
            )}
            <button onClick={quickAdd} disabled={qSaving || !qName.trim()} style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 16, opacity: !qName.trim() ? 0.5 : 1 }}>+</button>
          </div>
        </div>

        {namensliste.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Noch keine Namen. Einfach oben eintippen.</div>
        ) : (
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {namensliste.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                  {p.beruf && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{p.beruf}</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setSelected(p)} style={{ fontSize: 11, backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--text-secondary)' }}>Details</button>
                  <button onClick={() => moveStage(p.id, 'partnerpotenzial')} style={{ fontSize: 11, backgroundColor: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#22c55e', fontWeight: 600 }}>→ Potenzial</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RG PIPELINE ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 12 }}>RG PIPELINE</div>

      {isMobile ? (
        /* ── Mobile: Stage Tabs + Card List ── */
        <div style={{ marginBottom: 24 }}>
          {/* Stage Tab Bar */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', marginBottom: 14, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
            {RG_STAGES.map(stage => {
              const count = pipeline.filter(p => p.rg_stage === stage.id).length
              return (
                <button key={stage.id} onClick={() => setActiveMobileStage(stage.id)}
                  style={{ flex: 1, minWidth: 'max-content', padding: '8px 10px', border: 'none', borderRadius: 7, cursor: 'pointer', backgroundColor: activeMobileStage === stage.id ? stage.color + '22' : 'transparent', color: activeMobileStage === stage.id ? stage.color : 'var(--text-secondary)', fontSize: 11, fontWeight: activeMobileStage === stage.id ? 700 : 500, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                  {stage.label}
                  <span style={{ marginLeft: 5, fontSize: 10, backgroundColor: activeMobileStage === stage.id ? stage.color + '33' : 'var(--bg-hover)', borderRadius: 10, padding: '1px 5px' }}>{count}</span>
                </button>
              )
            })}
          </div>
          {/* Active Stage Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pipeline.filter(p => p.rg_stage === activeMobileStage).map(p => (
              <div key={p.id} onClick={() => setSelected(p)}
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  {p.beruf && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{p.beruf}</div>}
                </div>
                <ChevronRight size={14} color="var(--text-secondary)" />
              </div>
            ))}
            {pipeline.filter(p => p.rg_stage === activeMobileStage).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: 13, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                Keine Kontakte in dieser Stage
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Desktop Kanban ── */
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, marginBottom: 24 }}>
          {RG_STAGES.map(stage => {
            const sp = pipeline.filter(p => p.rg_stage === stage.id)
            return (
              <div key={stage.id} style={{ minWidth: 180, flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: stage.color }} />
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{stage.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: stage.color + '22', color: stage.color, padding: '2px 6px', borderRadius: 20 }}>{sp.length}</span>
                </div>
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 7, minHeight: 140 }}>
                  {sp.map(p => (
                    <div key={p.id} onClick={() => setSelected(p)} style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 11px', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      {p.beruf && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{p.beruf}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── TEAM ÜBERSICHT ── */}
      {imTeam.length > 0 && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #22c55e44', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users size={16} color="#22c55e" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Mein Team</span>
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, backgroundColor: '#22c55e20', padding: '2px 8px', borderRadius: 20 }}>{imTeam.length} Partner</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {imTeam.map(p => (
              <div key={p.id} onClick={() => setSelected(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', flexShrink: 0 }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{p.beruf || 'Geschäftspartner'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <div style={isMobile
          ? { position: 'fixed', inset: 0, backgroundColor: 'var(--bg-secondary)', overflowY: 'auto', zIndex: 300 }
          : { position: 'fixed', right: 0, top: 0, bottom: 0, width: 380, backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', overflowY: 'auto', zIndex: 50, boxShadow: '-8px 0 32px rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{selected.name}</h2>
                {selected.beruf && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{selected.beruf}</div>}
                {selected.phone && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#3b82f620', borderRadius: 6, padding: '4px 9px', color: '#3b82f6', textDecoration: 'none', fontSize: 11, fontWeight: 600 }}><Phone size={10} />{selected.phone}</a>
                    <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#25D36620', borderRadius: 6, padding: '4px 9px', color: '#25D366', textDecoration: 'none', fontSize: 11, fontWeight: 600 }}><MessageCircle size={10} />WA</a>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => editing ? saveEdit() : startEdit(selected)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: editing ? '#22c55e' : '#22c55e15', color: editing ? '#fff' : '#22c55e', border: `1px solid ${editing ? '#22c55e' : '#22c55e30'}`, borderRadius: 7, padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {editing ? <><Check size={12} /> Speichern</> : <><Pencil size={12} /> Bearbeiten</>}
                </button>
                <button onClick={() => { setSelected(null); setEditing(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}><X size={18} /></button>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {[
                  { label: 'NAME', key: 'name', placeholder: 'Max Mustermann' },
                  { label: 'BERUF', key: 'beruf', placeholder: 'Arzt, Ingenieur…' },
                  { label: 'TELEFON', key: 'phone', placeholder: '+49…' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, letterSpacing: '0.06em' }}>{f.label}</label>
                    <input value={editForm[f.key as keyof typeof editForm]} onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} style={iStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, letterSpacing: '0.06em' }}>NOTIZEN</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} style={{ ...iStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
              </div>
            ) : (
              selected.notes && (
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {selected.notes}
                </div>
              )
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.08em' }}>RG STUFE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {RG_STAGES.map(stage => (
                  <button key={stage.id} onClick={() => moveStage(selected.id, stage.id as RGStage)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: selected.rg_stage === stage.id ? stage.color + '22' : 'var(--bg-hover)', border: `1px solid ${selected.rg_stage === stage.id ? stage.color + '66' : 'var(--border)'}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: selected.rg_stage === stage.id ? stage.color : 'var(--text-secondary)', cursor: 'pointer', fontWeight: selected.rg_stage === stage.id ? 600 : 400 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: stage.color }} />
                      {stage.label}
                    </div>
                    {selected.rg_stage === stage.id && <ChevronRight size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { if (confirm('Wirklich löschen?')) deletePartner(selected.id) }}
              style={{ width: '100%', backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Löschen
            </button>
          </div>
        </div>
      )}

      {/* ── NEUER PARTNER MODAL ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 440, maxWidth: '94vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Neuer Geschäftspartner</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lStyle}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Max Mustermann" style={iStyle} /></div>
                <div><label style={lStyle}>Beruf</label><input value={form.beruf} onChange={e => setForm({ ...form, beruf: e.target.value })} placeholder="Beruf..." style={iStyle} /></div>
              </div>
              <div><label style={lStyle}>Telefon / WhatsApp</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+49 123 456789" style={iStyle} /></div>
              <div>
                <label style={lStyle}>Quelle</label>
                <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={iStyle}>
                  <option>Instagram</option><option>WhatsApp</option><option>Empfehlung</option><option>Event</option><option>Sonstiges</option>
                </select>
              </div>
              {error && <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}
              <button onClick={addPartner} disabled={saving || !form.name.trim()}
                style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !form.name.trim() ? 0.6 : 1 }}>
                {saving ? 'Speichern...' : 'Partner hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
