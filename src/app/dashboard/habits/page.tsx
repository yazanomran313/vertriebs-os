'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Check, X, Flame } from 'lucide-react'

interface Habit {
  id: string
  name: string
  emoji: string
  color: string
  target_per_week: number
  created_at: string
}

interface HabitLog {
  id: string
  habit_id: string
  date: string
}

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#8b5cf6', '#e1306c', '#f97316']
const EMOJIS = ['💪', '🏃', '📚', '💧', '🧘', '🥗', '📞', '✍️', '🎯', '🌅', '💊', '🧠']

function getLast7Days() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)
}

const iStyle: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

export default function HabitsPage() {
  const [habits, setHabits]   = useState<Habit[]>([])
  const [logs, setLogs]       = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [fName, setFName]     = useState('')
  const [fEmoji, setFEmoji]   = useState('💪')
  const [fColor, setFColor]   = useState('#6366f1')
  const [fTarget, setFTarget] = useState(5)
  const [saving, setSaving]   = useState(false)

  const days = getLast7Days()
  const today = days[days.length - 1]

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: hData }, { data: lData }] = await Promise.all([
      supabase.from('habits').select('*').order('created_at'),
      supabase.from('habit_logs').select('*').gte('date', days[0]),
    ])
    setHabits((hData || []) as Habit[])
    setLogs((lData || []) as HabitLog[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function isLogged(habitId: string, date: string) {
    return logs.some(l => l.habit_id === habitId && l.date === date)
  }

  async function toggleLog(habitId: string, date: string) {
    if (isLogged(habitId, date)) {
      const log = logs.find(l => l.habit_id === habitId && l.date === date)!
      await supabase.from('habit_logs').delete().eq('id', log.id)
      setLogs(prev => prev.filter(l => l.id !== log.id))
    } else {
      const { data } = await supabase.from('habit_logs').insert([{ habit_id: habitId, date }]).select().single()
      if (data) setLogs(prev => [...prev, data as HabitLog])
    }
  }

  async function addHabit() {
    if (!fName.trim()) return
    setSaving(true)
    const { data } = await supabase.from('habits').insert([{ name: fName.trim(), emoji: fEmoji, color: fColor, target_per_week: fTarget }]).select().single()
    if (data) setHabits(prev => [...prev, data as Habit])
    setFName(''); setSaving(false); setShowAdd(false)
  }

  async function deleteHabit(id: string) {
    if (!confirm('Habit löschen?')) return
    await supabase.from('habits').delete().eq('id', id)
    setHabits(prev => prev.filter(h => h.id !== id))
    setLogs(prev => prev.filter(l => l.habit_id !== id))
  }

  // Streak calculation
  function getStreak(habitId: string) {
    let streak = 0
    const check = new Date()
    for (let i = 0; i < 30; i++) {
      const d = check.toISOString().split('T')[0]
      if (logs.some(l => l.habit_id === habitId && l.date === d)) { streak++; check.setDate(check.getDate() - 1) }
      else break
    }
    return streak
  }

  function getWeekCount(habitId: string) {
    return days.filter(d => isLogged(habitId, d)).length
  }

  const todayDone = habits.filter(h => isLogged(h.id, today)).length
  const todayTotal = habits.length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔥 Habits</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Heute: {todayDone}/{todayTotal} erledigt
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> Habit hinzufügen
        </button>
      </div>

      {/* Today progress */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ fontWeight: 700 }}>Heute — {todayDone}/{todayTotal}</span>
          <span style={{ color: todayDone === todayTotal && todayTotal > 0 ? '#22c55e' : 'var(--text-secondary)', fontWeight: 600 }}>
            {todayDone === todayTotal && todayTotal > 0 ? 'Alle erledigt! 🎉' : `${todayTotal - todayDone} übrig`}
          </span>
        </div>
        <div style={{ height: 10, backgroundColor: 'var(--bg-hover)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 6, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* Habit grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Lade…</div>
      ) : habits.length === 0 ? (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Keine Habits</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Starte deinen ersten Habit-Tracker.</div>
          <button onClick={() => setShowAdd(true)} style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Ersten Habit erstellen
          </button>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7,40px) 60px 36px', gap: 4, padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
            <span>HABIT</span>
            {days.map(d => <span key={d} style={{ textAlign: 'center', color: d === today ? '#6366f1' : 'inherit' }}>{dayLabel(d)}</span>)}
            <span style={{ textAlign: 'center' }}>WOCHE</span>
            <span />
          </div>

          {habits.map(h => {
            const streak = getStreak(h.id)
            const weekCount = getWeekCount(h.id)
            const pct = Math.round(weekCount / 7 * 100)
            return (
              <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7,40px) 60px 36px', gap: 4, padding: '12px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                {/* Name + streak */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{h.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</div>
                    {streak > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#f59e0b' }}>
                        <Flame size={10} /> {streak} Tage Streak
                      </div>
                    )}
                  </div>
                </div>

                {/* Day checkboxes */}
                {days.map(d => {
                  const done = isLogged(h.id, d)
                  const isToday = d === today
                  return (
                    <button key={d} onClick={() => toggleLog(h.id, d)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: `2px solid ${done ? h.color : 'var(--border)'}`, backgroundColor: done ? h.color + '30' : 'var(--bg-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', outline: isToday ? `2px solid ${h.color}60` : 'none' }}>
                      {done && <Check size={14} color={h.color} strokeWidth={3} />}
                    </button>
                  )
                })}

                {/* Week bar */}
                <div style={{ padding: '0 4px' }}>
                  <div style={{ fontSize: 10, textAlign: 'center', marginBottom: 2, color: 'var(--text-secondary)', fontWeight: 700 }}>{weekCount}/7</div>
                  <div style={{ height: 6, backgroundColor: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: h.color, borderRadius: 3 }} />
                  </div>
                </div>

                <button onClick={() => deleteHabit(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', opacity: 0.4, margin: '0 auto', display: 'flex' }}>
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
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 26, width: 420, maxWidth: '94vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🔥 Neuer Habit</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={fName} onChange={e => setFName(e.target.value)} placeholder="Habit-Name *" style={iStyle} autoFocus />
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Emoji</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setFEmoji(e)}
                      style={{ fontSize: 20, padding: '4px 6px', borderRadius: 7, border: `2px solid ${fEmoji === e ? '#6366f1' : 'var(--border)'}`, backgroundColor: fEmoji === e ? '#6366f120' : 'var(--bg-hover)', cursor: 'pointer' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Farbe</div>
                <div style={{ display: 'flex', gap: 7 }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setFColor(c)}
                      style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: c, border: `3px solid ${fColor === c ? '#fff' : 'transparent'}`, cursor: 'pointer', outline: fColor === c ? `2px solid ${c}` : 'none' }} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Ziel pro Woche</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[3, 4, 5, 6, 7].map(n => (
                    <button key={n} onClick={() => setFTarget(n)}
                      style={{ flex: 1, padding: '7px', borderRadius: 7, border: `2px solid ${fTarget === n ? '#6366f1' : 'var(--border)'}`, backgroundColor: fTarget === n ? '#6366f120' : 'var(--bg-hover)', color: fTarget === n ? '#6366f1' : 'var(--text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {n}×
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Abbrechen</button>
                <button onClick={addHabit} disabled={saving || !fName.trim()}
                  style={{ flex: 2, backgroundColor: saving || !fName.trim() ? 'var(--bg-hover)' : '#6366f1', color: saving || !fName.trim() ? 'var(--text-secondary)' : '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {saving ? 'Speichern…' : 'Erstellen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
