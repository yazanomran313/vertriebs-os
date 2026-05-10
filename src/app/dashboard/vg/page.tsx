'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, ChevronRight, Loader2, AlertCircle, Pencil, Check, Phone, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { VG_STAGES, calcEinheiten, calcLaufzeit } from '@/lib/ergo'
import ClientAnalysis from '@/components/ClientAnalysis'

type VGStage = 'kundenpotenzial' | 'vorqualifiziert' | 'beraten' | 'abgeschlossen'

interface Contact {
  id: string
  name: string
  beruf: string | null
  phone: string | null
  source: string | null
  stage: string
  vg_stage: string | null
  pipeline: string
  sparsumme: number | null
  alter_jahre: number | null
  einheiten: number | null
  notes: string | null
  created_at: string
  last_contact: string | null
  haushaltsplan: Record<string, number> | null
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

export default function VGPage() {
  const isMobile = useIsMobile()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', beruf: '', phone: '', sparsumme: '', alter_jahre: '', notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', beruf: '', phone: '', source: 'Instagram', sparsumme: '', alter_jahre: '', notes: '' })
  const [activeMobileStage, setActiveMobileStage] = useState<string>('kundenpotenzial')
  const [showAnalysis, setShowAnalysis] = useState(false)

  // Namensliste Schnelleintrag
  const [qName, setQName] = useState('')
  const [qBeruf, setQBeruf] = useState('')
  const [qSparsumme, setQSparsumme] = useState('')
  const [qAlter, setQAlter] = useState('')
  const [qSaving, setQSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const berufRef = useRef<HTMLInputElement>(null)
  const sparRef = useRef<HTMLInputElement>(null)
  const alterRef = useRef<HTMLInputElement>(null)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('contacts')
      .select('*')
      .or('vg_stage.not.is.null,and(stage.eq.namensliste,pipeline.eq.vg)')
      .order('created_at', { ascending: false })
    if (err) setError('Fehler beim Laden: ' + err.message)
    else setContacts((data || []) as Contact[])
    setLoading(false)
  }, [])

  useEffect(() => { loadContacts() }, [loadContacts])

  const preview = (sparsumme: string, alter: string) => {
    const s = parseFloat(sparsumme), a = parseInt(alter)
    return s > 0 && a > 0 && a < 80 ? calcEinheiten(s, a) : null
  }

  async function addDeal() {
    if (!form.name.trim()) return
    setSaving(true); setError('')
    const sp = parseFloat(form.sparsumme) || null
    const al = parseInt(form.alter_jahre) || null
    const { data, error: err } = await supabase.from('contacts').insert([{
      name: form.name.trim(),
      beruf: form.beruf.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source,
      pipeline: 'vg',
      stage: 'kundenpotenzial',
      vg_stage: 'kundenpotenzial',
      type: 'kunde',
      sparsumme: sp,
      alter_jahre: al,
      einheiten: sp && al ? calcEinheiten(sp, al) : null,
      notes: form.notes.trim() || null,
      last_contact: new Date().toISOString().split('T')[0],
    }]).select().single()
    if (err) setError('Fehler: ' + err.message)
    else if (data) {
      setContacts(prev => [data as Contact, ...prev])
      setShowForm(false)
      setForm({ name: '', beruf: '', phone: '', source: 'Instagram', sparsumme: '', alter_jahre: '', notes: '' })
    }
    setSaving(false)
  }

  async function quickAdd() {
    if (!qName.trim()) return
    setQSaving(true)
    const sp = parseFloat(qSparsumme) || null
    const al = parseInt(qAlter) || null
    const { data, error: err } = await supabase.from('contacts').insert([{
      name: qName.trim(),
      beruf: qBeruf.trim() || null,
      pipeline: 'vg',
      stage: 'namensliste',
      type: 'kunde',
      source: 'Namensliste',
      sparsumme: sp,
      alter_jahre: al,
      einheiten: sp && al ? calcEinheiten(sp, al) : null,
      last_contact: new Date().toISOString().split('T')[0],
    }]).select().single()
    if (!err && data) setContacts(prev => [data as Contact, ...prev])
    setQName(''); setQBeruf(''); setQSparsumme(''); setQAlter('')
    setQSaving(false)
    nameRef.current?.focus()
  }

  async function moveStage(id: string, vg_stage: VGStage) {
    const { error: err } = await supabase.from('contacts').update({ vg_stage, stage: vg_stage, last_contact: new Date().toISOString().split('T')[0] }).eq('id', id)
    if (!err) {
      setContacts(prev => prev.map(c => c.id === id ? { ...c, stage: vg_stage, vg_stage } : c))
      setSelected(prev => prev?.id === id ? { ...prev, stage: vg_stage, vg_stage } : prev)
    }
  }

  async function promoteToVG(id: string) {
    await moveStage(id, 'kundenpotenzial')
  }

  async function deleteDeal(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setSelected(null)
  }

  function startEdit(c: Contact) {
    setEditForm({ name: c.name, beruf: c.beruf || '', phone: c.phone || '', sparsumme: c.sparsumme?.toString() || '', alter_jahre: c.alter_jahre?.toString() || '', notes: c.notes || '' })
    setEditing(true)
  }

  async function saveEdit() {
    if (!selected) return
    const sp = parseFloat(editForm.sparsumme) || null
    const al = parseInt(editForm.alter_jahre) || null
    const einheiten = sp && al ? calcEinheiten(sp, al) : null
    const updates = { name: editForm.name.trim(), beruf: editForm.beruf.trim() || null, phone: editForm.phone.trim() || null, sparsumme: sp, alter_jahre: al, einheiten, notes: editForm.notes.trim() || null }
    await supabase.from('contacts').update(updates).eq('id', selected.id)
    const updated = { ...selected, ...updates }
    setContacts(prev => prev.map(c => c.id === selected.id ? updated : c))
    setSelected(updated)
    setEditing(false)
  }

  const namensliste = contacts.filter(c => c.stage === 'namensliste' && !c.vg_stage && c.pipeline === 'vg')
  const pipeline = contacts.filter(c => c.vg_stage !== null)
  const abgE = pipeline.filter(c => c.stage === 'abgeschlossen').reduce((s, c) => s + (c.einheiten || 0), 0)
  const offenE = pipeline.filter(c => c.stage !== 'abgeschlossen').reduce((s, c) => s + (c.einheiten || 0), 0)
  const pv = preview(form.sparsumme, form.alter_jahre)
  const qv = preview(qSparsumme, qAlter)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
      <Loader2 size={20} /><span>Lade VG-Pipeline...</span>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>VG — Kundenverkauf</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pipeline.length} in Pipeline · {namensliste.length} in Namensliste</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={16} /> {isMobile ? '' : 'Neuer Deal'}
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
          { label: 'Abgeschlossen', value: `${abgE.toFixed(1)} E`, color: '#22c55e' },
          { label: 'Offenes Potenzial', value: `${offenE.toFixed(1)} E`, color: '#6366f1' },
          { label: 'Deals aktiv', value: pipeline.length, color: '#06b6d4' },
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
            <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-secondary)' }}>Noch nicht qualifiziert</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, backgroundColor: '#6366f120', color: '#6366f1', padding: '3px 10px', borderRadius: 20 }}>{namensliste.length}</span>
        </div>

        {/* Schnelleintrag */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr auto' : '2fr 1.5fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
            <input ref={nameRef} value={qName} onChange={e => setQName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (isMobile ? quickAdd() : berufRef.current?.focus())}
              placeholder="Name *" style={iStyle} />
            {!isMobile && <>
              <input ref={berufRef} value={qBeruf} onChange={e => setQBeruf(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sparRef.current?.focus()}
                placeholder="Beruf" style={iStyle} />
              <input ref={sparRef} value={qSparsumme} onChange={e => setQSparsumme(e.target.value)} type="number"
                onKeyDown={e => e.key === 'Enter' && alterRef.current?.focus()}
                placeholder="€/Mon" style={iStyle} />
              <input ref={alterRef} value={qAlter} onChange={e => setQAlter(e.target.value)} type="number"
                onKeyDown={e => e.key === 'Enter' && quickAdd()}
                placeholder="Alter" style={iStyle} />
            </>}
            <button onClick={quickAdd} disabled={qSaving || !qName.trim()} style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 16, opacity: !qName.trim() ? 0.5 : 1 }}>+</button>
          </div>
          {qv && <div style={{ marginTop: 8, fontSize: 12, color: '#6366f1', fontWeight: 600 }}>→ {qv} E · {calcLaufzeit(parseInt(qAlter))} Jahre Laufzeit</div>}
        </div>

        {/* Namensliste Kontakte */}
        {namensliste.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            Noch niemanden eingetragen. Trage oben Namen ein — Enter → nächster Name.
          </div>
        ) : (
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {namensliste.map(c => (
              <div key={c.id} onClick={() => setSelected(c)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                  {c.beruf && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{c.beruf}</span>}
                  {c.einheiten && <span style={{ fontSize: 11, color: '#6366f1', marginLeft: 8, fontWeight: 700 }}>{c.einheiten} E</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={e => { e.stopPropagation(); promoteToVG(c.id) }} style={{ fontSize: 11, backgroundColor: '#6366f120', border: '1px solid #6366f140', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#6366f1', fontWeight: 600 }}>→ Potenzial</button>
                  <ChevronRight size={13} color="var(--text-tertiary)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── VG PIPELINE ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 12 }}>VG PIPELINE</div>

      {isMobile ? (
        /* ── Mobile: Stage Tabs + Card List ── */
        <div>
          {/* Stage Tab Bar */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', marginBottom: 14, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
            {VG_STAGES.map(stage => {
              const count = pipeline.filter(c => c.vg_stage === stage.id).length
              return (
                <button key={stage.id} onClick={() => setActiveMobileStage(stage.id)}
                  style={{ flex: 1, minWidth: 'max-content', padding: '8px 12px', border: 'none', borderRadius: 7, cursor: 'pointer', backgroundColor: activeMobileStage === stage.id ? stage.color + '22' : 'transparent', color: activeMobileStage === stage.id ? stage.color : 'var(--text-secondary)', fontSize: 12, fontWeight: activeMobileStage === stage.id ? 700 : 500, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                  {stage.label}
                  <span style={{ marginLeft: 6, fontSize: 11, backgroundColor: activeMobileStage === stage.id ? stage.color + '33' : 'var(--bg-hover)', borderRadius: 10, padding: '1px 6px' }}>{count}</span>
                </button>
              )
            })}
          </div>
          {/* Active Stage Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pipeline.filter(c => c.vg_stage === activeMobileStage).map(c => {
              const stage = VG_STAGES.find(s => s.id === activeMobileStage)
              return (
                <div key={c.id} onClick={() => setSelected(c)}
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    {c.beruf && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.beruf}</div>}
                    {c.einheiten && (
                      <div style={{ marginTop: 5, display: 'inline-flex', backgroundColor: (stage?.color || '#6366f1') + '18', border: `1px solid ${(stage?.color || '#6366f1')}33`, borderRadius: 5, padding: '2px 7px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: stage?.color || '#6366f1' }}>{c.einheiten} E</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={14} color="var(--text-secondary)" />
                </div>
              )
            })}
            {pipeline.filter(c => c.vg_stage === activeMobileStage).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: 13, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                Keine Kontakte in dieser Stage
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Desktop Kanban ── */
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {VG_STAGES.map(stage => {
            const stageContacts = pipeline.filter(c => c.vg_stage === stage.id)
            return (
              <div key={stage.id} style={{ minWidth: 210, flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: stage.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{stage.label}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: stage.color + '22', color: stage.color, padding: '2px 7px', borderRadius: 20 }}>{stageContacts.length}</span>
                </div>
                <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 7, minHeight: 160 }}>
                  {stageContacts.map(c => (
                    <div key={c.id} onClick={() => setSelected(c)} style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                      {c.beruf && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{c.beruf}</div>}
                      {c.einheiten && (
                        <div style={{ marginTop: 5, display: 'inline-flex', backgroundColor: stage.color + '18', border: `1px solid ${stage.color}33`, borderRadius: 5, padding: '2px 7px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>{c.einheiten} E</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── KI-Analyse Modal ── */}
      {showAnalysis && selected && (
        <ClientAnalysis contact={selected} onClose={() => setShowAnalysis(false)} />
      )}

      {/* ── DETAIL PANEL ── */}
      {selected && (
        <div style={isMobile
          ? { position: 'fixed', inset: 0, backgroundColor: 'var(--bg-secondary)', overflowY: 'auto', zIndex: 300, boxShadow: 'none' }
          : { position: 'fixed', right: 0, top: 0, bottom: 0, width: 380, backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', overflowY: 'auto', zIndex: 50, boxShadow: '-8px 0 32px rgba(0,0,0,0.2)' }}>
          {/* Header */}
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
                  style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: editing ? '#22c55e' : '#6366f115', color: editing ? '#fff' : '#6366f1', border: `1px solid ${editing ? '#22c55e' : '#6366f130'}`, borderRadius: 7, padding: '6px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {editing ? <><Check size={12} /> Speichern</> : <><Pencil size={12} /> Bearbeiten</>}
                </button>
                <button onClick={() => { setSelected(null); setEditing(false); setShowAnalysis(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}><X size={18} /></button>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {/* Edit Form */}
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                {[
                  { label: 'NAME', key: 'name', type: 'text', placeholder: 'Max Mustermann' },
                  { label: 'BERUF', key: 'beruf', type: 'text', placeholder: 'Arzt, Ingenieur…' },
                  { label: 'TELEFON', key: 'phone', type: 'text', placeholder: '+49…' },
                  { label: 'SPARSUMME (€/Mon)', key: 'sparsumme', type: 'number', placeholder: '200' },
                  { label: 'ALTER', key: 'alter_jahre', type: 'number', placeholder: '30' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, letterSpacing: '0.06em' }}>{f.label}</label>
                    <input type={f.type} value={editForm[f.key as keyof typeof editForm]} onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} style={iStyle} />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4, letterSpacing: '0.06em' }}>NOTIZEN</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))} rows={3}
                    style={{ ...iStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                {editForm.sparsumme && editForm.alter_jahre && (
                  <div style={{ backgroundColor: '#6366f112', border: '1px solid #6366f130', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                    <span style={{ color: '#6366f1', fontWeight: 700 }}>≈ {calcEinheiten(parseFloat(editForm.sparsumme), parseInt(editForm.alter_jahre))} E</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: 6 }}>· {calcLaufzeit(parseInt(editForm.alter_jahre))} Jahre</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {selected.einheiten && (
                  <div style={{ backgroundColor: '#6366f112', border: '1px solid #6366f130', borderRadius: 10, padding: '14px', marginBottom: 16, textAlign: 'center' }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#6366f1' }}>{selected.einheiten} E</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                      {selected.sparsumme}€/Mon · {selected.alter_jahre ? calcLaufzeit(selected.alter_jahre) : '?'} J Laufzeit
                    </div>
                  </div>
                )}
                {selected.notes && (
                  <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {selected.notes}
                  </div>
                )}
              </>
            )}

            {/* KI-Analyse */}
            <button
              onClick={() => setShowAnalysis(true)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f115', border: '1px solid #6366f130', color: '#6366f1', borderRadius: 10, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
              ✨ KI-Analyse
            </button>

            {/* Stage */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700, letterSpacing: '0.08em' }}>VG STAGE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {VG_STAGES.map(stage => (
                  <button key={stage.id} onClick={() => moveStage(selected.id, stage.id as VGStage)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: selected.vg_stage === stage.id ? stage.color + '22' : 'var(--bg-hover)', border: `1px solid ${selected.vg_stage === stage.id ? stage.color + '66' : 'var(--border)'}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: selected.vg_stage === stage.id ? stage.color : 'var(--text-secondary)', cursor: 'pointer', fontWeight: selected.vg_stage === stage.id ? 600 : 400 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: stage.color }} />
                      {stage.label}
                    </div>
                    {selected.vg_stage === stage.id && <ChevronRight size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { if (confirm('Wirklich löschen?')) deleteDeal(selected.id) }}
              style={{ width: '100%', backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Löschen
            </button>
          </div>
        </div>
      )}

      {/* ── NEUER DEAL MODAL ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Neuer VG Deal</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lStyle}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Max Mustermann" style={iStyle} /></div>
                <div><label style={lStyle}>Beruf</label><input value={form.beruf} onChange={e => setForm({ ...form, beruf: e.target.value })} placeholder="Arzt, Ingenieur..." style={iStyle} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={lStyle}>Sparsumme (€/Monat)</label><input value={form.sparsumme} onChange={e => setForm({ ...form, sparsumme: e.target.value })} type="number" placeholder="200" style={iStyle} /></div>
                <div><label style={lStyle}>Alter</label><input value={form.alter_jahre} onChange={e => setForm({ ...form, alter_jahre: e.target.value })} type="number" placeholder="30" style={iStyle} /></div>
              </div>
              {pv && (
                <div style={{ backgroundColor: '#6366f115', border: '1px solid #6366f130', borderRadius: 8, padding: '10px 14px' }}>
                  <span style={{ fontSize: 14, color: '#6366f1', fontWeight: 700 }}>≈ {pv} Einheiten</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{form.sparsumme}€ × {calcLaufzeit(parseInt(form.alter_jahre))} Jahre × 0,023579</span>
                </div>
              )}
              <div><label style={lStyle}>Telefon / WhatsApp</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+49 123 456789" style={iStyle} /></div>
              <div>
                <label style={lStyle}>Quelle</label>
                <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={iStyle}>
                  <option>Instagram</option><option>WhatsApp</option><option>Empfehlung</option><option>Namensliste</option><option>Event</option><option>Sonstiges</option>
                </select>
              </div>
              <div><label style={lStyle}>Notizen</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Erstkontakt..." style={{ ...iStyle, resize: 'vertical', fontFamily: 'inherit' }} /></div>
              {error && <div style={{ color: '#ef4444', fontSize: 12 }}>{error}</div>}
              <button onClick={addDeal} disabled={saving || !form.name.trim()}
                style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: !form.name.trim() ? 0.6 : 1 }}>
                {saving ? 'Speichern...' : 'Deal hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
