'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentProduktionsmonat, PRODUKTIONSMONATE } from '@/lib/ergo'
import { Plus, X, Check, ChevronLeft, ChevronRight, Target, Trash2 } from 'lucide-react'

const PRODUKTE = [
  'Private Altersvorsorge',
  'Kidspolice',
  'Rürup',
  'bAV',
  'PKV',
  'Risikolebensversicherung',
  'BU',
  'Haftpflicht',
  'Hausrat',
  'Sonstige',
]

interface Abschluss {
  id: string
  contact_name: string
  produkt: string
  einheiten: number
  datum: string
  notiz: string | null
  created_at: string
}

function todayIso() { return new Date().toISOString().split('T')[0] }

/* ── Ring Progress ── */
function GoalRing({ einheiten, goal }: { einheiten: number; goal: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(einheiten / goal, 1) : 0
  const dash = circ * pct
  const color = pct >= 1 ? '#22c55e' : pct >= 0.6 ? '#1e7ef7' : pct >= 0.3 ? '#f59e0b' : '#4a5568'

  return (
    <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
      <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>
          {einheiten.toFixed(1).replace('.', ',')}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>von {goal} E</span>
      </div>
    </div>
  )
}

export default function AbschluessePage() {
  const pm = getCurrentProduktionsmonat()
  const [pmIndex, setPmIndex] = useState(() =>
    PRODUKTIONSMONATE.findIndex(p => p.monat === pm.monat)
  )
  const currentPm = PRODUKTIONSMONATE[pmIndex]

  const [abschluesse, setAbschluesse] = useState<Abschluss[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [goal, setGoal] = useState<number>(() => {
    if (typeof window === 'undefined') return 20
    return parseInt(localStorage.getItem('einheiten_goal') || '20')
  })
  const [editGoal, setEditGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(String(goal))

  // Form state
  const [fName, setFName]       = useState('')
  const [fProdukt, setFProdukt] = useState(PRODUKTE[0])
  const [fEinheiten, setFEinheiten] = useState('')
  const [fDatum, setFDatum]     = useState(todayIso())
  const [fNotiz, setFNotiz]     = useState('')
  const [saving, setSaving]     = useState(false)

  /* ── date range for current PM ── */
  const pmRange = (() => {
    const prevDeadline = pmIndex === 0
      ? new Date('2026-01-01')
      : PRODUKTIONSMONATE[pmIndex - 1].deadline
    return { from: prevDeadline, to: currentPm.deadline }
  })()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('abschluesse')
      .select('*')
      .gte('datum', pmRange.from.toISOString().split('T')[0])
      .lte('datum', pmRange.to.toISOString().split('T')[0])
      .order('datum', { ascending: false })
    setAbschluesse((data || []) as Abschluss[])
    setLoading(false)
  }, [pmIndex])

  useEffect(() => { load() }, [load])

  const totalEinheiten = abschluesse.reduce((s, a) => s + a.einheiten, 0)
  const pct = goal > 0 ? Math.round((totalEinheiten / goal) * 100) : 0

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!fName.trim() || !fEinheiten) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('abschluesse').insert({
      user_id: user?.id,
      contact_name: fName.trim(),
      produkt: fProdukt,
      einheiten: parseFloat(fEinheiten),
      datum: fDatum,
      notiz: fNotiz.trim() || null,
    })
    setFName(''); setFEinheiten(''); setFNotiz(''); setFDatum(todayIso())
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    await supabase.from('abschluesse').delete().eq('id', id)
    setAbschluesse(prev => prev.filter(a => a.id !== id))
  }

  function saveGoal() {
    const g = parseInt(goalInput) || 20
    setGoal(g)
    localStorage.setItem('einheiten_goal', String(g))
    setEditGoal(false)
  }

  const iStyle: React.CSSProperties = {
    width: '100%', backgroundColor: 'var(--bg-hover)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '11px 12px',
    color: 'var(--text-primary)', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 100px' }}>

      {/* Header */}
      <div style={{ padding: '20px 0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
          Abschlüsse
        </h1>
        <button onClick={() => setShowForm(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          backgroundColor: '#1e7ef7', border: 'none', borderRadius: 12,
          padding: '9px 16px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Neu
        </button>
      </div>

      {/* Month selector */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: '12px 16px', marginBottom: 12,
      }}>
        <button onClick={() => setPmIndex(i => Math.max(0, i - 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={18} color={pmIndex === 0 ? 'var(--text-tertiary)' : '#fff'} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{currentPm.monat} 2026</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            P-Schluss: {currentPm.deadline.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
          </div>
        </div>
        <button onClick={() => setPmIndex(i => Math.min(PRODUKTIONSMONATE.length - 1, i + 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <ChevronRight size={18} color={pmIndex === PRODUKTIONSMONATE.length - 1 ? 'var(--text-tertiary)' : '#fff'} />
        </button>
      </div>

      {/* Goal card */}
      <div style={{
        backgroundColor: 'var(--bg-card)', borderRadius: 18,
        padding: '20px 20px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <GoalRing einheiten={totalEinheiten} goal={goal} />

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 8 }}>
            MONATSZIEL
          </div>
          {editGoal ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number" value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                autoFocus
                style={{ ...iStyle, width: 80, textAlign: 'center', padding: '8px' }}
              />
              <button onClick={saveGoal} style={{ background: '#22c55e', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
                <Check size={15} color="#fff" />
              </button>
              <button onClick={() => setEditGoal(false)} style={{ background: 'var(--bg-hover)', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
                <X size={15} color="var(--text-tertiary)" />
              </button>
            </div>
          ) : (
            <button onClick={() => { setGoalInput(String(goal)); setEditGoal(true) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{goal} E</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Tippen zum Ändern</div>
            </button>
          )}

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { label: 'Erreicht', val: `${totalEinheiten.toFixed(2).replace('.', ',')} E`, color: '#1e7ef7' },
              { label: 'Offen', val: `${Math.max(0, goal - totalEinheiten).toFixed(2).replace('.', ',')} E`, color: '#f59e0b' },
              { label: 'Abschlüsse', val: `${abschluesse.length}`, color: '#22c55e' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', padding: '0 4px 10px', marginTop: 8 }}>
        ABSCHLÜSSE ({abschluesse.length})
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>Lade…</div>
      ) : abschluesse.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
          <Target size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
          <div style={{ fontSize: 14 }}>Noch keine Abschlüsse diesen Monat</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {abschluesse.map(a => (
            <div key={a.id} style={{
              backgroundColor: 'var(--bg-card)', borderRadius: 14,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              {/* Einheiten badge */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                backgroundColor: 'rgba(30,126,247,0.12)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#1e7ef7', lineHeight: 1 }}>
                  {a.einheiten % 1 === 0 ? a.einheiten : a.einheiten.toFixed(2).replace('.', ',')}
                </span>
                <span style={{ fontSize: 9, color: 'rgba(30,126,247,0.6)', fontWeight: 700 }}>E</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.contact_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.produkt}</div>
                {a.notiz && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.notiz}</div>}
              </div>

              {/* Date + delete */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {new Date(a.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                </span>
                <button onClick={() => handleDelete(a.id)}
                  style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 7, padding: '5px 7px', cursor: 'pointer' }}>
                  <Trash2 size={13} color="#ef4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', backgroundColor: '#0d1220',
            borderRadius: '22px 22px 0 0', padding: '20px 20px 40px',
            maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Neuer Abschluss</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-tertiary)" />
              </button>
            </div>

            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>KUNDENNAME</label>
                <input value={fName} onChange={e => setFName(e.target.value)} required placeholder="Max Mustermann" style={iStyle} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>PRODUKT</label>
                <select value={fProdukt} onChange={e => setFProdukt(e.target.value)} style={{ ...iStyle, appearance: 'none' }}>
                  {PRODUKTE.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>EINHEITEN</label>
                  <input type="number" step="0.01" value={fEinheiten} onChange={e => setFEinheiten(e.target.value)} required placeholder="4.50" inputMode="decimal" style={iStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>DATUM</label>
                  <input type="date" value={fDatum} onChange={e => setFDatum(e.target.value)} style={iStyle} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>NOTIZ (optional)</label>
                <input value={fNotiz} onChange={e => setFNotiz(e.target.value)} placeholder="z.B. Über Empfehlung" style={iStyle} />
              </div>

              <button type="submit" disabled={saving || !fName.trim() || !fEinheiten} style={{
                width: '100%', padding: '14px', borderRadius: 14,
                backgroundColor: saving || !fName.trim() || !fEinheiten ? 'var(--bg-hover)' : '#1e7ef7',
                color: saving || !fName.trim() || !fEinheiten ? 'var(--text-tertiary)' : '#fff',
                border: 'none', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 4,
              }}>
                {saving ? 'Speichern…' : '✓ Abschluss speichern'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
