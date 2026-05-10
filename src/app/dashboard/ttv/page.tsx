'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Phone, ArrowLeft, Trash2, ChevronRight, FileText, ChevronLeft, Bell, BellOff } from 'lucide-react'

/* ─────────── Types ─────────── */
type Status = 'offen' | 'angerufen' | 'termin_gelegt' | 'kein_interesse'

interface Entry {
  id: string; session_id: string; name: string; phone: string | null
  contact_id: string | null; status: Status; position: number; notes: string | null
}
interface Session {
  id: string; date: string; ttv_goal: number; tv_goal: number; entries: Entry[]
}
interface Contact { id: string; name: string; phone: string | null }

/* ─────────── Helpers ─────────── */
function todayIso() { return new Date().toISOString().split('T')[0] }
function formatDate(s: string) {
  return new Date(s + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

// TTV = Telefonate geführt (alle angerufen), Termine = termin_gelegt
function stats(s: Session) {
  const ttvsGemacht   = s.entries.filter(e => e.status !== 'offen').length
  const termineGelegt = s.entries.filter(e => e.status === 'termin_gelegt').length
  const pctTTV        = s.ttv_goal ? Math.round(ttvsGemacht   / s.ttv_goal * 100) : 0
  const pctTermine    = s.tv_goal  ? Math.round(termineGelegt / s.tv_goal  * 100) : 0
  const goalHit       = ttvsGemacht >= s.ttv_goal && s.ttv_goal > 0
                     && termineGelegt >= s.tv_goal && s.tv_goal > 0
  return { ttvsGemacht, termineGelegt, pctTTV, pctTermine, goalHit }
}

const S: Record<Status, { label: string; color: string; bg: string; emoji: string }> = {
  offen:          { label: 'Offen',          color: '#8E8E93', bg: '#8E8E9320', emoji: '⭕' },
  angerufen:      { label: 'Angerufen',      color: '#6366f1', bg: '#6366f120', emoji: '📞' },
  termin_gelegt:  { label: 'Termin gelegt',  color: '#30D158', bg: '#30D15820', emoji: '✅' },
  kein_interesse: { label: 'Kein Interesse', color: '#FF453A', bg: '#FF453A20', emoji: '❌' },
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, backgroundColor: '#3A3A3C', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════ */
export default function TTVPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading]   = useState(true)
  const [view, setView]         = useState<'calendar' | 'session' | 'new'>('calendar')
  const [active, setActive]     = useState<Session | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [dbError, setDbError]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: sess, error: sessErr }, { data: cts }] = await Promise.all([
      supabase.from('ttv_sessions').select('*, ttv_entries(*)').order('date', { ascending: false }),
      supabase.from('contacts').select('id, name, phone'),
    ])
    if (sessErr) { setDbError(true); setLoading(false); return }
    if (sess) setSessions(sess.map(s => ({
      ...s,
      // migrate old 'tv_gemacht' status to 'termin_gelegt'
      entries: ((s.ttv_entries as Entry[]) || [])
        .map(e => ({ ...e, status: (e.status as string) === 'tv_gemacht' ? 'termin_gelegt' : e.status } as Entry))
        .sort((a, b) => a.position - b.position)
    })))
    if (cts) setContacts(cts)
    setLoading(false)
  }

  function openSession(s: Session) { setActive(s); setView('session') }

  function patchEntry(entryId: string, patch: Partial<Entry>) {
    const apply = (s: Session): Session => ({ ...s, entries: s.entries.map(e => e.id === entryId ? { ...e, ...patch } : e) })
    setSessions(prev => prev.map(apply))
    setActive(prev => prev ? apply(prev) : prev)
  }

  async function updateStatus(entryId: string, status: Status) {
    // store termin_gelegt as tv_gemacht in DB for backward compat, or just store new value
    await supabase.from('ttv_entries').update({ status }).eq('id', entryId)
    patchEntry(entryId, { status })
  }

  async function deleteSession(id: string) {
    await supabase.from('ttv_sessions').delete().eq('id', id)
    setSessions(prev => prev.filter(s => s.id !== id))
    setView('calendar'); setActive(null)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-secondary)', fontSize: 14 }}>Laden…</div>
  )

  if (dbError) return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 16px' }}>
      <div style={{ backgroundColor: '#FF9F0A15', border: '1px solid #FF9F0A40', borderRadius: 16, padding: '24px' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚙️</div>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Einmalige Einrichtung nötig</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.7 }}>
          Die TTV-Tabellen wurden noch nicht erstellt. Öffne den SQL Editor und führe dieses SQL aus:
        </div>
        <div style={{ backgroundColor: '#0008', borderRadius: 10, padding: '16px', fontFamily: 'monospace', fontSize: 12, color: '#30D158', lineHeight: 1.8, overflowX: 'auto', marginBottom: 16, whiteSpace: 'pre-wrap' }}>
{`CREATE TABLE IF NOT EXISTS ttv_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  ttv_goal int NOT NULL DEFAULT 5,
  tv_goal int NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ttv_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES ttv_sessions(id) ON DELETE CASCADE,
  name text NOT NULL, phone text, contact_id uuid,
  status text DEFAULT 'offen', position int DEFAULT 0,
  notes text, created_at timestamptz DEFAULT now()
);
ALTER TABLE ttv_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ttv_entries  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON ttv_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON ttv_entries  FOR ALL USING (true) WITH CHECK (true);`}
        </div>
        <a href="https://supabase.com/dashboard/project/mztbajorjzbxuavrujyv/sql/new" target="_blank"
          style={{ display: 'inline-block', backgroundColor: '#6366f1', color: '#fff', padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
          → SQL Editor öffnen
        </a>
        <button onClick={load} style={{ display: 'block', marginTop: 12, background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer' }}>
          Nochmal versuchen
        </button>
      </div>
    </div>
  )

  if (view === 'new') return (
    <NewSession
      contacts={contacts}
      onSaved={s => { setSessions(prev => [s, ...prev]); openSession(s) }}
      onCancel={() => setView('calendar')}
    />
  )

  if (view === 'session' && active) return (
    <SessionDetail
      session={active} contacts={contacts}
      onStatusChange={updateStatus}
      onNoteChange={(id, notes) => patchEntry(id, { notes })}
      onDelete={() => deleteSession(active.id)}
      onBack={() => setView('calendar')}
      onEntryAdded={entry => {
        const updated = { ...active, entries: [...active.entries, entry] }
        setActive(updated)
        setSessions(prev => prev.map(s => s.id === active.id ? updated : s))
      }}
    />
  )

  // Default: calendar
  return (
    <TTVCalendar
      sessions={sessions}
      onOpenSession={openSession}
      onNewSession={() => setView('new')}
    />
  )
}

/* ═══════════════════════════════════════════════════════
   TTV KALENDER — Hauptansicht
═══════════════════════════════════════════════════════ */
function TTVCalendar({ sessions, onOpenSession, onNewSession }: {
  sessions: Session[]
  onOpenSession: (s: Session) => void
  onNewSession: () => void
}) {
  const now = new Date()
  const [year, setYear]         = useState(now.getFullYear())
  const [month, setMonth]       = useState(now.getMonth())
  // no intermediate sheet — tap goes straight to session

  const monthName   = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = (firstDay + 6) % 7 // Mon=0

  const sessionMap = new Map<string, Session>()
  sessions.forEach(s => sessionMap.set(s.date, s))

  const today = todayIso()
  const hasToday = sessions.some(s => s.date === today)

  const monthSessions = sessions.filter(s => {
    const [y, m] = s.date.split('-').map(Number)
    return y === year && m === month + 1
  })
  const monthGoalsHit    = monthSessions.filter(s => stats(s).goalHit).length
  const monthTTVs        = monthSessions.reduce((sum, s) => sum + stats(s).ttvsGemacht, 0)
  const monthTermine     = monthSessions.reduce((sum, s) => sum + stats(s).termineGelegt, 0)
  const monthTTVGoal     = monthSessions.reduce((sum, s) => sum + s.ttv_goal, 0)
  const monthTermineGoal = monthSessions.reduce((sum, s) => sum + s.tv_goal, 0)

  function prevMonth() { month === 0 ? (setYear(y => y-1), setMonth(11)) : setMonth(m => m-1) }
  function nextMonth() { month === 11 ? (setYear(y => y+1), setMonth(0))  : setMonth(m => m+1) }

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 100px' }}>

      {/* Header */}
      <div style={{ padding: '20px 0 4px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>📅 TTV Kalender</h1>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Deine Ziele auf einen Blick</div>
      </div>

      {/* Today banner */}
      {!hasToday && (
        <div onClick={onNewSession}
          style={{ backgroundColor: '#6366f115', border: '1px dashed #6366f160', borderRadius: 14, padding: '14px 18px', marginTop: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24 }}>🚀</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Heute noch keine Session</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>Jetzt starten →</div>
          </div>
        </div>
      )}

      {/* Month stats */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#30D158' }}>{monthGoalsHit}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 1 }}>ZIELE ERREICHT</div>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#6366f1' }}>{monthTTVs}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 1 }}>TTVs</div>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#30D158' }}>{monthTermine}</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 1 }}>TERMINE</div>
        </div>
      </div>

      {/* Month progress */}
      {(monthTTVGoal > 0 || monthTermineGoal > 0) && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {monthTTVGoal > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>TTVs DIESEN MONAT</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{monthTTVs}/{monthTTVGoal}</span>
              </div>
              <Bar pct={Math.round(monthTTVs / monthTTVGoal * 100)} color="#6366f1" />
            </div>
          )}
          {monthTermineGoal > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>TERMINE DIESEN MONAT</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#30D158' }}>{monthTermine}/{monthTermineGoal}</span>
              </div>
              <Bar pct={Math.round(monthTermine / monthTermineGoal * 100)} color="#30D158" />
            </div>
          )}
        </div>
      )}

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 8 }}><ChevronLeft size={22} /></button>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{monthName}</div>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 8 }}><ChevronRight size={22} /></button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const iso    = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const sess   = sessionMap.get(iso)
          const isToday  = iso === today
          const isFuture = iso > today

          if (!sess) return (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 10,
              backgroundColor: isToday ? '#6366f112' : 'var(--bg-card)',
              border: `1px solid ${isToday ? '#6366f150' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isFuture ? 0.3 : 1,
            }}>
              <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#6366f1' : 'var(--text-secondary)' }}>{day}</div>
            </div>
          )

          const { goalHit, ttvsGemacht, termineGelegt, pctTTV } = stats(sess)
          const ttvOk     = ttvsGemacht >= sess.ttv_goal
          const termineOk = termineGelegt >= sess.tv_goal

          return (
            <div key={i} onClick={() => onOpenSession(sess)}
              style={{
                aspectRatio: '1', borderRadius: 10, cursor: 'pointer',
                backgroundColor: goalHit ? '#30D15820' : pctTTV > 0 ? '#6366f115' : '#FF453A12',
                border: `1px solid ${goalHit ? '#30D15850' : pctTTV > 0 ? '#6366f140' : '#FF453A30'}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: goalHit ? '#30D158' : pctTTV > 0 ? '#6366f1' : '#FF453A' }}>{day}</div>
              {/* Two mini dots: purple=TTV, green=Termin */}
              <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ttvOk ? '#6366f1' : '#6366f150' }} />
                <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: termineOk ? '#30D158' : '#30D15850' }} />
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: goalHit ? '#30D158' : '#8E8E93' }}>
                {goalHit ? '🎯' : `${termineGelegt}/${sess.tv_goal}`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        {[
          { color: '#30D158', bg: '#30D15820', label: 'Beide Ziele erreicht' },
          { color: '#6366f1', bg: '#6366f115', label: 'Teilweise' },
          { color: '#FF453A', bg: '#FF453A12', label: 'Keine TTVs' },
        ].map(({ color, bg, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: bg, border: `1px solid ${color}60` }} />
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Fixed "Neue Liste" button */}
      <div style={{ position: 'fixed', bottom: 'calc(92px + env(safe-area-inset-bottom))', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}>
        <button onClick={onNewSession}
          style={{ pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 50, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px #6366f160' }}>
          <Plus size={18} /> Neue Liste
        </button>
      </div>

    </div>
  )
}


/* ═══════════════════════════════════════════════════════
   NEW SESSION WIZARD
═══════════════════════════════════════════════════════ */
function NewSession({ contacts, onSaved, onCancel }: {
  contacts: Contact[]; onSaved: (s: Session) => void; onCancel: () => void
}) {
  const [step, setStep]         = useState<'goals' | 'names'>('goals')
  const [ttvGoal, setTtvGoal]   = useState(5)
  const [tvGoal, setTvGoal]     = useState(3)
  const [entries, setEntries]   = useState<{ name: string; phone: string; contact_id: string | null }[]>([])
  const [nameInput, setNameInput]     = useState('')
  const [phoneInput, setPhoneInput]   = useState('')
  const [suggestions, setSuggestions] = useState<Contact[]>([])
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  function onNameChange(val: string) {
    setNameInput(val)
    if (val.length >= 1) {
      const q    = val.toLowerCase()
      const used = new Set(entries.map(e => e.name.toLowerCase()))
      setSuggestions(contacts.filter(c => c.name.toLowerCase().includes(q) && !used.has(c.name.toLowerCase())))
    } else setSuggestions([])
  }

  function pickSuggestion(c: Contact) {
    setEntries(prev => [...prev, { name: c.name, phone: c.phone || '', contact_id: c.id }])
    setNameInput(''); setPhoneInput(''); setSuggestions([])
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  function addManual() {
    if (!nameInput.trim()) return
    setEntries(prev => [...prev, { name: nameInput.trim(), phone: phoneInput.trim(), contact_id: null }])
    setNameInput(''); setPhoneInput(''); setSuggestions([])
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  async function save() {
    setSaving(true); setSaveError('')
    const { data: sess, error: sessErr } = await supabase
      .from('ttv_sessions').insert({ date: todayIso(), ttv_goal: ttvGoal, tv_goal: tvGoal }).select().single()
    if (sessErr || !sess) { setSaveError('Fehler: ' + (sessErr?.message ?? 'Unbekannt')); setSaving(false); return }

    let dbEntries: Entry[] = []
    if (entries.length) {
      const rows = entries.map((e, i) => ({
        session_id: sess.id, name: e.name, phone: e.phone || null,
        contact_id: e.contact_id, status: 'offen' as Status, position: i, notes: null,
      }))
      const { data, error: eErr } = await supabase.from('ttv_entries').insert(rows).select()
      if (eErr) { setSaveError('Einträge konnten nicht gespeichert werden.'); setSaving(false); return }
      if (data) dbEntries = data as Entry[]
    }
    onSaved({ ...sess, entries: dbEntries })
  }

  const iStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '13px 15px',
    backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
    borderRadius: 12, fontSize: 16, color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}><ArrowLeft size={22} /></button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🚀 Neue Liste</h1>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: '#6366f1' }} />
        <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: step === 'names' ? '#30D158' : 'var(--bg-hover)' }} />
      </div>

      {step === 'goals' ? (
        <>
          {/* TTV Goal — lila */}
          <div style={{ backgroundColor: '#6366f110', border: '1px solid #6366f130', borderRadius: 16, padding: '20px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', letterSpacing: '0.08em', marginBottom: 4 }}>
              WIE VIELE TTVs WILLST DU HEUTE MACHEN?
            </div>
            <div style={{ fontSize: 12, color: '#6366f180', marginBottom: 16 }}>TTV = Telefonate geführt</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setTtvGoal(v => Math.max(1, v-1))}
                style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #6366f140', backgroundColor: '#6366f115', fontSize: 22, cursor: 'pointer', color: '#6366f1', fontWeight: 700 }}>−</button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 52, fontWeight: 800, color: '#6366f1' }}>{ttvGoal}</div>
              <button onClick={() => setTtvGoal(v => v+1)}
                style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #6366f140', backgroundColor: '#6366f115', fontSize: 22, cursor: 'pointer', color: '#6366f1', fontWeight: 700 }}>+</button>
            </div>
          </div>

          {/* Termine Goal — grün */}
          <div style={{ backgroundColor: '#30D15810', border: '1px solid #30D15830', borderRadius: 16, padding: '20px', marginBottom: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#30D158', letterSpacing: '0.08em', marginBottom: 4 }}>
              WIE VIELE TERMINE WILLST DU MINDESTENS LEGEN?
            </div>
            <div style={{ fontSize: 12, color: '#30D15880', marginBottom: 16 }}>Termine = gelegte Termine aus den Telefonaten</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => setTvGoal(v => Math.max(1, v-1))}
                style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #30D15840', backgroundColor: '#30D15815', fontSize: 22, cursor: 'pointer', color: '#30D158', fontWeight: 700 }}>−</button>
              <div style={{ flex: 1, textAlign: 'center', fontSize: 52, fontWeight: 800, color: '#30D158' }}>{tvGoal}</div>
              <button onClick={() => setTvGoal(v => v+1)}
                style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #30D15840', backgroundColor: '#30D15815', fontSize: 22, cursor: 'pointer', color: '#30D158', fontWeight: 700 }}>+</button>
            </div>
          </div>

          <button onClick={() => setStep('names')}
            style={{ width: '100%', padding: '15px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            Weiter → Namen eintragen
          </button>
        </>
      ) : (
        <>
          {/* Goals recap */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <div style={{ flex: 1, backgroundColor: '#6366f115', border: '1px solid #6366f130', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#6366f1' }}>{ttvGoal}</div>
              <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 700, marginTop: 2 }}>TTVs ZIEL</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#30D15810', border: '1px solid #30D15830', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#30D158' }}>{tvGoal}</div>
              <div style={{ fontSize: 10, color: '#30D158', fontWeight: 700, marginTop: 2 }}>TERMINE ZIEL</div>
            </div>
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 10 }}>
            NAMEN EINTRAGEN ({entries.length})
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input ref={nameRef} value={nameInput} onChange={e => onNameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManual() } }}
              placeholder="Name eingeben oder suchen…" style={iStyle} />
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, zIndex: 50, overflowY: 'auto', maxHeight: 260, boxShadow: '0 8px 24px #0008', marginTop: 4 }}>
                {suggestions.map(c => (
                  <div key={c.id} onClick={() => pickSuggestion(c)}
                    style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    {c.phone && <span style={{ fontSize: 12, color: '#30D158' }}>{c.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input value={phoneInput} onChange={e => setPhoneInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManual() } }}
            placeholder="Telefon (optional)" type="tel"
            style={{ ...iStyle, marginBottom: 10 }} />
          <button onClick={addManual} disabled={!nameInput.trim()}
            style={{ width: '100%', padding: '12px', backgroundColor: nameInput.trim() ? '#6366f115' : 'var(--bg-hover)', color: nameInput.trim() ? '#6366f1' : 'var(--text-tertiary)', border: `1px solid ${nameInput.trim() ? '#6366f140' : 'transparent'}`, borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 20 }}>
            <Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Hinzufügen
          </button>

          {entries.length > 0 && (
            <div style={{ backgroundColor: 'var(--bg-hover)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
              {entries.map((e, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < entries.length-1 ? '0.5px solid var(--border)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#6366f120', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{i+1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
                    {e.phone && <div style={{ fontSize: 12, color: '#30D158', marginTop: 1 }}>{e.phone}</div>}
                  </div>
                  <button onClick={() => setEntries(prev => prev.filter((_,idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 20, padding: 4 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {entries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 16 }}>
              Keine Namen nötig — du kannst auch direkt starten
            </div>
          )}

          {saveError && (
            <div style={{ backgroundColor: '#FF453A15', border: '1px solid #FF453A40', borderRadius: 10, padding: '11px 14px', marginBottom: 16, fontSize: 13, color: '#FF453A' }}>
              ❌ {saveError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('goals')}
              style={{ flex: 1, padding: '14px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Zurück
            </button>
            <button onClick={save} disabled={saving}
              style={{ flex: 2, padding: '14px', backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Speichern…' : '🚀 Session starten'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   SESSION DETAIL
═══════════════════════════════════════════════════════ */
function SessionDetail({ session, contacts, onStatusChange, onNoteChange, onDelete, onBack, onEntryAdded }: {
  session: Session; contacts: Contact[]
  onStatusChange: (id: string, status: Status) => void
  onNoteChange: (id: string, notes: string) => void
  onDelete: () => void; onBack: () => void
  onEntryAdded: (e: Entry) => void
}) {
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [justChangedId, setJustChangedId]   = useState<string | null>(null)
  const [showAdd, setShowAdd]               = useState(false)
  const [showDelConfirm, setShowDelConfirm] = useState(false)
  const [addingName, setAddingName]         = useState('')
  const [addingPhone, setAddingPhone]       = useState('')
  const [suggestions, setSuggestions]       = useState<Contact[]>([])
  const [adding, setAdding]                 = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    session.entries.forEach(e => { m[e.id] = e.notes || '' })
    return m
  })
  const [callbacks, setCallbacksState] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('callbacks') || '{}') } catch { return {} }
  })
  const [customDateEntry, setCustomDateEntry] = useState<string | null>(null)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  function setCallback(key: string, isoDate: string | null) {
    setCallbacksState(prev => {
      const next = { ...prev }
      if (isoDate) next[key] = isoDate; else delete next[key]
      localStorage.setItem('callbacks', JSON.stringify(next))
      return next
    })
  }

  function addDays(n: number): string {
    const d = new Date(); d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }

  function fmtCallback(iso: string) {
    const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
    const today = new Date(); today.setHours(0,0,0,0)
    const diff = Math.round((d.setHours(0,0,0,0) - today.getTime()) / 86400000)
    if (diff === 0) return 'Heute'
    if (diff === 1) return 'Morgen'
    if (diff < 0) return `${Math.abs(diff)}T überfällig`
    return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  }

  function updateNote(id: string, val: string) {
    setNotes(prev => ({ ...prev, [id]: val }))
    onNoteChange(id, val)
    clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      supabase.from('ttv_entries').update({ notes: val }).eq('id', id).then(() => {})
    }, 600)
  }

  function onNameChange(val: string) {
    setAddingName(val)
    if (val.length >= 1) {
      const q    = val.toLowerCase()
      const used = new Set(session.entries.map(e => e.name.toLowerCase()))
      setSuggestions(contacts.filter(c => c.name.toLowerCase().includes(q) && !used.has(c.name.toLowerCase())))
    } else setSuggestions([])
  }

  async function addEntry() {
    if (!addingName.trim()) return
    setAdding(true)
    const { data } = await supabase.from('ttv_entries').insert({
      session_id: session.id, name: addingName.trim(), phone: addingPhone.trim() || null,
      contact_id: null, status: 'offen', position: session.entries.length, notes: null,
    }).select().single()
    if (data) { onEntryAdded(data as Entry); setNotes(prev => ({ ...prev, [data.id]: '' })) }
    setAddingName(''); setAddingPhone(''); setAdding(false); setSuggestions([])
  }

  const { ttvsGemacht, termineGelegt, pctTTV, pctTermine, goalHit } = stats(session)
  const isToday = session.date === todayIso()
  const iStyle: React.CSSProperties = { padding: '10px 14px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, color: 'var(--text-primary)', outline: 'none' }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}><ArrowLeft size={22} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isToday && <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#6366f1', color: '#fff', borderRadius: 6, padding: '2px 7px' }}>HEUTE</span>}
            {goalHit && <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: '#30D15820', color: '#30D158', borderRadius: 6, padding: '2px 7px' }}>🎯 ZIEL ERREICHT</span>}
            <span style={{ fontWeight: 800, fontSize: 17 }}>{formatDate(session.date)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{session.ttv_goal} TTVs · {session.tv_goal} Termine · {session.entries.length} Personen</div>
        </div>
        <button onClick={() => setShowDelConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}><Trash2 size={18} /></button>
      </div>

      {/* Stats — TTV purple, Termine green */}
      <div style={{ backgroundColor: goalHit ? '#30D15810' : 'var(--bg-card)', border: `1px solid ${goalHit ? '#30D15840' : 'var(--border)'}`, borderRadius: 16, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{goalHit ? '🎯 Beide Ziele erreicht!' : 'Fortschritt'}</div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>TTVs</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{ttvsGemacht}/{session.ttv_goal}</span>
            </div>
            <Bar pct={pctTTV} color="#6366f1" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#30D158' }}>TERMINE</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#30D158' }}>{termineGelegt}/{session.tv_goal}</span>
            </div>
            <Bar pct={pctTermine} color="#30D158" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {(['offen','angerufen','termin_gelegt','kein_interesse'] as Status[]).map(st => {
            const count = session.entries.filter(e => e.status === st).length
            if (!count) return null
            return <span key={st} style={{ fontSize: 11, fontWeight: 700, backgroundColor: S[st].bg, color: S[st].color, borderRadius: 20, padding: '3px 10px' }}>{S[st].emoji} {S[st].label} {count}</span>
          })}
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 10 }}>
        ANRUFLISTE ({session.entries.length})
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {session.entries.map((entry, i) => {
          const cfg         = S[entry.status]
          const done        = entry.status === 'termin_gelegt' || entry.status === 'kein_interesse'
          const expanded    = expandedId === entry.id
          const noteVal     = notes[entry.id] ?? ''
          const callbackKey = entry.contact_id ?? entry.id
          const callbackDate = callbacks[callbackKey]

          return (
            <div key={entry.id}
              style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${done ? cfg.color + '50' : 'var(--border)'}`, borderRadius: 16, overflow: 'hidden', opacity: entry.status === 'kein_interesse' ? 0.65 : 1 }}>
              <div onClick={() => setExpandedId(expanded ? null : entry.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {entry.status === 'termin_gelegt' ? '✓' : entry.status === 'kein_interesse' ? '✗' : i+1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, textDecoration: entry.status === 'kein_interesse' ? 'line-through' : 'none' }}>{entry.name}</div>
                  {entry.phone
                    ? <a href={`tel:${entry.phone}`} onClick={e => e.stopPropagation()}
                        style={{ fontSize: 13, color: '#30D158', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Phone size={12} /> {entry.phone}
                      </a>
                    : <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Keine Nummer</div>
                  }
                  {noteVal && !expanded && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>📝 {noteVal}</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <button onClick={e => { e.stopPropagation(); setExpandedId(expanded ? null : entry.id) }}
                    style={{ fontSize: 11, fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color, border: 'none', borderRadius: 20, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {cfg.label} ▾
                  </button>
                  <button onClick={e => { e.stopPropagation(); setExpandedId(expanded ? null : entry.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: noteVal ? '#6366f1' : 'var(--text-tertiary)', padding: 2 }}>
                    <FileText size={14} />
                  </button>
                  {callbackDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, backgroundColor: '#f59e0b20', borderRadius: 8, padding: '2px 7px', cursor: 'pointer' }}
                      onClick={e => e.stopPropagation()}>
                      <Bell size={10} color="#f59e0b" />
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>{fmtCallback(callbackDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              {expanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', backgroundColor: 'var(--bg-hover)' }}>
                  {entry.phone && (
                    <a href={`tel:${entry.phone}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#30D158', color: '#fff', borderRadius: 12, padding: '13px', marginBottom: 14, textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
                      <Phone size={18} /> {entry.phone} anrufen
                    </a>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: 8 }}>STATUS</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {(['angerufen','termin_gelegt','kein_interesse','offen'] as Status[]).map(st => (
                      <button key={st} onClick={() => {
                        onStatusChange(entry.id, st)
                        if (st !== 'offen') {
                          setJustChangedId(entry.id)
                          setTimeout(() => setJustChangedId(null), 3000)
                        } else {
                          setExpandedId(null)
                        }
                      }}
                        style={{ fontSize: 12, fontWeight: 700, backgroundColor: entry.status === st ? S[st].color : S[st].bg, color: entry.status === st ? '#fff' : S[st].color, border: 'none', borderRadius: 10, padding: '8px 13px', cursor: 'pointer' }}>
                        {S[st].emoji} {S[st].label}
                      </button>
                    ))}
                  </div>
                  {/* Quick note prompt after status change */}
                  {justChangedId === entry.id && (
                    <div style={{ backgroundColor: '#6366f110', border: '1px solid #6366f130', borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
                      ✅ Status gesetzt — Notiz hinterlassen?
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: 8 }}>NOTIZ</div>
                  <textarea value={noteVal} onChange={e => updateNote(entry.id, e.target.value)}
                    autoFocus={justChangedId === entry.id}
                    placeholder={justChangedId === entry.id ? 'Was wurde besprochen? Termin-Details?…' : 'Notiz zum Gespräch…'} rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', backgroundColor: 'var(--bg-card)', border: `1px solid ${justChangedId === entry.id ? '#6366f150' : 'var(--border)'}`, borderRadius: 10, fontSize: 14, color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Wird automatisch gespeichert</div>
                    <button onClick={() => setExpandedId(null)}
                      style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                      Fertig ✓
                    </button>
                  </div>

                  {/* ── RÜCKRUF ── */}
                  <div style={{ marginTop: 16, borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Bell size={12} /> RÜCKRUF ERINNERUNG
                      </div>
                      {callbackDate && (
                        <button onClick={() => { setCallback(callbackKey, null); setCustomDateEntry(null) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                          <BellOff size={12} /> Löschen
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Morgen', days: 1 },
                        { label: '+3 Tage', days: 3 },
                        { label: '+1 Woche', days: 7 },
                      ].map(chip => {
                        const chipDate = addDays(chip.days)
                        const active = callbackDate === chipDate
                        return (
                          <button key={chip.label}
                            onClick={() => { setCallback(callbackKey, active ? null : chipDate); setCustomDateEntry(null) }}
                            style={{
                              fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 10, border: 'none', cursor: 'pointer',
                              backgroundColor: active ? '#f59e0b' : '#f59e0b18',
                              color: active ? '#fff' : '#f59e0b',
                              transition: 'all 0.15s',
                            }}>
                            {active ? '✓ ' : ''}{chip.label}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setCustomDateEntry(customDateEntry === entry.id ? null : entry.id)}
                        style={{
                          fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 10, border: 'none', cursor: 'pointer',
                          backgroundColor: customDateEntry === entry.id ? '#1e7ef720' : 'rgba(255,255,255,0.06)',
                          color: customDateEntry === entry.id ? '#1e7ef7' : 'var(--text-secondary)',
                          transition: 'all 0.15s',
                        }}>
                        📅 Eigenes
                      </button>
                    </div>
                    {customDateEntry === entry.id && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="date"
                          defaultValue={callbackDate?.split('T')[0] ?? addDays(1)}
                          min={addDays(0)}
                          onChange={e => {
                            if (e.target.value) setCallback(callbackKey, e.target.value)
                          }}
                          style={{
                            flex: 1, padding: '9px 12px',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid rgba(30,126,247,0.3)',
                            borderRadius: 10, fontSize: 14,
                            color: 'var(--text-primary)', outline: 'none',
                            colorScheme: 'dark',
                          }}
                        />
                        <button onClick={() => setCustomDateEntry(null)}
                          style={{ fontSize: 12, fontWeight: 700, color: '#1e7ef7', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px' }}>
                          OK
                        </button>
                      </div>
                    )}
                    {callbackDate && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#f59e0b12', borderRadius: 10, padding: '8px 12px' }}>
                        <Bell size={13} color="#f59e0b" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>
                          Erinnerung: {new Date(callbackDate + (callbackDate.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {session.entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-tertiary)', fontSize: 13 }}>Noch keine Namen — füge unten hinzu</div>
        )}
      </div>

      {showAdd ? (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input value={addingName} onChange={e => onNameChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry() } }}
              placeholder="Name eingeben…" autoFocus
              style={{ ...iStyle, width: '100%', boxSizing: 'border-box' }} />
            {suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, zIndex: 50, overflowY: 'auto', maxHeight: 260, boxShadow: '0 8px 24px #0008', marginTop: 4 }}>
                {suggestions.map(c => (
                  <div key={c.id} onClick={() => { setAddingName(c.name); setAddingPhone(c.phone || ''); setSuggestions([]) }}
                    style={{ padding: '11px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    {c.phone && <span style={{ fontSize: 12, color: '#30D158' }}>{c.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input value={addingPhone} onChange={e => setAddingPhone(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry() } }}
            placeholder="Telefon (optional)" type="tel"
            style={{ ...iStyle, width: '100%', boxSizing: 'border-box', marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setShowAdd(false); setAddingName(''); setAddingPhone('') }}
              style={{ flex: 1, padding: 11, border: '1px solid var(--border)', borderRadius: 10, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
            <button onClick={addEntry} disabled={!addingName.trim() || adding}
              style={{ flex: 2, padding: 11, border: 'none', borderRadius: 10, backgroundColor: '#6366f1', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: !addingName.trim() ? 0.5 : 1 }}>
              {adding ? 'Speichern…' : '+ Hinzufügen'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ width: '100%', padding: 14, backgroundColor: 'var(--bg-hover)', border: '1px dashed var(--border)', borderRadius: 14, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={16} /> Person hinzufügen
        </button>
      )}

      {showDelConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: '#00000088', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setShowDelConfirm(false)}>
          <div style={{ backgroundColor: '#1C1C1E', borderRadius: '20px 20px 0 0', padding: '20px 20px 44px', width: '100%', maxWidth: 520 }}>
            <div style={{ width: 36, height: 4, backgroundColor: '#3A3A3C', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Session löschen?</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Die Session vom <strong>{formatDate(session.date)}</strong> wird dauerhaft gelöscht.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDelConfirm(false)}
                style={{ flex: 1, padding: 14, border: '1px solid var(--border)', borderRadius: 12, backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={() => { onDelete(); setShowDelConfirm(false) }}
                style={{ flex: 1, padding: 14, border: 'none', borderRadius: 12, backgroundColor: '#FF453A', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
