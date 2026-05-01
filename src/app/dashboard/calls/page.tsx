'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, MessageCircle, Plus, Trash2, TrendingUp, Target, Flame, X } from 'lucide-react'

interface CallLog {
  id: string
  created_at: string
  contact_name: string
  contact_id?: string
  type: 'phone' | 'whatsapp'
  outcome: 'kein_kontakt' | 'termin' | 'abgesagt' | 'folgekontakt' | 'abgeschlossen'
  notes?: string
  date: string
}

interface Contact { id: string; name: string; phone?: string }

const OUTCOMES = [
  { key: 'kein_kontakt',  label: 'Kein Kontakt',  color: '#6b7280', bg: '#6b728020' },
  { key: 'folgekontakt',  label: 'Folgekontakt',  color: '#f59e0b', bg: '#f59e0b20' },
  { key: 'termin',        label: '✅ Termin',      color: '#22c55e', bg: '#22c55e20' },
  { key: 'abgesagt',      label: '❌ Abgesagt',    color: '#ef4444', bg: '#ef444420' },
  { key: 'abgeschlossen', label: '🏆 Abschluss',   color: '#8b5cf6', bg: '#8b5cf620' },
]

const iStyle: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

import React from 'react'

export default function CallsPage() {
  const [logs, setLogs]         = useState<CallLog[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [filterDate, setFilterDate] = useState<'heute' | 'woche' | 'monat' | 'alle'>('woche')
  const [notifActive, setNotifActive] = useState(false)

  useEffect(() => {
    // Load notification pref from localStorage
    if (typeof window !== 'undefined') {
      setNotifActive(localStorage.getItem('tagesziel_notif') === '1')
    }
  }, [])

  const [fName, setFName]       = useState('')
  const [fContactId, setFCId]   = useState('')
  const [fType, setFType]       = useState<'phone' | 'whatsapp'>('phone')
  const [fOutcome, setFOutcome] = useState<CallLog['outcome']>('kein_kontakt')
  const [fNotes, setFNotes]     = useState('')
  const [fDate, setFDate]       = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: logData }, { data: ctData }] = await Promise.all([
      supabase.from('call_logs').select('*').order('date', { ascending: false }),
      supabase.from('contacts').select('id,name,phone').order('name'),
    ])
    setLogs((logData || []) as CallLog[])
    setContacts((ctData || []) as Contact[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Fire notification on page load if active and goal not met
  useEffect(() => {
    if (loading) return
    const active = typeof window !== 'undefined' && localStorage.getItem('tagesziel_notif') === '1'
    if (!active) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    const now = new Date()
    const todayCalls = logs.filter(l => new Date(l.date).toDateString() === now.toDateString()).length
    if (todayCalls < 5) {
      try {
        new Notification('Vertriebs-OS', {
          body: 'Heute noch ' + (5 - todayCalls) + ' Anrufe bis zum Tagesziel! 📞',
          icon: '/icon-192.png',
        })
      } catch {
        // Notification may fail in some environments
      }
    }
  }, [loading, logs])

  async function toggleNotification() {
    if (typeof Notification === 'undefined') {
      alert('Benachrichtigungen werden von diesem Browser nicht unterstützt.')
      return
    }
    if (notifActive) {
      localStorage.removeItem('tagesziel_notif')
      setNotifActive(false)
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      localStorage.setItem('tagesziel_notif', '1')
      setNotifActive(true)
      try {
        new Notification('Vertriebs-OS', {
          body: 'Tageserinnerung aktiviert! Du wirst an dein Tagesziel erinnert.',
          icon: '/icon-192.png',
        })
      } catch {
        // ignore
      }
    } else {
      alert('Berechtigung verweigert. Bitte erlaube Benachrichtigungen in den Browser-Einstellungen.')
    }
  }

  function openAdd() {
    setFName(''); setFCId(''); setFType('phone'); setFOutcome('kein_kontakt')
    setFNotes(''); setFDate(new Date().toISOString().split('T')[0])
    setShowAdd(true)
  }

  async function addLog() {
    if (!fName.trim() && !fContactId) return
    setSaving(true)
    const contact = contacts.find(c => c.id === fContactId)
    const name = contact?.name || fName.trim()
    const { data } = await supabase.from('call_logs').insert([{
      contact_name: name, contact_id: fContactId || null,
      type: fType, outcome: fOutcome, notes: fNotes.trim() || null, date: fDate,
    }]).select().single()
    if (data) setLogs(prev => [data as CallLog, ...prev])
    setSaving(false); setShowAdd(false)
  }

  async function quickLog(outcome: CallLog['outcome']) {
    const n = prompt('Name des Kontakts?')
    if (!n?.trim()) return
    const { data } = await supabase.from('call_logs').insert([{
      contact_name: n.trim(), type: 'phone', outcome,
      date: new Date().toISOString().split('T')[0]
    }]).select().single()
    if (data) setLogs(prev => [data as CallLog, ...prev])
  }

  async function deleteLog(id: string) {
    await supabase.from('call_logs').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  const now = new Date()
  const filteredLogs = logs.filter(l => {
    const d = new Date(l.date)
    if (filterDate === 'heute') return d.toDateString() === now.toDateString()
    if (filterDate === 'woche') { const w = new Date(now); w.setDate(now.getDate() - 7); return d >= w }
    if (filterDate === 'monat') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    return true
  })

  const today    = logs.filter(l => new Date(l.date).toDateString() === now.toDateString())
  const todayCount = today.length
  const weekLogs  = logs.filter(l => { const w = new Date(now); w.setDate(now.getDate() - 7); return new Date(l.date) >= w })
  const weekTermine = weekLogs.filter(l => l.outcome === 'termin').length
  const weekTotal   = weekLogs.length
  const terminRate  = weekTotal > 0 ? Math.round(weekTermine / weekTotal * 100) : 0

  let streak = 0
  const checkDay = new Date(now)
  for (let i = 0; i < 30; i++) {
    const dayStr = checkDay.toDateString()
    const dayCalls = logs.filter(l => new Date(l.date).toDateString() === dayStr).length
    if (dayCalls >= 5) { streak++; checkDay.setDate(checkDay.getDate() - 1) }
    else break
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>📞 Anruf-Tracking</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Jeden Anruf tracken — Telefon & WhatsApp</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={toggleNotification}
            style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: notifActive ? '#f59e0b20' : 'var(--bg-card)', color: notifActive ? '#f59e0b' : 'var(--text-secondary)', border: `1px solid ${notifActive ? '#f59e0b40' : 'var(--border)'}`, borderRadius: 9, padding: '9px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {notifActive ? '🔔 Erinnerung aktiv' : '🔕 Erinnerung aktivieren'}
          </button>
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Anruf eintragen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Heute',             value: `${todayCount}/5`, sub: 'Anrufe',          color: todayCount >= 5 ? '#22c55e' : '#6366f1', icon: <Phone size={15} /> },
          { label: 'Activity Streak',   value: `${streak} Tage`, sub: 'Min. 5/Tag',       color: streak > 0 ? '#f59e0b' : '#6b7280',    icon: <Flame size={15} /> },
          { label: 'Termine (7 Tage)',  value: weekTermine,       sub: `von ${weekTotal}`, color: '#22c55e',                               icon: <Target size={15} /> },
          { label: 'Termin-Rate',       value: `${terminRate}%`,  sub: 'letzte 7 Tage',   color: terminRate > 20 ? '#22c55e' : terminRate > 10 ? '#f59e0b' : '#ef4444', icon: <TrendingUp size={15} /> },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Progress bar + quick log */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ fontWeight: 700 }}>🔥 Heute — {todayCount} Anrufe</span>
          <span style={{ color: todayCount >= 5 ? '#22c55e' : 'var(--text-secondary)', fontWeight: 600 }}>
            {todayCount >= 5 ? 'Tagesziel erreicht ✅' : `Noch ${5 - todayCount} bis zum Ziel`}
          </span>
        </div>
        <div style={{ height: 10, backgroundColor: 'var(--bg-hover)', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${Math.min(100, todayCount / 5 * 100)}%`, backgroundColor: todayCount >= 5 ? '#22c55e' : '#6366f1', borderRadius: 6, transition: 'width 0.4s' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 700 }}>SCHNELL EINTRAGEN:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {OUTCOMES.map(o => (
            <button key={o.key} onClick={() => quickLog(o.key as CallLog['outcome'])}
              style={{ fontSize: 11, fontWeight: 700, backgroundColor: o.bg, color: o.color, border: `1px solid ${o.color}40`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer' }}>
              + {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 14, width: 'fit-content' }}>
        {(['heute', 'woche', 'monat', 'alle'] as const).map(f => (
          <button key={f} onClick={() => setFilterDate(f)}
            style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: filterDate === f ? 'var(--accent)' : 'transparent', color: filterDate === f ? '#fff' : 'var(--text-secondary)' }}>
            {f === 'heute' ? 'Heute' : f === 'woche' ? 'Diese Woche' : f === 'monat' ? 'Dieser Monat' : 'Gesamt'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Lade…</div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Keine Anrufe</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Trag deinen ersten Anruf oben ein!</div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {filteredLogs.map((l, i) => {
            const outcome = OUTCOMES.find(o => o.key === l.outcome)
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderBottom: i < filteredLogs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ color: l.type === 'whatsapp' ? '#25d366' : '#6366f1', flexShrink: 0 }}>
                  {l.type === 'whatsapp' ? <MessageCircle size={16} /> : <Phone size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{l.contact_name}</div>
                  {l.notes && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{l.notes}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: outcome?.bg, color: outcome?.color, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>
                  {outcome?.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{formatDate(l.date)}</span>
                <button onClick={() => deleteLog(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', opacity: 0.5 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 26, width: 460, maxWidth: '94vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📞 Anruf eintragen</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Kontakt aus Liste</div>
                <select value={fContactId} onChange={e => { setFCId(e.target.value); if (e.target.value) setFName('') }} style={iStyle}>
                  <option value="">— Name manuell eingeben —</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {!fContactId && (
                <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Name *" style={iStyle} />
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Kanal</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['phone', 'whatsapp'] as const).map(t => (
                      <button key={t} onClick={() => setFType(t)}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${fType === t ? (t === 'whatsapp' ? '#25d366' : '#6366f1') : 'var(--border)'}`, backgroundColor: fType === t ? (t === 'whatsapp' ? '#25d36620' : '#6366f120') : 'var(--bg-hover)', color: fType === t ? (t === 'whatsapp' ? '#25d366' : '#6366f1') : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {t === 'whatsapp' ? '💬 WhatsApp' : '📞 Telefon'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Datum</div>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={iStyle} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Ergebnis</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {OUTCOMES.map(o => (
                    <button key={o.key} onClick={() => setFOutcome(o.key as CallLog['outcome'])}
                      style={{ padding: '6px 12px', borderRadius: 7, border: `2px solid ${fOutcome === o.key ? o.color : 'var(--border)'}`, backgroundColor: fOutcome === o.key ? o.bg : 'var(--bg-hover)', color: fOutcome === o.key ? o.color : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <input value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Notizen (optional)" style={iStyle} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={addLog} disabled={saving || (!fName.trim() && !fContactId)}
                  style={{ flex: 2, backgroundColor: saving || (!fName.trim() && !fContactId) ? 'var(--bg-hover)' : '#6366f1', color: saving || (!fName.trim() && !fContactId) ? 'var(--text-secondary)' : '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Speichern…' : 'Eintragen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
