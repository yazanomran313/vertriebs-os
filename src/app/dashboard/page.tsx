'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentProduktionsmonat, formatCountdown } from '@/lib/ergo'
import { AlertTriangle, ChevronRight, Flame, Plus, Phone, MessageSquare, Bell } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ─── Types ─── */
interface Entry { id: string; status: string }
interface TSession {
  id: string; date: string; ttv_goal: number; tv_goal: number
  ttv_entries: Entry[]
}
interface Contact {
  id: string; name: string; phone: string | null
  vg_stage: string | null; rg_stage: string | null
  last_contact: string | null; created_at: string
}

/* ─── Helpers ─── */
function todayIso() { return new Date().toISOString().split('T')[0] }

function sessionStats(s: TSession) {
  const entries = (s.ttv_entries || [])
  const ttv        = entries.filter(e => (e.status as string) !== 'offen').length
  const termine    = entries.filter(e =>
    (e.status as string) === 'termin_gelegt' || (e.status as string) === 'tv_gemacht'
  ).length
  const goalHit = ttv >= s.ttv_goal && s.ttv_goal > 0 && termine >= s.tv_goal && s.tv_goal > 0
  return { ttv, termine, goalHit }
}

function calcStreak(sessions: TSession[]): number {
  const map = new Map(sessions.map(s => [s.date, s]))
  let streak = 0
  const d = new Date(); d.setDate(d.getDate() - 1)
  while (true) {
    const iso = d.toISOString().split('T')[0]
    const s   = map.get(iso)
    if (s && sessionStats(s).goalHit) { streak++; d.setDate(d.getDate() - 1) } else break
  }
  return streak
}

function getWeekDays(): string[] {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

/* ─── Ring component ─── */
function Ring({ pct, color, label, val, goal }: { pct: number; color: string; label: string; val: number; goal: number }) {
  const r = 28; const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct / 100, 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: pct >= 100 ? 18 : 17, fontWeight: 800, color: pct >= 100 ? color : 'var(--text-primary)' }}>
            {pct >= 100 ? '🎯' : `${val}`}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color }}>
          {val}/{goal}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
export default function HeutePage() {
  const router = useRouter()
  const [loading, setLoading]         = useState(true)
  const [userName, setUserName]       = useState('')
  const [todaySession, setTodaySession] = useState<TSession | null>(null)
  const [allSessions, setAllSessions]   = useState<TSession[]>([])
  const [streak, setStreak]           = useState(0)
  const [contacts, setContacts]       = useState<Contact[]>([])
  const [countdown, setCountdown]     = useState({ text: '…', status: 'normal' as 'normal' | 'today' | 'critical' })
  const pm = getCurrentProduktionsmonat()

  const load = useCallback(async () => {
    const [{ data: { user } }, { data: sessData }, { data: cData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('ttv_sessions').select('*, ttv_entries(id, status)').order('date', { ascending: false }),
      supabase.from('contacts').select('id,name,phone,vg_stage,rg_stage,last_contact,created_at'),
    ])
    if (user) {
      const { data: p } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      if (p?.name) setUserName(p.name.split(' ')[0])
    }
    const sessions = (sessData || []) as TSession[]
    const today = todayIso()
    setAllSessions(sessions)
    setTodaySession(sessions.find(s => s.date === today) ?? null)
    setStreak(calcStreak(sessions))
    setContacts((cData || []) as Contact[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const tick = () => setCountdown(formatCountdown(pm.deadline))
    tick(); const iv = setInterval(tick, 30000); return () => clearInterval(iv)
  }, [load])

  const today    = todayIso()
  const weekDays = getWeekDays()
  const weekDayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
  const sessionMap = new Map(allSessions.map(s => [s.date, s]))

  const todayStats = todaySession ? sessionStats(todaySession) : null
  const ttvPct     = todaySession && todaySession.ttv_goal ? Math.round((todayStats!.ttv / todaySession.ttv_goal) * 100) : 0
  const termPct    = todaySession && todaySession.tv_goal  ? Math.round((todayStats!.termine / todaySession.tv_goal) * 100) : 0

  const weekSessions = weekDays.map(d => sessionMap.get(d) ?? null)
  const weekTTV    = weekSessions.reduce((s, w) => s + (w ? sessionStats(w).ttv : 0), 0)
  const weekTermine= weekSessions.reduce((s, w) => s + (w ? sessionStats(w).termine : 0), 0)
  const weekGoals  = weekSessions.filter(w => w && sessionStats(w).goalHit).length

  // ── Smart call list ──────────────────────────────────────────────────────
  function getCallbacks(): Record<string, string> {
    try { return JSON.parse(localStorage.getItem('callbacks') || '{}') } catch { return {} }
  }
  const callbacks = typeof window !== 'undefined' ? getCallbacks() : {}

  const activeContacts = contacts.filter(c => c.vg_stage || c.rg_stage)
  const todayStr = today

  // Priority 1: scheduled callback overdue or today
  const callbackDue = activeContacts.filter(c => {
    const cb = callbacks[c.id]
    return cb && cb <= todayStr
  }).map(c => ({ ...c, reason: callbacks[c.id] < todayStr ? 'Überfälliger Rückruf' : 'Rückruf heute', priority: 0, days: Math.floor((Date.now() - new Date(callbacks[c.id]).getTime()) / 86400000) }))

  // Priority 2: active contacts not reached in 5+ days
  const coldPipeline = activeContacts
    .filter(c => !callbacks[c.id] || callbacks[c.id] > todayStr)
    .map(c => {
      const days = Math.floor((Date.now() - new Date(c.last_contact || c.created_at).getTime()) / 86400000)
      return { ...c, reason: `Seit ${days} Tagen kein Kontakt`, priority: 1, days }
    })
    .filter(c => c.days >= 5)
    .sort((a, b) => b.days - a.days)

  const callList = [...callbackDue, ...coldPipeline].slice(0, 6)

  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'
  const dateLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })
  const cdColor = countdown.status === 'critical' ? '#ef4444' : countdown.status === 'today' ? '#f59e0b' : '#1e7ef7'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', color: 'var(--text-secondary)', fontSize: 14 }}>
      Lade…
    </div>
  )

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 100px' }}>

      {/* ── FTMO-Style Page Header ── */}
      <div style={{ padding: '20px 0 22px' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 4px', fontWeight: 500 }}>{dateLabel}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.3px', lineHeight: 1.1, color: '#fff' }}>
            {greet}{userName ? `, ${userName}` : ''} 👋
          </h1>
          {streak > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(245,158,11,0.12)',
              borderRadius: 20, padding: '6px 12px',
            }}>
              <Flame size={14} color="#f59e0b" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── TTV TODAY CARD ── */}
      <Link href="/dashboard/ttv" style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 18, padding: '18px 18px', cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 4 }}>
                📞 TTV HEUTE
              </div>
              {todaySession ? (
                <div style={{ fontSize: 15, fontWeight: 800 }}>
                  {todayStats!.ttv >= todaySession.ttv_goal && todayStats!.termine >= todaySession.tv_goal
                    ? '🎯 Beide Ziele erreicht!'
                    : `${todayStats!.ttv}/${todaySession.ttv_goal} Anrufe · ${todayStats!.termine}/${todaySession.tv_goal} Termine`
                  }
                </div>
              ) : (
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Noch keine Session heute</div>
              )}
            </div>
            <ChevronRight size={18} color="var(--text-tertiary)" />
          </div>

          {todaySession ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
              <Ring pct={ttvPct} color="#6366f1" label="Anrufe (TTV)" val={todayStats!.ttv} goal={todaySession.ttv_goal} />
              <Ring pct={termPct} color="#30D158" label="Termine" val={todayStats!.termine} goal={todaySession.tv_goal} />
            </div>
          ) : (
            <div style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 20px #6366f140',
            }}>
              <Plus size={18} />
              TTV Session starten
            </div>
          )}
        </div>
      </Link>

      {/* ── DIESE WOCHE ── */}
      <Link href="/dashboard/ttv" style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 18, padding: '16px 18px', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            📅 DIESE WOCHE
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: weekGoals >= 5 ? '#30D158' : 'var(--text-secondary)' }}>
            {weekGoals}/7 Ziele
          </div>
        </div>

        {/* Day strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 14 }}>
          {weekDays.map((d, i) => {
            const s       = sessionMap.get(d)
            const isToday = d === today
            const isPast  = d < today
            const st      = s ? sessionStats(s) : null
            const hit     = st?.goalHit
            const partial = st && !hit && (st.ttv > 0 || st.termine > 0)
            return (
              <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: isToday ? '#6366f1' : 'var(--text-tertiary)' }}>
                  {weekDayLabels[i]}
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  backgroundColor: hit ? '#30D15820' : partial ? '#6366f115' : isToday ? '#6366f10a' : 'var(--bg-hover)',
                  border: `1px solid ${hit ? '#30D15850' : partial ? '#6366f140' : isToday ? '#6366f130' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                }}>
                  {hit ? '🎯' : partial ? '📞' : isPast && !isToday ? '—' : isToday ? '·' : ''}
                </div>
              </div>
            )
          })}
        </div>

        {/* Week totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Anrufe', val: weekTTV, color: '#6366f1' },
            { label: 'Termine', val: weekTermine, color: '#30D158' },
            { label: 'Ziele', val: `${weekGoals}/7`, color: '#FF9F0A' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', backgroundColor: 'var(--bg-hover)', borderRadius: 10, padding: '8px 4px' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      </Link>

      {/* ── QUICK ACTIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <Link href="/dashboard/ttv" style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e7ef7, #6366f1)',
            borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72,
          }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 11, padding: 9, flexShrink: 0 }}>
              <Phone size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>TTV</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Kalender starten</div>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/pipeline" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 72,
          }}>
            <div style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 11, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>📈</span>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Pipeline</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {contacts.filter(c => c.vg_stage && c.vg_stage !== 'abgeschlossen').length} aktiv
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── P-SCHLUSS ── */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 16, padding: '14px 18px', marginBottom: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 3 }}>
            ⏱ P-SCHLUSS · {pm.monat.toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {pm.deadline.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} · 17:30 Uhr
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: cdColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
            {countdown.text}
          </div>
          <div style={{ fontSize: 10, color: cdColor, fontWeight: 700 }}>
            {countdown.status === 'critical' ? '🔴 KRITISCH' : countdown.status === 'today' ? '🟡 HEUTE' : 'verbleibend'}
          </div>
        </div>
      </div>

      {/* ── HEUTE ANRUFEN ── */}
      {callList.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 2px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Heute anrufen
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: callbackDue.length > 0 ? '#ef4444' : '#f59e0b', backgroundColor: (callbackDue.length > 0 ? '#ef4444' : '#f59e0b') + '18', padding: '3px 10px', borderRadius: 12 }}>
              {callList.length} Kontakte
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden' }}>
            {callList.map((c, i) => {
              const isCallback = c.priority === 0
              const accentColor = isCallback ? '#FF453A' : '#FF9F0A'
              return (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderBottom: i < callList.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}>
                  {/* Icon */}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: accentColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isCallback ? <Bell size={15} color={accentColor} /> : <AlertTriangle size={15} color={accentColor} />}
                  </div>

                  {/* Name + reason */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: accentColor, marginTop: 1, fontWeight: isCallback ? 700 : 400 }}>{c.reason}</div>
                  </div>

                  {/* Quick actions */}
                  {c.phone ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={`tel:${c.phone}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, backgroundColor: '#30D15818', textDecoration: 'none' }}>
                        <Phone size={15} color="#30D158" />
                      </a>
                      <a href={`https://wa.me/${c.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, backgroundColor: '#6366f118', textDecoration: 'none' }}>
                        <MessageSquare size={15} color="#6366f1" />
                      </a>
                    </div>
                  ) : (
                    <Link href="/dashboard/namensliste" style={{ textDecoration: 'none' }}>
                      <ChevronRight size={16} color="var(--text-tertiary)" />
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
          <Link href="/dashboard/namensliste" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', padding: '10px', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Alle Kontakte →
          </Link>
        </div>
      )}

    </div>
  )
}
