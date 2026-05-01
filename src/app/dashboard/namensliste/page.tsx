'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, Upload, Loader2, AlertCircle, Phone, MessageCircle, FolderPlus, Folder, FolderOpen, Trash2, TrendingUp, Users, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calcEinheiten, calcLaufzeit, VG_STAGES, RG_STAGES } from '@/lib/ergo'

type FilterPipeline = 'alle' | 'vg' | 'rg' | 'offen'
const UNASSIGNED = '__unassigned__'

interface Contact {
  id: string; name: string; beruf: string | null; phone: string | null
  stage: string; pipeline: string
  vg_stage: string | null; rg_stage: string | null
  sparsumme: number | null; alter_jahre: number | null; einheiten: number | null
  folder: string | null; haushaltsplan: Record<string, unknown> | null
  notes: string | null; created_at: string
  dsgvo: Record<string, unknown> | null
}

const EINNAHMEN = [
  { key: 'gehalt',       label: 'Gehalt (netto)' },
  { key: 'nebenjob',     label: 'Nebenjob' },
  { key: 'miete_ein',    label: 'Mieteinnahmen' },
  { key: 'kindergeld',   label: 'Kindergeld' },
  { key: 'sonstige_ein', label: 'Sonstige' },
]
const AUSGABEN = [
  { key: 'wohnen',        label: 'Wohnen / Miete' },
  { key: 'nebenkosten',   label: 'Strom / Gas / Internet' },
  { key: 'auto',          label: 'Auto' },
  { key: 'lebensmittel',  label: 'Lebensmittel' },
  { key: 'handy',         label: 'Handy' },
  { key: 'freizeit',      label: 'Freizeit / Urlaub' },
  { key: 'versicherungen',label: 'Versicherungen (bestehend)' },
  { key: 'kredite',       label: 'Kredite / Darlehen' },
  { key: 'sonstige_aus',  label: 'Sonstige' },
]

const AUFBAU_PRODUKTE = [
  { key: 'private_av', label: 'Private Altersvorsorge' },
  { key: 'kidspolice', label: 'Kidspolice' },
  { key: 'ruerup',     label: 'Rürup' },
  { key: 'bav',        label: 'Betriebliche AV (bAV)' },
]
const SCHUTZ_PRODUKTE = [
  { key: 'immobilien',   label: 'Immobilien' },
  { key: 'pkv',          label: 'PKV Private Krankenversicherung' },
  { key: 'risikoleben',  label: 'Risikolebensversicherung' },
  { key: 'zahn',         label: 'Zahnzusatzversicherung' },
  { key: 'bu',           label: 'Berufsunfähigkeitsversicherung' },
  { key: 'haftpflicht',  label: 'Haftpflichtversicherung' },
  { key: 'rechtsschutz', label: 'Rechtsschutzversicherung' },
  { key: 'hausrat',      label: 'Hausratversicherung' },
  { key: 'auto_vers',    label: 'Autoversicherung' },
]

function formatDE(raw: string): string {
  const d = raw.replace(/[^\d+]/g, '')
  if (!d) return ''
  if (d.startsWith('+49')) return d
  if (d.startsWith('0049')) return '+49' + d.slice(4)
  if (d.startsWith('0')) return '+49' + d.slice(1)
  return '+49' + d
}

const iStyle: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
}

type ProduktAufbau = { active: boolean; beitrag: number }
type Produkte = Record<string, ProduktAufbau | boolean>

// ─── useIsMobile Hook ────────────────────────────────────────────────────────
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

// ─── Haushaltsplan ────────────────────────────────────────────────────────────
function Haushaltsplan({ contact, onSave }: { contact: Contact; onSave: (id: string, hp: Record<string, unknown>) => Promise<void> }) {
  const init = (contact.haushaltsplan || {}) as Record<string, unknown>
  const [hp, setHp] = useState<Record<string, number>>(init as Record<string, number>)
  const [produkte, setProdukte] = useState<Produkte>(() => {
    const p = (init.produkte || {}) as Produkte
    return p
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const data = (contact.haushaltsplan || {}) as Record<string, unknown>
    setHp(data as Record<string, number>)
    setProdukte((data.produkte || {}) as Produkte)
  }, [contact.id])

  const setVal = (k: string, v: string) => setHp(prev => ({ ...prev, [k]: parseFloat(v) || 0 }))

  const getAufbau = (key: string): ProduktAufbau => {
    const p = produkte[key]
    if (p && typeof p === 'object' && 'active' in p) return p as ProduktAufbau
    return { active: false, beitrag: 0 }
  }
  const getSchutz = (key: string): boolean => {
    const p = produkte[key]
    return typeof p === 'boolean' ? p : false
  }

  const setAufbau = (key: string, field: 'active' | 'beitrag', val: boolean | number) => {
    setProdukte(prev => {
      const cur = getAufbau(key)
      return { ...prev, [key]: { ...cur, [field]: val } }
    })
  }
  const setSchutz = (key: string, val: boolean) => {
    setProdukte(prev => ({ ...prev, [key]: val }))
  }

  const sumE = EINNAHMEN.reduce((s, f) => s + (hp[f.key] || 0), 0)
  const sumA = AUSGABEN.reduce((s, f) => s + (hp[f.key] || 0), 0)
  const überschuss = sumE - sumA
  const empfehlung = Math.max(0, Math.round(überschuss * 0.15))

  const aufbauEinheiten = AUFBAU_PRODUKTE.reduce((total, p) => {
    const a = getAufbau(p.key)
    if (a.active && a.beitrag > 0 && contact.alter_jahre) {
      return total + calcEinheiten(a.beitrag, contact.alter_jahre)
    }
    return total
  }, 0)
  const aufbauGesamt = AUFBAU_PRODUKTE.reduce((s, p) => {
    const a = getAufbau(p.key)
    return s + (a.active ? a.beitrag : 0)
  }, 0)

  async function save() {
    setSaving(true)
    await onSave(contact.id, { ...hp, produkte })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const numStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '4px 7px', color: 'var(--text-primary)',
    fontSize: 12, outline: 'none', width: '75px', textAlign: 'right',
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 10 }}>💰 EINNAHMEN & AUSGABEN</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 7 }}>EINNAHMEN</div>
          {EINNAHMEN.map(f => (
            <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{f.label}</span>
              <input type="number" value={hp[f.key] || ''} onChange={e => setVal(f.key, e.target.value)} placeholder="0" style={numStyle} />
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>Gesamt</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>{sumE.toLocaleString('de-DE')} €</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', marginBottom: 7 }}>AUSGABEN</div>
          {AUSGABEN.map(f => (
            <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{f.label}</span>
              <input type="number" value={hp[f.key] || ''} onChange={e => setVal(f.key, e.target.value)} placeholder="0" style={numStyle} />
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 3, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>Gesamt</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>{sumA.toLocaleString('de-DE')} €</span>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: überschuss >= 0 ? '#22c55e12' : '#ef444412', border: `1px solid ${überschuss >= 0 ? '#22c55e33' : '#ef444433'}`, borderRadius: 9, padding: '10px 12px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 12 }}>Überschuss / Monat</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: überschuss >= 0 ? '#22c55e' : '#ef4444' }}>
            {überschuss >= 0 ? '+' : ''}{überschuss.toLocaleString('de-DE')} €
          </span>
        </div>
        {überschuss > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            💡 Empfehlung (15 %): <span style={{ color: '#6366f1', fontWeight: 700 }}>{empfehlung} €/Mon</span>
            {contact.alter_jahre && <span style={{ marginLeft: 5, color: '#6366f1' }}>→ ≈ {calcEinheiten(empfehlung, contact.alter_jahre)} E</span>}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 10 }}>📈 VERMÖGENSAUFBAU</div>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
        {AUFBAU_PRODUKTE.map((p, i) => {
          const a = getAufbau(p.key)
          const e = a.active && a.beitrag > 0 && contact.alter_jahre ? calcEinheiten(a.beitrag, contact.alter_jahre) : null
          return (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < AUFBAU_PRODUKTE.length - 1 ? '1px solid var(--border)' : 'none', backgroundColor: a.active ? '#6366f108' : 'transparent' }}>
              <input type="checkbox" checked={a.active} onChange={e => setAufbau(p.key, 'active', e.target.checked)}
                style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#6366f1' }} />
              <span style={{ flex: 1, fontSize: 12, fontWeight: a.active ? 600 : 400, color: a.active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.label}</span>
              {a.active && (
                <>
                  <input type="number" value={a.beitrag || ''} onChange={ev => setAufbau(p.key, 'beitrag', parseFloat(ev.target.value) || 0)}
                    placeholder="€/Mon" style={{ ...numStyle, width: 65 }} />
                  <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, minWidth: 40, textAlign: 'right' }}>
                    {e ? `${e} E` : '—'}
                  </span>
                </>
              )}
            </div>
          )
        })}
        {aufbauGesamt > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#6366f110', borderTop: '1px solid #6366f133' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>Gesamt Aufbau</span>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginRight: 10 }}>{aufbauGesamt} €/Mon</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>{aufbauEinheiten.toFixed(1)} E</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 10 }}>🛡️ SCHUTZ & ABSICHERUNG</div>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
        {SCHUTZ_PRODUKTE.map((p, i) => {
          const active = getSchutz(p.key)
          return (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < SCHUTZ_PRODUKTE.length - 1 ? '1px solid var(--border)' : 'none', backgroundColor: active ? '#22c55e08' : 'transparent' }}>
              <input type="checkbox" checked={active} onChange={e => setSchutz(p.key, e.target.checked)}
                style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#22c55e' }} />
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{p.label}</span>
              {active && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e', fontWeight: 700 }}>✓ IN PLANUNG</span>}
            </div>
          )
        })}
      </div>

      <button onClick={save} disabled={saving}
        style={{ width: '100%', backgroundColor: saved ? '#22c55e' : '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}>
        {saved ? '✓ Gespeichert' : saving ? 'Speichern…' : 'Alles speichern'}
      </button>
    </div>
  )
}

// ─── DSGVO Tab ────────────────────────────────────────────────────────────────
function DSGVOTab({ contact, onUpdate, onDelete }: {
  contact: Contact
  onUpdate: (id: string, changes: Partial<Contact>) => void
  onDelete: (id: string) => void
}) {
  const dsgvo = (contact.dsgvo || {}) as Record<string, unknown>
  const [einwilligung, setEinwilligung] = useState<boolean>(!!(dsgvo.einwilligung))
  const [einwilligungDatum, setEinwilligungDatum] = useState<string>((dsgvo.einwilligungDatum as string) || '')
  const [whatsapp, setWhatsapp] = useState<boolean>(!!(dsgvo.whatsapp))
  const [email, setEmail] = useState<boolean>(!!(dsgvo.email))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const d = (contact.dsgvo || {}) as Record<string, unknown>
    setEinwilligung(!!(d.einwilligung))
    setEinwilligungDatum((d.einwilligungDatum as string) || '')
    setWhatsapp(!!(d.whatsapp))
    setEmail(!!(d.email))
  }, [contact.id])

  async function save() {
    setSaving(true)
    const data = { einwilligung, einwilligungDatum, whatsapp, email }
    await supabase.from('contacts').update({ dsgvo: data }).eq('id', contact.id)
    onUpdate(contact.id, { dsgvo: data })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const cbStyle: React.CSSProperties = { width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 14 }}>🔒 DSGVO-EINWILLIGUNGEN</div>

      {/* Einwilligung Datenverarbeitung */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: einwilligung ? 10 : 0 }}>
          <input type="checkbox" checked={einwilligung} onChange={e => setEinwilligung(e.target.checked)} style={cbStyle} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Einwilligung zur Datenverarbeitung</span>
          {einwilligung && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e', fontWeight: 700, backgroundColor: '#22c55e20', padding: '2px 7px', borderRadius: 10 }}>AKTIV</span>}
        </div>
        {einwilligung && (
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Datum der Einwilligung</label>
            <input type="date" value={einwilligungDatum} onChange={e => setEinwilligungDatum(e.target.value)} style={{ ...iStyle, fontSize: 12 }} />
          </div>
        )}
      </div>

      {/* WhatsApp */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)} style={cbStyle} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Einwilligung zum Kontakt per WhatsApp</span>
          {whatsapp && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e', fontWeight: 700, backgroundColor: '#22c55e20', padding: '2px 7px', borderRadius: 10 }}>AKTIV</span>}
        </div>
      </div>

      {/* E-Mail */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={email} onChange={e => setEmail(e.target.checked)} style={cbStyle} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Einwilligung per E-Mail</span>
          {email && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e', fontWeight: 700, backgroundColor: '#22c55e20', padding: '2px 7px', borderRadius: 10 }}>AKTIV</span>}
        </div>
      </div>

      <button onClick={save} disabled={saving}
        style={{ width: '100%', backgroundColor: saved ? '#22c55e' : '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 12, transition: 'background 0.2s' }}>
        {saved ? '✓ Gespeichert' : saving ? 'Speichern…' : 'DSGVO-Daten speichern'}
      </button>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 8, letterSpacing: '0.06em' }}>DATENLÖSCHUNG (ART. 17 DSGVO)</div>
        <button onClick={() => {
          if (confirm('Dieser Kontakt und alle seine Daten werden unwiderruflich gelöscht.\n\nWirklich fortfahren?')) {
            onDelete(contact.id)
          }
        }}
          style={{ width: '100%', backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          🗑️ Kontakt löschen (Art. 17 DSGVO)
        </button>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Auf Verlangen der betroffenen Person werden alle gespeicherten Daten unwiderruflich gelöscht.
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ contact, onClose, onUpdate, onDelete, isMobile }: {
  contact: Contact
  onClose: () => void
  onUpdate: (id: string, changes: Partial<Contact>) => void
  onDelete: (id: string) => void
  isMobile: boolean
}) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'haushaltsplan' | 'dsgvo'>('pipeline')
  const [savingVG, setSavingVG] = useState(false)
  const [savingRG, setSavingRG] = useState(false)
  const [editNotes, setEditNotes] = useState(contact.notes || '')

  useEffect(() => {
    setEditNotes(contact.notes || '')
  }, [contact.id])

  async function toggleVG() {
    setSavingVG(true)
    const newStage = contact.vg_stage ? null : 'kundenpotenzial'
    await supabase.from('contacts').update({ vg_stage: newStage }).eq('id', contact.id)
    onUpdate(contact.id, { vg_stage: newStage })
    setSavingVG(false)
  }

  async function toggleRG() {
    setSavingRG(true)
    const newStage = contact.rg_stage ? null : 'partnerpotenzial'
    await supabase.from('contacts').update({ rg_stage: newStage }).eq('id', contact.id)
    onUpdate(contact.id, { rg_stage: newStage })
    setSavingRG(false)
  }

  async function setVGStage(stage: string) {
    await supabase.from('contacts').update({ vg_stage: stage }).eq('id', contact.id)
    onUpdate(contact.id, { vg_stage: stage })
  }

  async function setRGStage(stage: string) {
    await supabase.from('contacts').update({ rg_stage: stage }).eq('id', contact.id)
    onUpdate(contact.id, { rg_stage: stage })
  }

  async function saveHP(id: string, hp: Record<string, unknown>) {
    await supabase.from('contacts').update({ haushaltsplan: hp }).eq('id', id)
    onUpdate(id, { haushaltsplan: hp })
  }

  async function saveNotes() {
    await supabase.from('contacts').update({ notes: editNotes }).eq('id', contact.id)
    onUpdate(contact.id, { notes: editNotes })
  }

  const panelStyle: React.CSSProperties = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 300, backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
    : { position: 'fixed', right: 0, top: 0, bottom: 0, width: 440, backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: '-8px 0 32px rgba(0,0,0,0.3)' }

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{contact.name}</h2>
            {contact.beruf && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{contact.beruf}</div>}
            {contact.phone && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <a href={`tel:${contact.phone}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#3b82f620', borderRadius: 6, padding: '4px 10px', color: '#3b82f6', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                  <Phone size={12} /> {contact.phone}
                </a>
                <a href={`https://wa.me/${contact.phone.replace(/\+/g, '')}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#22c55e20', borderRadius: 6, padding: '4px 10px', color: '#22c55e', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                  <MessageCircle size={12} /> WhatsApp
                </a>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, backgroundColor: 'var(--bg-hover)', borderRadius: 8, padding: 3 }}>
          {[
            { id: 'pipeline', label: '📊 Pipeline' },
            { id: 'dsgvo', label: '🔒 DSGVO' },
            { id: 'haushaltsplan', label: '💰 Haushalt' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
              style={{ flex: 1, padding: '7px 6px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', backgroundColor: activeTab === t.id ? 'var(--bg-card)' : 'transparent', color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {activeTab === 'pipeline' && (
          <div>
            {/* VG Section */}
            <div style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${contact.vg_stage ? '#6366f144' : 'var(--border)'}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: contact.vg_stage ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={15} color={contact.vg_stage ? '#6366f1' : 'var(--text-secondary)'} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: contact.vg_stage ? '#6366f1' : 'var(--text-primary)' }}>VG — Kundenverkauf</span>
                  {contact.vg_stage && (
                    <span style={{ fontSize: 10, backgroundColor: '#6366f120', color: '#6366f1', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>AKTIV</span>
                  )}
                </div>
                <button onClick={toggleVG} disabled={savingVG}
                  style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: contact.vg_stage ? '#ef444420' : '#6366f1', color: contact.vg_stage ? '#ef4444' : '#fff', transition: 'all 0.15s' }}>
                  {savingVG ? '…' : contact.vg_stage ? 'Entfernen' : 'Zuweisen'}
                </button>
              </div>

              {contact.vg_stage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {VG_STAGES.map(s => (
                    <button key={s.id} onClick={() => setVGStage(s.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: contact.vg_stage === s.id ? s.color + '20' : 'var(--bg-hover)', border: `1px solid ${contact.vg_stage === s.id ? s.color + '55' : 'var(--border)'}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: contact.vg_stage === s.id ? s.color : 'var(--text-secondary)', fontWeight: contact.vg_stage === s.id ? 700 : 400, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.color }} />
                        {s.label}
                      </div>
                      {contact.vg_stage === s.id && <ChevronRight size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RG Section */}
            <div style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${contact.rg_stage ? '#22c55e44' : 'var(--border)'}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: contact.rg_stage ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={15} color={contact.rg_stage ? '#22c55e' : 'var(--text-secondary)'} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: contact.rg_stage ? '#22c55e' : 'var(--text-primary)' }}>RG — Rekrutierung</span>
                  {contact.rg_stage && (
                    <span style={{ fontSize: 10, backgroundColor: '#22c55e20', color: '#22c55e', borderRadius: 10, padding: '2px 7px', fontWeight: 700 }}>AKTIV</span>
                  )}
                </div>
                <button onClick={toggleRG} disabled={savingRG}
                  style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', backgroundColor: contact.rg_stage ? '#ef444420' : '#22c55e', color: contact.rg_stage ? '#ef4444' : '#fff', transition: 'all 0.15s' }}>
                  {savingRG ? '…' : contact.rg_stage ? 'Entfernen' : 'Zuweisen'}
                </button>
              </div>

              {contact.rg_stage && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {RG_STAGES.map(s => (
                    <button key={s.id} onClick={() => setRGStage(s.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: contact.rg_stage === s.id ? s.color + '20' : 'var(--bg-hover)', border: `1px solid ${contact.rg_stage === s.id ? s.color + '55' : 'var(--border)'}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: contact.rg_stage === s.id ? s.color : 'var(--text-secondary)', fontWeight: contact.rg_stage === s.id ? 700 : 400, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.color }} />
                        {s.label}
                      </div>
                      {contact.rg_stage === s.id && <ChevronRight size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Einheiten */}
            {contact.einheiten && (
              <div style={{ backgroundColor: '#6366f112', border: '1px solid #6366f130', borderRadius: 10, padding: '12px 14px', marginBottom: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#6366f1' }}>{contact.einheiten} E</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {contact.sparsumme}€/Mon · {contact.alter_jahre ? calcLaufzeit(contact.alter_jahre) : '?'} Jahre Laufzeit
                </div>
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.06em' }}>NOTIZEN</div>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} onBlur={saveNotes}
                rows={3} placeholder="Notizen zum Kontakt…"
                style={{ ...iStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
            </div>

            {/* Delete */}
            <button onClick={() => { if (confirm('Kontakt wirklich löschen?')) onDelete(contact.id) }}
              style={{ width: '100%', backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Kontakt löschen
            </button>
          </div>
        )}

        {activeTab === 'dsgvo' && (
          <DSGVOTab contact={contact} onUpdate={onUpdate} onDelete={onDelete} />
        )}

        {activeTab === 'haushaltsplan' && (
          <Haushaltsplan contact={contact} onSave={saveHP} />
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NamenslistePage() {
  const isMobile = useIsMobile()
  const [contacts, setContacts]       = useState<Contact[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [pipeFilter, setPipeFilter]   = useState<FilterPipeline>('alle')
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<Contact | null>(null)
  const [showImport, setShowImport]   = useState(false)
  const [importText, setImportText]   = useState('')
  const [importing, setImporting]     = useState(false)
  const [importTab, setImportTab]     = useState<'text' | 'vcf'>('vcf')
  const [vcfPreview, setVcfPreview]   = useState<{name:string;phone:string|null;beruf:string|null}[]>([])

  // Folders
  const [folders, setFolders]               = useState<string[]>([])
  const [activeFolder, setActiveFolder]     = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder]   = useState(false)
  const [newFolderName, setNewFolderName]   = useState('')
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)

  // Quick entry
  const [qName, setQName]         = useState('')
  const [qBeruf, setQBeruf]       = useState('')
  const [qPhone, setQPhone]       = useState('')
  const [qSparsumme, setQSpar]    = useState('')
  const [qAlter, setQAlter]       = useState('')
  const [qPipeline, setQPipeline] = useState<'vg' | 'rg' | 'offen'>('offen')
  const [qSaving, setQSaving]     = useState(false)
  const nameRef  = useRef<HTMLInputElement>(null)
  const berufRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const sparRef  = useRef<HTMLInputElement>(null)
  const alterRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error: err } = await supabase
      .from('contacts').select('*').order('created_at', { ascending: false })
    if (err) { setError(err.message) }
    else {
      const list = (data || []) as Contact[]
      setContacts(list)
      setFolders(Array.from(new Set(list.map(c => c.folder).filter(Boolean))) as string[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (selected) {
      const updated = contacts.find(c => c.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [contacts])

  function updateContact(id: string, changes: Partial<Contact>) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))
  }

  const filtered = contacts.filter(c => {
    const matchFolder = activeFolder === null ? true
      : activeFolder === UNASSIGNED ? !c.folder
      : c.folder === activeFolder
    const matchPipe = pipeFilter === 'alle' ? true
      : pipeFilter === 'vg' ? !!c.vg_stage
      : pipeFilter === 'rg' ? !!c.rg_stage
      : (!c.vg_stage && !c.rg_stage)
    const matchSearch = !search
      || c.name.toLowerCase().includes(search.toLowerCase())
      || (c.beruf || '').toLowerCase().includes(search.toLowerCase())
    return matchFolder && matchPipe && matchSearch
  })

  async function quickAdd() {
    if (!qName.trim()) return
    setQSaving(true)
    const sp = parseFloat(qSparsumme) || null
    const al = parseInt(qAlter) || null
    const phone = qPhone.trim() ? formatDE(qPhone.trim()) : null
    const folder = activeFolder && activeFolder !== UNASSIGNED ? activeFolder : null
    const vg_stage = qPipeline === 'vg' ? 'kundenpotenzial' : null
    const rg_stage = qPipeline === 'rg' ? 'partnerpotenzial' : null
    const { data, error: err } = await supabase.from('contacts').insert([{
      name: qName.trim(), beruf: qBeruf.trim() || null, phone, folder,
      pipeline: qPipeline === 'offen' ? 'vg' : qPipeline,
      stage: 'namensliste', type: 'kunde', source: 'Namensliste',
      sparsumme: sp, alter_jahre: al,
      einheiten: sp && al ? calcEinheiten(sp, al) : null,
      vg_stage, rg_stage,
      last_contact: new Date().toISOString().split('T')[0],
    }]).select().single()
    if (err) { setError('Speichern fehlgeschlagen: ' + err.message); setQSaving(false); return }
    if (data) setContacts(prev => [data as Contact, ...prev])
    setQName(''); setQBeruf(''); setQPhone(''); setQSpar(''); setQAlter('')
    setQSaving(false); nameRef.current?.focus()
  }

  async function deleteContact(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setSelected(null)
  }

  async function assignFolder(id: string, folder: string | null) {
    await supabase.from('contacts').update({ folder }).eq('id', id)
    setContacts(prev => prev.map(c => c.id === id ? { ...c, folder } : c))
  }

  async function deleteFolder(name: string) {
    if (!confirm(`Ordner "${name}" löschen?`)) return
    await supabase.from('contacts').update({ folder: null }).eq('folder', name)
    setContacts(prev => prev.map(c => c.folder === name ? { ...c, folder: null } : c))
    setFolders(prev => prev.filter(f => f !== name))
    if (activeFolder === name) setActiveFolder(null)
  }

  function createFolder() {
    const name = newFolderName.trim()
    if (!name || folders.includes(name)) return
    setFolders(prev => [...prev, name])
    setActiveFolder(name)
    setNewFolderName('')
    setShowNewFolder(false)
  }

  function parseVcf(text: string) {
    const cards = text.split(/BEGIN:VCARD/i).filter(c => c.trim())
    return cards.map(card => {
      const get = (key: RegExp) => {
        const m = card.match(key)
        return m ? m[1].trim().replace(/\\n/g, ' ').replace(/\\,/g, ',') : null
      }
      const name   = get(/FN[^:]*:(.+)/i) || get(/N[^:]*:([^;]+)/i) || ''
      const phone  = get(/TEL[^:]*:(.+)/i)
      const beruf  = get(/TITLE[^:]*:(.+)/i) || get(/ORG[^:]*:(.+)/i)
      return { name: name.trim(), phone: phone ? formatDE(phone.trim()) : null, beruf: beruf?.trim() || null }
    }).filter(c => c.name)
  }

  function handleVcfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setVcfPreview(parseVcf(text))
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function importVcf() {
    if (!vcfPreview.length) return
    setImporting(true)
    const folder = activeFolder && activeFolder !== UNASSIGNED ? activeFolder : null
    const rows = vcfPreview.map(c => ({
      name: c.name, beruf: c.beruf, phone: c.phone, folder,
      pipeline: 'vg', stage: 'namensliste', type: 'kunde', source: 'Import',
      last_contact: new Date().toISOString().split('T')[0],
    }))
    const { data } = await supabase.from('contacts').insert(rows).select()
    if (data) setContacts(prev => [...(data as Contact[]), ...prev])
    setVcfPreview([]); setShowImport(false); setImporting(false)
  }

  async function importNames() {
    if (!importText.trim()) return
    setImporting(true)
    const folder = activeFolder && activeFolder !== UNASSIGNED ? activeFolder : null
    const rows = importText.trim().split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split(/[,;|\t]/).map(p => p.trim())
      const name = parts[0] || ''
      const beruf = parts[1] || null
      let phone: string | null = null, sp: number | null = null, al: number | null = null
      for (let i = 2; i < parts.length; i++) {
        const p = parts[i]
        if (/^[0+]/.test(p) && p.replace(/\D/g, '').length >= 7) phone = formatDE(p)
        else if (/^\d{1,3}$/.test(p)) al = parseInt(p)
        else if (/^\d{2,6}$/.test(p)) sp = parseFloat(p) || null
      }
      return { name, beruf, phone, folder, pipeline: 'vg', stage: 'namensliste', type: 'kunde', source: 'Import', sparsumme: sp, alter_jahre: al, einheiten: sp && al ? calcEinheiten(sp, al) : null, last_contact: new Date().toISOString().split('T')[0] }
    }).filter(r => r.name)
    const { data } = await supabase.from('contacts').insert(rows).select()
    if (data) setContacts(prev => [...(data as Contact[]), ...prev])
    setImportText(''); setShowImport(false); setImporting(false)
  }

  const qPreview = qSparsumme && qAlter ? calcEinheiten(parseFloat(qSparsumme), parseInt(qAlter)) : null
  const vgCount  = contacts.filter(c => !!c.vg_stage).length
  const rgCount  = contacts.filter(c => !!c.rg_stage).length
  const offenCount = contacts.filter(c => !c.vg_stage && !c.rg_stage).length

  const activeFolderLabel = activeFolder === null ? 'Alle Kontakte' : activeFolder === UNASSIGNED ? 'Ohne Ordner' : activeFolder

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 80px)' }}>

      {/* ── Folder Sidebar (Desktop only) ───────────────────────────── */}
      {!isMobile && (
        <div style={{ width: 190, flexShrink: 0, borderRight: '1px solid var(--border)', paddingRight: 14, marginRight: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: 10 }}>ORDNER</div>

          <FolderBtn label="Alle Kontakte" count={contacts.length} active={activeFolder === null} icon={<FolderOpen size={13} />} onClick={() => setActiveFolder(null)} />
          {contacts.some(c => !c.folder) && (
            <FolderBtn label="Nicht zugewiesen" count={contacts.filter(c => !c.folder).length} active={activeFolder === UNASSIGNED} icon={<Folder size={13} />} onClick={() => setActiveFolder(UNASSIGNED)} />
          )}

          {folders.length > 0 && <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }} />}
          {folders.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FolderBtn label={f} count={contacts.filter(c => c.folder === f).length} active={activeFolder === f} icon={<Folder size={13} />} onClick={() => setActiveFolder(f)} style={{ flex: 1 }} />
              <button onClick={() => deleteFolder(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, opacity: 0.5 }}><Trash2 size={11} /></button>
            </div>
          ))}

          {showNewFolder ? (
            <div style={{ marginTop: 8 }}>
              <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
                placeholder="Name…" style={{ ...iStyle, fontSize: 12, padding: '6px 9px' }} />
              <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
                <button onClick={createFolder} style={{ flex: 1, backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '5px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                <button onClick={() => setShowNewFolder(false)} style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', fontSize: 11, cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewFolder(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginTop: 10, backgroundColor: 'transparent', border: '1px dashed var(--border)', borderRadius: 7, padding: '7px 9px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
              <FolderPlus size={12} /> Neuer Ordner
            </button>
          )}
        </div>
      )}

      {/* ── Main ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: selected && !isMobile ? 460 : 0, transition: 'padding 0.2s' }}>

        {/* Mobile: Folder Dropdown */}
        {isMobile && (
          <div style={{ marginBottom: 12, position: 'relative' }}>
            <button
              onClick={() => setShowFolderDropdown(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
              <Folder size={14} />
              <span style={{ flex: 1, textAlign: 'left' }}>{activeFolderLabel}</span>
              <ChevronRight size={14} style={{ transform: showFolderDropdown ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {showFolderDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                {[
                  { key: null, label: 'Alle Kontakte', count: contacts.length },
                  ...(contacts.some(c => !c.folder) ? [{ key: UNASSIGNED, label: 'Ohne Ordner', count: contacts.filter(c => !c.folder).length }] : []),
                  ...folders.map(f => ({ key: f, label: f, count: contacts.filter(c => c.folder === f).length })),
                ].map(item => (
                  <button key={item.key ?? '__all'} onClick={() => { setActiveFolder(item.key); setShowFolderDropdown(false) }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid var(--border)', backgroundColor: activeFolder === item.key ? '#6366f115' : 'transparent', color: activeFolder === item.key ? '#6366f1' : 'var(--text-primary)', fontSize: 13, cursor: 'pointer', fontWeight: activeFolder === item.key ? 700 : 400 }}>
                    <span>{item.label}</span>
                    <span style={{ fontSize: 11, backgroundColor: 'var(--bg-hover)', borderRadius: 10, padding: '1px 7px' }}>{item.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, margin: 0 }}>
              {activeFolder === null ? '📋 Namensliste' : activeFolder === UNASSIGNED ? '📂 Ohne Ordner' : `📁 ${activeFolder}`}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 3 }}>
              {contacts.length} gesamt · <span style={{ color: '#6b7280' }}>{offenCount} offen</span> · <span style={{ color: '#6366f1' }}>{vgCount} VG</span> · <span style={{ color: '#22c55e' }}>{rgCount} RG</span>
            </p>
          </div>
          <button onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Upload size={13} /> {isMobile ? '' : 'Import'}
          </button>
        </div>

        {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#ef444420', border: '1px solid #ef444440', borderRadius: 8, padding: '9px 13px', marginBottom: 12, color: '#ef4444', fontSize: 13 }}><AlertCircle size={13} />{error}</div>}

        {/* Quick Entry */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 11, padding: 13, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 9, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>⚡ SCHNELLEINTRAG</div>
          {isMobile ? (
            /* Mobile: only Name + Pipeline + Add */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 6, alignItems: 'center' }}>
              <input ref={nameRef} value={qName} onChange={e => setQName(e.target.value)} onKeyDown={e => e.key === 'Enter' && quickAdd()} placeholder="Name *" style={iStyle} />
              <select value={qPipeline} onChange={e => setQPipeline(e.target.value as typeof qPipeline)}
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 6px', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}>
                <option value="offen">Offen</option>
                <option value="vg">VG</option>
                <option value="rg">RG</option>
              </select>
              <button onClick={quickAdd} disabled={qSaving || !qName.trim()}
                style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 13px', fontWeight: 700, cursor: 'pointer', fontSize: 17, opacity: !qName.trim() ? 0.5 : 1 }}>+</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 0.7fr 0.7fr auto auto', gap: 6, alignItems: 'center' }}>
              <input ref={nameRef} value={qName} onChange={e => setQName(e.target.value)} onKeyDown={e => e.key === 'Enter' && berufRef.current?.focus()} placeholder="Name *" style={iStyle} />
              <input ref={berufRef} value={qBeruf} onChange={e => setQBeruf(e.target.value)} onKeyDown={e => e.key === 'Enter' && phoneRef.current?.focus()} placeholder="Beruf" style={iStyle} />
              <input ref={phoneRef} value={qPhone} onChange={e => setQPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && sparRef.current?.focus()} onBlur={e => setQPhone(e.target.value.trim() ? formatDE(e.target.value.trim()) : '')} placeholder="Telefon" style={iStyle} />
              <input ref={sparRef} value={qSparsumme} onChange={e => setQSpar(e.target.value)} type="number" onKeyDown={e => e.key === 'Enter' && alterRef.current?.focus()} placeholder="€/Mon" style={iStyle} />
              <input ref={alterRef} value={qAlter} onChange={e => setQAlter(e.target.value)} type="number" onKeyDown={e => e.key === 'Enter' && quickAdd()} placeholder="Alter" style={iStyle} />
              <select value={qPipeline} onChange={e => setQPipeline(e.target.value as typeof qPipeline)}
                style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 6px', color: 'var(--text-primary)', fontSize: 12, outline: 'none' }}>
                <option value="offen">Offen</option>
                <option value="vg">VG</option>
                <option value="rg">RG</option>
              </select>
              <button onClick={quickAdd} disabled={qSaving || !qName.trim()}
                style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 13px', fontWeight: 700, cursor: 'pointer', fontSize: 17, opacity: !qName.trim() ? 0.5 : 1 }}>+</button>
            </div>
          )}
          {qPreview && <div style={{ marginTop: 7, fontSize: 12, color: '#6366f1', fontWeight: 600 }}>→ ≈ {qPreview} E · {calcLaufzeit(parseInt(qAlter))} Jahre</div>}
        </div>

        {/* Filter + Search */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : 'auto' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen…" style={{ ...iStyle, paddingLeft: 30 }} />
          </div>
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {([['alle', 'Alle'], ['offen', 'Offen'], ['vg', 'VG'], ['rg', 'RG']] as [FilterPipeline, string][]).map(([f, l]) => (
              <button key={f} onClick={() => setPipeFilter(f)}
                style={{ padding: isMobile ? '8px 10px' : '8px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: pipeFilter === f ? 'var(--accent)' : 'transparent', color: pipeFilter === f ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--text-secondary)' }}><Loader2 size={17} /> Lade…</div>
        ) : filtered.length === 0 ? (
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 11, padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>Keine Kontakte</div>
            <div style={{ fontSize: 13 }}>Oben eintragen oder importieren.</div>
          </div>
        ) : isMobile ? (
          /* ── Mobile Card Layout ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(c => {
              const isSelected = selected?.id === c.id
              return (
                <div key={c.id} onClick={() => setSelected(isSelected ? null : c)}
                  style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${isSelected ? '#6366f1' : 'var(--border)'}`, borderRadius: 11, padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.name}
                      {c.einheiten && <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>{c.einheiten} E</span>}
                    </div>
                    {c.beruf && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.beruf}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!c.vg_stage && !c.rg_stage && (
                        <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#6b728020', color: '#6b7280', padding: '2px 7px', borderRadius: 20 }}>Offen</span>
                      )}
                      {c.vg_stage && (
                        <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#6366f120', color: '#6366f1', padding: '2px 7px', borderRadius: 20 }}>VG</span>
                      )}
                      {c.rg_stage && (
                        <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#22c55e20', color: '#22c55e', padding: '2px 7px', borderRadius: 20 }}>RG</span>
                      )}
                    </div>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', backgroundColor: '#3b82f620', borderRadius: 6, color: '#3b82f6', textDecoration: 'none', fontSize: 11, fontWeight: 600 }}>
                        <Phone size={11} />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Desktop Grid Layout ── */
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 11, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.4fr 1fr 1fr auto', padding: '9px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
              <span>NAME</span><span>BERUF</span><span>TELEFON</span><span>PIPELINE</span><span>ORDNER</span><span></span>
            </div>

            {filtered.map(c => {
              const isSelected = selected?.id === c.id
              return (
                <div key={c.id} onClick={() => setSelected(isSelected ? null : c)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.4fr 1fr 1fr auto', padding: '11px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center', fontSize: 13, cursor: 'pointer', backgroundColor: isSelected ? '#6366f108' : 'transparent', transition: 'background 0.1s' }}>

                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                    {c.einheiten && <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, marginLeft: 7 }}>{c.einheiten} E</span>}
                    {c.haushaltsplan && <span style={{ fontSize: 10, color: '#22c55e', marginLeft: 5 }}>📊</span>}
                  </div>

                  <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.beruf || '—'}</span>

                  <div onClick={e => e.stopPropagation()}>
                    {c.phone ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.phone}</span>
                        <a href={`tel:${c.phone}`} style={{ display: 'flex', padding: '2px 4px', backgroundColor: '#3b82f620', borderRadius: 4, color: '#3b82f6', textDecoration: 'none' }}><Phone size={9} /></a>
                        <a href={`https://wa.me/${c.phone.replace(/\+/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', padding: '2px 4px', backgroundColor: '#22c55e20', borderRadius: 4, color: '#22c55e', textDecoration: 'none' }}><MessageCircle size={9} /></a>
                      </div>
                    ) : <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>—</span>}
                  </div>

                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {!c.vg_stage && !c.rg_stage && (
                      <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#6b728020', color: '#6b7280', padding: '2px 7px', borderRadius: 20 }}>Offen</span>
                    )}
                    {c.vg_stage && (
                      <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#6366f120', color: '#6366f1', padding: '2px 7px', borderRadius: 20 }}>VG</span>
                    )}
                    {c.rg_stage && (
                      <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#22c55e20', color: '#22c55e', padding: '2px 7px', borderRadius: 20 }}>RG</span>
                    )}
                  </div>

                  <div onClick={e => e.stopPropagation()}>
                    <select value={c.folder || ''} onChange={e => assignFolder(c.id, e.target.value || null)}
                      style={{ backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 5px', fontSize: 11, color: c.folder ? '#6366f1' : 'var(--text-secondary)', outline: 'none', maxWidth: 100 }}>
                      <option value="">Kein Ordner</option>
                      {folders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <ChevronRight size={14} color={isSelected ? '#6366f1' : 'var(--text-secondary)'} style={{ transform: isSelected ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Detail Panel ──────────────────────────────────────────── */}
      {selected && (
        <DetailPanel
          contact={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateContact}
          onDelete={deleteContact}
          isMobile={isMobile}
        />
      )}

      {/* ── Import Modal ──────────────────────────────────────────── */}
      {showImport && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
          onClick={e => e.target === e.currentTarget && (setShowImport(false), setVcfPreview([]))}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 26, width: 560, maxWidth: '94vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📥 Kontakte importieren</h2>
              <button onClick={() => { setShowImport(false); setVcfPreview([]) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', backgroundColor: 'var(--bg-hover)', borderRadius: 9, padding: 3, marginBottom: 16, gap: 3 }}>
              {(['vcf', 'text'] as const).map(t => (
                <button key={t} onClick={() => { setImportTab(t); setVcfPreview([]) }}
                  style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', backgroundColor: importTab === t ? 'var(--bg-card)' : 'transparent', color: importTab === t ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {t === 'vcf' ? '📱 iOS / Mac / Android (.vcf)' : '📋 Text-Liste'}
                </button>
              ))}
            </div>

            {importTab === 'vcf' ? (
              <div>
                <div style={{ backgroundColor: '#6366f110', border: '1px solid #6366f130', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: '#6366f1' }}>So exportierst du deine Kontakte:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 10 }}>
                    {[
                      { os: '🍎 iPhone', steps: 'Kontakte App → Kontakt → Teilen → AirDrop/Datei → .vcf' },
                      { os: '🖥 Mac', steps: 'Kontakte App → Auswählen → Ablage → Exportieren → vCard' },
                      { os: '🤖 Android', steps: 'Kontakte App → Menü → Import/Export → Als .vcf exportieren' },
                    ].map(p => (
                      <div key={p.os}>
                        <div style={{ fontWeight: 700, marginBottom: 3 }}>{p.os}</div>
                        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{p.steps}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {vcfPreview.length === 0 ? (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: 10, padding: '32px', cursor: 'pointer', gap: 10 }}>
                    <div style={{ fontSize: 36 }}>📂</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>.vcf Datei auswählen</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Klick hier oder Datei hierher ziehen</div>
                    <input type="file" accept=".vcf,text/vcard" onChange={handleVcfFile} style={{ display: 'none' }} />
                  </label>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#22c55e' }}>✅ {vcfPreview.length} Kontakte erkannt</div>
                    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                      {vcfPreview.slice(0, 50).map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                          <span style={{ fontWeight: 600, flex: 1 }}>{c.name}</span>
                          {c.phone && <span style={{ color: '#22c55e' }}>📞 {c.phone}</span>}
                          {c.beruf && <span style={{ color: 'var(--text-secondary)' }}>{c.beruf}</span>}
                        </div>
                      ))}
                      {vcfPreview.length > 50 && <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>… und {vcfPreview.length - 50} weitere</div>}
                    </div>
                    <button onClick={() => setVcfPreview([])} style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Andere Datei wählen</button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                  <button onClick={() => { setShowImport(false); setVcfPreview([]) }} style={{ flex: 1, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={importVcf} disabled={importing || vcfPreview.length === 0}
                    style={{ flex: 2, backgroundColor: importing || !vcfPreview.length ? 'var(--bg-hover)' : '#6366f1', color: importing || !vcfPreview.length ? 'var(--text-secondary)' : '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {importing ? 'Importiere…' : `${vcfPreview.length} Kontakte importieren`}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)', borderRadius: 8, padding: '9px 13px', marginBottom: 13 }}>
                  Ein Name pro Zeile · optional: Name, Beruf, Telefon, €/Mon, Alter<br />
                  <code style={{ color: '#6366f1' }}>Max Mustermann, Arzt, 01512345678, 300, 35</code>
                </div>
                <textarea value={importText} onChange={e => setImportText(e.target.value)}
                  placeholder={'Max Mustermann, Arzt, 01512345678, 300, 35\nAnna Schmidt, Lehrerin, 0176 9876543\nTom Müller'}
                  rows={7} style={{ ...iStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
                <div style={{ display: 'flex', gap: 9, marginTop: 13 }}>
                  <button onClick={() => setShowImport(false)} style={{ flex: 1, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={importNames} disabled={importing || !importText.trim()}
                    style={{ flex: 2, backgroundColor: importing || !importText.trim() ? 'var(--bg-hover)' : '#6366f1', color: importing || !importText.trim() ? 'var(--text-secondary)' : '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {importing ? 'Importiere…' : 'Importieren'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FolderBtn({ label, count, active, icon, onClick, style: extra }: { label: string; count: number; active: boolean; icon: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 9px', borderRadius: 7, border: 'none', cursor: 'pointer', backgroundColor: active ? '#6366f115' : 'transparent', color: active ? '#6366f1' : 'var(--text-secondary)', fontWeight: active ? 700 : 400, fontSize: 13, textAlign: 'left', marginBottom: 2, transition: 'all 0.12s', ...extra }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 11, backgroundColor: active ? '#6366f130' : 'var(--bg-hover)', borderRadius: 10, padding: '1px 6px', flexShrink: 0 }}>{count}</span>
    </button>
  )
}
