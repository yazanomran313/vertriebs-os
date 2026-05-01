'use client'

import { useState, useEffect } from 'react'
import { Plus, Phone, MessageSquare, X, ChevronRight, Loader2, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ContactImport from '@/components/ContactImport'

type Stage = 'neu' | 'kontaktiert' | 'termin' | 'gehalten' | 'abschluss'
type ContactType = 'kunde' | 'partner'

interface Contact {
  id: string
  name: string
  phone: string
  source: string
  type: ContactType
  stage: Stage
  notes: string
  created_at: string
  last_contact: string
}

const stages: { id: Stage; label: string; color: string }[] = [
  { id: 'neu', label: 'Neu', color: '#6366f1' },
  { id: 'kontaktiert', label: 'Kontaktiert', color: '#f59e0b' },
  { id: 'termin', label: 'Termin vereinbart', color: '#06b6d4' },
  { id: 'gehalten', label: 'Termin gehalten', color: '#22c55e' },
  { id: 'abschluss', label: 'Abschluss', color: '#ec4899' },
]

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selected, setSelected] = useState<Contact | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    source: 'Instagram',
    type: 'kunde' as ContactType,
    notes: '',
  })

  useEffect(() => {
    loadContacts()
  }, [])

  async function loadContacts() {
    setLoading(true)
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
    if (data) setContacts(data)
    setLoading(false)
  }

  async function addContact() {
    if (!form.name.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('contacts').insert([{
      name: form.name,
      phone: form.phone,
      source: form.source,
      type: form.type,
      stage: 'neu',
      notes: form.notes,
      last_contact: new Date().toISOString().split('T')[0],
    }]).select().single()

    if (data && !error) {
      setContacts([data, ...contacts])
      setForm({ name: '', phone: '', source: 'Instagram', type: 'kunde', notes: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function moveStage(id: string, stage: Stage) {
    await supabase.from('contacts').update({ stage, last_contact: new Date().toISOString().split('T')[0] }).eq('id', id)
    setContacts(contacts.map((c) => c.id === id ? { ...c, stage } : c))
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, stage } : null)
  }

  async function deleteContact(id: string) {
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(contacts.filter((c) => c.id !== id))
    setSelected(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--text-secondary)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Lade Kontakte...</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Pipeline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {contacts.length} Kontakte gesamt
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setShowImport(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Upload size={16} />
            Importieren
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={16} />
            Neuer Kontakt
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16 }}>
        {stages.map((stage) => {
          const stageContacts = contacts.filter((c) => c.stage === stage.id)
          return (
            <div key={stage.id} style={{ minWidth: 230, flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: stage.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{stage.label}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: stage.color + '22', color: stage.color, padding: '2px 8px', borderRadius: 20 }}>
                  {stageContacts.length}
                </span>
              </div>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
                {stageContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => setSelected(contact)}
                    style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{contact.name}</div>
                      <span style={{ fontSize: 10, backgroundColor: contact.type === 'partner' ? '#6366f120' : '#22c55e20', color: contact.type === 'partner' ? '#6366f1' : '#22c55e', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        {contact.type === 'partner' ? 'Partner' : 'Kunde'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
                      📱 {contact.source} · {new Date(contact.last_contact).toLocaleDateString('de-DE')}
                    </div>
                    {contact.phone && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{contact.phone}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Import Modal */}
      {showImport && (
        <ContactImport
          onClose={() => setShowImport(false)}
          onImported={loadContacts}
        />
      )}

      {/* Neuer Kontakt Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, width: 480, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Neuer Kontakt</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Max Mustermann"
                  style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Telefon / WhatsApp</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+49 123 456789"
                  style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Quelle</label>
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                    style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                    <option>Instagram</option>
                    <option>WhatsApp</option>
                    <option>Empfehlung</option>
                    <option>Kaltakquise</option>
                    <option>Event</option>
                    <option>LinkedIn</option>
                    <option>Sonstiges</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Typ</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ContactType })}
                    style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}>
                    <option value="kunde">Kunde</option>
                    <option value="partner">Geschäftspartner</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Notizen</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Erstkontakt über Instagram, interessiert an Altersvorsorge..." rows={3}
                  style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <button onClick={addContact} disabled={saving}
                style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: 8 }}>
                {saving ? 'Speichern...' : 'Kontakt hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 360, backgroundColor: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)', padding: 28, overflowY: 'auto', zIndex: 50 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selected.name}</h2>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <a href={`tel:${selected.phone}`}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <Phone size={14} /> Anrufen
            </a>
            <a href={`https://wa.me/${selected.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#6366f120', color: '#6366f1', border: '1px solid #6366f140', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              <MessageSquare size={14} /> WhatsApp
            </a>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 600, letterSpacing: '0.05em' }}>STAGE WECHSELN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stages.map((stage) => (
                <button key={stage.id} onClick={() => moveStage(selected.id, stage.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: selected.stage === stage.id ? stage.color + '22' : 'var(--bg-hover)', border: `1px solid ${selected.stage === stage.id ? stage.color + '66' : 'var(--border)'}`, borderRadius: 8, padding: '9px 14px', fontSize: 13, color: selected.stage === stage.id ? stage.color : 'var(--text-secondary)', cursor: 'pointer', fontWeight: selected.stage === stage.id ? 600 : 400 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: stage.color }} />
                    {stage.label}
                  </div>
                  {selected.stage === stage.id && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 600, letterSpacing: '0.05em' }}>DETAILS</div>
            {[
              { label: 'Telefon', value: selected.phone || '—' },
              { label: 'Quelle', value: selected.source },
              { label: 'Typ', value: selected.type === 'partner' ? 'Geschäftspartner' : 'Kunde' },
              { label: 'Hinzugefügt', value: new Date(selected.created_at).toLocaleDateString('de-DE') },
              { label: 'Letzter Kontakt', value: new Date(selected.last_contact).toLocaleDateString('de-DE') },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
          </div>
          {selected.notes && (
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.05em' }}>NOTIZEN</div>
              <p style={{ fontSize: 13, margin: 0, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{selected.notes}</p>
            </div>
          )}
          <button onClick={() => deleteContact(selected.id)}
            style={{ width: '100%', backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Kontakt löschen
          </button>
        </div>
      )}
    </div>
  )
}
