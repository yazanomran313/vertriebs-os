'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { VG_STAGES, RG_STAGES } from '@/lib/ergo'
import { Phone, MessageSquare, ChevronRight } from 'lucide-react'

interface Contact {
  id: string; name: string; phone: string | null
  vg_stage: string | null; rg_stage: string | null
  einheiten: number | null; last_contact: string | null; created_at: string
}
type PipelineTab = 'vg' | 'rg'

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function avatarColor(name: string) {
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#30D158', '#FF9F0A', '#FF6B6B', '#4ECDC4']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}
function daysAgo(dateStr: string | null, fallback: string) {
  const d = Math.floor((Date.now() - new Date(dateStr || fallback).getTime()) / 86400000)
  return d === 0 ? 'Heute' : d === 1 ? 'Gestern' : `vor ${d}T`
}

export default function PipelinePage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<PipelineTab>('vg')
  const [activeStage, setActiveStage] = useState('kundenpotenzial')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [moving, setMoving]     = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('contacts')
      .select('id,name,phone,vg_stage,rg_stage,einheiten,last_contact,created_at')
      .order('created_at', { ascending: false })
    setContacts((data || []) as Contact[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Reset active stage when switching tab
  useEffect(() => {
    setActiveStage(tab === 'vg' ? 'kundenpotenzial' : 'partnerpotenzial')
  }, [tab])

  async function moveStage(contact: Contact, newStage: string) {
    setMoving(true)
    const field = tab === 'vg' ? 'vg_stage' : 'rg_stage'
    await supabase.from('contacts')
      .update({ [field]: newStage, last_contact: new Date().toISOString().split('T')[0] })
      .eq('id', contact.id)
    const updated = { ...contact, [field]: newStage }
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, [field]: newStage } : c))
    setSelected(updated)
    setMoving(false)
  }

  const stages = tab === 'vg' ? VG_STAGES : RG_STAGES
  const field  = tab === 'vg' ? 'vg_stage' : 'rg_stage'
  const currentStage = stages.find(s => s.id === activeStage) || stages[0]

  const vgActive = contacts.filter(c => c.vg_stage && c.vg_stage !== 'abgeschlossen').length
  const vgAbg    = contacts.filter(c => c.vg_stage === 'abgeschlossen').length
  const rgActive = contacts.filter(c => c.rg_stage && c.rg_stage !== 'im_team').length
  const rgTeam   = contacts.filter(c => c.rg_stage === 'im_team').length

  const stageContacts = contacts.filter(c => c[field as keyof Contact] === activeStage)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', color: 'var(--text-secondary)', fontSize: 14 }}>Lade…</div>
  )

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 100px' }}>

      {/* Title */}
      <div style={{ padding: '16px 0 20px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.5px' }}>Pipeline</h1>

        {/* VG / RG Toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {(['vg', 'rg'] as PipelineTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 20px', borderRadius: 22, fontSize: 14, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              backgroundColor: tab === t ? '#6366f1' : 'var(--bg-card)',
              color: tab === t ? '#fff' : 'var(--text-secondary)',
            }}>
              {t === 'vg' ? '📈 VG Verkauf' : '🤝 RG Rekrutierung'}
            </button>
          ))}
        </div>

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(tab === 'vg' ? [
            { label: `${vgActive} Aktiv`, color: '#FF9F0A' },
            { label: `${vgAbg} Abschlüsse`, color: '#30D158' },
            { label: `${contacts.filter(c => c.vg_stage).length} Gesamt`, color: '#6366f1' },
          ] : [
            { label: `${rgActive} Aktiv`, color: '#FF9F0A' },
            { label: `${rgTeam} Im Team`, color: '#30D158' },
            { label: `${contacts.filter(c => c.rg_stage).length} Gesamt`, color: '#6366f1' },
          ]).map(p => (
            <div key={p.label} style={{ fontSize: 12, fontWeight: 700, color: p.color, backgroundColor: p.color + '18', padding: '5px 12px', borderRadius: 20, border: `1px solid ${p.color}30` }}>
              {p.label}
            </div>
          ))}
        </div>
      </div>

      {/* Stage Tab Bar */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16,
        paddingBottom: 4, scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        {stages.map(stage => {
          const count = contacts.filter(c => c[field as keyof Contact] === stage.id).length
          const isActive = activeStage === stage.id
          return (
            <button key={stage.id} onClick={() => setActiveStage(stage.id)} style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 20,
              border: `1px solid ${isActive ? stage.color + '50' : 'var(--border)'}`,
              cursor: 'pointer',
              backgroundColor: isActive ? stage.color + '22' : 'var(--bg-card)',
              transition: 'all 0.15s',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: isActive ? stage.color : 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? stage.color : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                {stage.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? stage.color : 'var(--text-tertiary)', backgroundColor: isActive ? stage.color + '25' : 'var(--bg-hover)', borderRadius: 10, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Contact Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stageContacts.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)',
            borderRadius: 16, padding: '40px 20px', textAlign: 'center',
            color: 'var(--text-tertiary)', fontSize: 14,
          }}>
            Keine Kontakte in „{currentStage?.label}"
          </div>
        ) : stageContacts.map(contact => {
          const color = avatarColor(contact.name)
          const last  = daysAgo(contact.last_contact, contact.created_at)
          const isWarm = contact.last_contact
            ? Math.floor((Date.now() - new Date(contact.last_contact).getTime()) / 86400000) <= 3
            : false

          return (
            <div key={contact.id} onClick={() => setSelected(contact)} style={{
              backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
              borderLeft: `3px solid ${color}`,
              borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                backgroundColor: color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color,
              }}>
                {initials(contact.name)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contact.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <span style={{ fontSize: 12, color: isWarm ? '#30D158' : 'var(--text-tertiary)', fontWeight: isWarm ? 600 : 400 }}>
                    {last}
                  </span>
                  {contact.einheiten && tab === 'vg' && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#FF9F0A', backgroundColor: '#FF9F0A18', padding: '1px 7px', borderRadius: 8 }}>
                      {contact.einheiten} E
                    </span>
                  )}
                </div>
              </div>

              {contact.phone && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, backgroundColor: '#30D15818', textDecoration: 'none' }}>
                    <Phone size={14} color="#30D158" />
                  </a>
                  <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, backgroundColor: '#6366f118', textDecoration: 'none' }}>
                    <MessageSquare size={14} color="#6366f1" />
                  </a>
                </div>
              )}

              <ChevronRight size={15} color="var(--text-tertiary)" />
            </div>
          )
        })}
      </div>

      {/* Contact Detail Sheet */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            backgroundColor: '#1C1C1E', borderRadius: '22px 22px 0 0',
            padding: '0 0 44px', maxHeight: '82vh', overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, backgroundColor: '#3A3A3C', borderRadius: 2, margin: '12px auto 0' }} />

            {/* Header */}
            <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                backgroundColor: avatarColor(selected.name) + '30',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, color: avatarColor(selected.name),
              }}>
                {initials(selected.name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{selected.name}</div>
                {selected.phone && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{selected.phone}</div>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
            </div>

            {/* Quick actions */}
            {selected.phone && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px 16px' }}>
                <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#30D15818', color: '#30D158', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  <Phone size={16} /> Anrufen
                </a>
                <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f118', color: '#6366f1', borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  <MessageSquare size={16} /> WhatsApp
                </a>
              </div>
            )}

            {/* Stage selector */}
            <div style={{ padding: '0 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 10 }}>
                STAGE ÄNDERN
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stages.map((stage, idx) => {
                  const isActiveStage = selected[field as keyof Contact] === stage.id
                  const isNext = idx > 0 && selected[field as keyof Contact] === stages[idx - 1].id
                  return (
                    <button key={stage.id}
                      onClick={() => !isActiveStage && moveStage(selected, stage.id)}
                      disabled={moving}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '13px 16px', width: '100%',
                        background: isActiveStage ? stage.color + '18' : 'none',
                        border: `1px solid ${isActiveStage ? stage.color + '50' : isNext ? stage.color + '30' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 12, cursor: isActiveStage ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: isActiveStage ? stage.color : 'rgba(255,255,255,0.15)', flexShrink: 0, boxShadow: isActiveStage ? `0 0 8px ${stage.color}70` : 'none' }} />
                      <span style={{ fontSize: 14, fontWeight: isActiveStage ? 700 : 400, color: isActiveStage ? stage.color : 'var(--text-primary)', flex: 1, textAlign: 'left' }}>
                        {stage.label}
                      </span>
                      {isActiveStage && <span style={{ fontSize: 11, fontWeight: 700, color: stage.color, backgroundColor: stage.color + '20', padding: '2px 8px', borderRadius: 10 }}>Aktuell</span>}
                      {isNext && !isActiveStage && <span style={{ fontSize: 11, color: stage.color, opacity: 0.7 }}>→ Weiter</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: '16px 20px 0' }}>
              <button onClick={() => setSelected(null)} style={{ width: '100%', backgroundColor: 'var(--bg-hover)', border: 'none', borderRadius: 14, padding: '14px', fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
