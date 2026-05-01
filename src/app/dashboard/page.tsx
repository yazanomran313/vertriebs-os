'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentProduktionsmonat, formatCountdown } from '@/lib/ergo'
import { AlertTriangle, TrendingUp, Users, Phone, Target, Zap, ChevronRight } from 'lucide-react'
import Link from 'next/link'

/* ─── Types ──────────────────────────────────────────────────────── */
interface Contact {
  id: string; name: string; pipeline: string; stage: string
  vg_stage: string | null; rg_stage: string | null
  einheiten: number | null; created_at: string; last_contact: string | null
}
interface CallLog {
  id: string; date: string; outcome: string; type: string; contact_name: string
}

type Period = 'heute' | 'woche' | 'monat'

/* ─── Helpers ─────────────────────────────────────────────────────── */
function startOf(period: Period): Date {
  const d = new Date()
  if (period === 'heute') { d.setHours(0,0,0,0); return d }
  if (period === 'woche') { d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d }
  d.setDate(1); d.setHours(0,0,0,0); return d
}

function getLast30Days() {
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function dayLabel(iso: string, short = true) {
  const d = new Date(iso)
  if (short) return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

/* ─── Main ────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [calls, setCalls]       = useState<CallLog[]>([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState<Period>('heute')
  const [countdown, setCountdown] = useState({ text: '...', status: 'normal' as 'normal' | 'today' | 'critical' })
  const pm = getCurrentProduktionsmonat()

  const load = useCallback(async () => {
    const [{ data: cData }, { data: lData }] = await Promise.all([
      supabase.from('contacts').select('id,name,pipeline,stage,vg_stage,rg_stage,einheiten,created_at,last_contact'),
      supabase.from('call_logs').select('id,date,outcome,type,contact_name').order('date', { ascending: false }),
    ])
    setContacts((cData || []) as Contact[])
    setCalls((lData || []) as CallLog[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const tick = () => setCountdown(formatCountdown(pm.deadline))
    tick(); const iv = setInterval(tick, 60000); return () => clearInterval(iv)
  }, [load])

  /* ── Period filter ── */
  const since = startOf(period)
  const periodCalls = calls.filter(l => new Date(l.date) >= since)

  /* ── Call stats ── */
  const callsTotal   = periodCalls.length
  const termine      = periodCalls.filter(l => l.outcome === 'termin').length
  const abschluesse  = periodCalls.filter(l => l.outcome === 'abgeschlossen').length
  const terminRate   = callsTotal > 0 ? Math.round(termine / callsTotal * 100) : 0

  /* ── Today target ── */
  const todayCalls = calls.filter(l => new Date(l.date).toDateString() === new Date().toDateString()).length
  const todayTarget = 5

  /* ── VG stats (using vg_stage) ── */
  const vgAll         = contacts.filter(c => c.vg_stage)
  const vgAbg         = contacts.filter(c => c.vg_stage === 'abgeschlossen')
  const vgBeraten     = contacts.filter(c => c.vg_stage === 'beraten')
  const vgEinheiten   = vgAbg.reduce((s, c) => s + (c.einheiten || 0), 0)
  const vgConvRate    = vgAll.length > 0 ? Math.round(vgAbg.length / vgAll.length * 100) : 0

  /* ── RG stats (using rg_stage) ── */
  const rgAll   = contacts.filter(c => c.rg_stage)
  const rgTeam  = contacts.filter(c => c.rg_stage === 'im_team')

  /* ── Reminders: in "beraten" > 7 days ── */
  const reminders = vgBeraten.filter(c => {
    const lc = c.last_contact || c.created_at
    return Math.floor((Date.now() - new Date(lc).getTime()) / 86400000) >= 7
  })

  /* ── 30-day activity chart data ── */
  const last30 = getLast30Days()
  const chartData = last30.map(day => ({
    day,
    calls: calls.filter(l => l.date === day).length,
    termine: calls.filter(l => l.date === day && l.outcome === 'termin').length,
  }))
  const chartMax = Math.max(...chartData.map(d => d.calls), 1)

  /* ── Monthly comparison ── */
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0)
  const lastMonthStart = new Date(thisMonth); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1)
  const lastMonthEnd   = new Date(thisMonth)
  const thisMonthCalls = calls.filter(l => new Date(l.date) >= thisMonth).length
  const lastMonthCalls = calls.filter(l => new Date(l.date) >= lastMonthStart && new Date(l.date) < lastMonthEnd).length
  const callTrend = lastMonthCalls > 0 ? Math.round((thisMonthCalls - lastMonthCalls) / lastMonthCalls * 100) : 0

  const countdownColor = countdown.status === 'critical' ? '#ef4444' : '#f59e0b'
  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-secondary)', fontSize: 13 }}>
      Lade…
    </div>
  )

  return (
    <div style={{ maxWidth: 900 }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 2 }}>{today}</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Guten Morgen, Yazan 👋</h1>
      </div>

      {/* ── P-SCHLUSS COUNTDOWN ── */}
      <div style={{ background: `linear-gradient(135deg,var(--bg-card),${countdownColor}12)`, border: `1px solid ${countdownColor}44`, borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: 3 }}>⏱ P-SCHLUSS · {pm.monat.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{pm.deadline.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} · 17:30 Uhr</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: countdownColor, fontVariantNumeric: 'tabular-nums' }}>{countdown.text}</div>
          <div style={{ fontSize: 10, color: countdownColor, fontWeight: 700 }}>
            {countdown.status === 'critical' ? '🔴 KRITISCH' : countdown.status === 'today' ? '🟡 HEUTE' : '⏱ verbleibend'}
          </div>
        </div>
      </div>

      {/* ── TODAY BAR ── */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={14} color="#6366f1" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Heute: {todayCalls}/{todayTarget} Anrufe</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: todayCalls >= todayTarget ? '#22c55e' : 'var(--text-secondary)', fontWeight: 600 }}>
              {todayCalls >= todayTarget ? '✅ Tagesziel erreicht!' : `Noch ${todayTarget - todayCalls} übrig`}
            </span>
            <Link href="/dashboard/calls" style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
              + Eintragen <ChevronRight size={12} />
            </Link>
          </div>
        </div>
        <div style={{ height: 12, backgroundColor: 'var(--bg-hover)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, todayCalls / todayTarget * 100)}%`, background: todayCalls >= todayTarget ? '#22c55e' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 6, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* ── PERIOD TABS ── */}
      <div style={{ display: 'flex', gap: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden', marginBottom: 16, width: 'fit-content' }}>
        {(['heute', 'woche', 'monat'] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: period === p ? 'var(--accent)' : 'transparent', color: period === p ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
            {p === 'heute' ? 'Heute' : p === 'woche' ? 'Diese Woche' : 'Dieser Monat'}
          </button>
        ))}
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Anrufe', value: callsTotal, sub: `Ziel: ${period === 'heute' ? 5 : period === 'woche' ? 35 : 150}`, color: '#6366f1', icon: <Phone size={15} /> },
          { label: 'Termine', value: termine, sub: `${terminRate}% Termin-Rate`, color: '#22c55e', icon: <Target size={15} /> },
          { label: 'Abschlüsse', value: abschluesse, sub: 'Leads converted', color: '#8b5cf6', icon: <Zap size={15} /> },
          { label: 'Einheiten (gesamt)', value: `${vgEinheiten.toFixed(1)} E`, sub: `${vgAbg.length} Abschlüsse`, color: '#f59e0b', icon: <TrendingUp size={15} /> },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 30-DAY ACTIVITY CHART ── */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>📊 Aktivitäts-Chart (30 Tage)</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {thisMonthCalls} Anrufe dieser Monat
              {lastMonthCalls > 0 && (
                <span style={{ marginLeft: 8, color: callTrend >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                  {callTrend >= 0 ? '↑' : '↓'} {Math.abs(callTrend)}% vs. letzten Monat
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#6366f1' }} /> Anrufe</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#22c55e' }} /> Termine</div>
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100, paddingBottom: 24, position: 'relative' }}>
          {/* Y-axis grid lines */}
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: 24 + pct * 76, borderTop: '1px dashed var(--border)', zIndex: 0 }} />
          ))}
          {chartData.map((d, i) => (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
              {/* Stacked bar: calls (grey base) + termine (green overlay) */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                {d.calls > 0 && (
                  <div title={`${d.calls} Anrufe · ${d.termine} Termine`}
                    style={{ width: '80%', height: Math.max(3, (d.calls / chartMax) * 76), backgroundColor: '#6366f1', borderRadius: '3px 3px 0 0', position: 'relative', cursor: 'default' }}>
                    {d.termine > 0 && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(d.termine / d.calls) * 100}%`, backgroundColor: '#22c55e', borderRadius: '3px 3px 0 0' }} />
                    )}
                  </div>
                )}
                {d.calls === 0 && (
                  <div style={{ width: '80%', height: 3, backgroundColor: 'var(--bg-hover)', borderRadius: 2 }} />
                )}
              </div>
              {/* Date label — show every 5th */}
              {i % 5 === 0 && (
                <div style={{ position: 'absolute', bottom: 0, fontSize: 9, color: 'var(--text-secondary)', whiteSpace: 'nowrap', transform: 'translateX(-50%)', left: '50%' }}>
                  {dayLabel(d.day)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── PIPELINE OVERVIEW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>

        {/* VG Funnel */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} color="#6366f1" />
              <span style={{ fontWeight: 700, fontSize: 13 }}>VG — Kundenverkauf</span>
            </div>
            <Link href="/dashboard/vg" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 700 }}>Öffnen →</Link>
          </div>
          {[
            { label: 'Kundenpotenzial', count: contacts.filter(c => c.vg_stage === 'kundenpotenzial').length, color: '#6366f1' },
            { label: 'Vorqualifiziert',  count: contacts.filter(c => c.vg_stage === 'vorqualifiziert').length,  color: '#f59e0b' },
            { label: 'Beraten',          count: contacts.filter(c => c.vg_stage === 'beraten').length,          color: '#06b6d4' },
            { label: 'Abgeschlossen',    count: contacts.filter(c => c.vg_stage === 'abgeschlossen').length,    color: '#22c55e' },
          ].map(s => {
            const max = Math.max(contacts.filter(c => c.vg_stage === 'kundenpotenzial').length, 1)
            return (
              <div key={s.label} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
                <div style={{ height: 6, backgroundColor: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (s.count / max) * 100)}%`, backgroundColor: s.color, borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Gesamt in Pipeline</span>
            <span style={{ fontWeight: 700, color: '#6366f1' }}>{vgAll.length} Kontakte · {vgConvRate}% Conv.</span>
          </div>
        </div>

        {/* RG Funnel */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} color="#22c55e" />
              <span style={{ fontWeight: 700, fontSize: 13 }}>RG — Rekrutierung</span>
            </div>
            <Link href="/dashboard/rg" style={{ fontSize: 11, color: '#22c55e', textDecoration: 'none', fontWeight: 700 }}>Öffnen →</Link>
          </div>
          {[
            { label: 'Partnerpotenzial',        count: contacts.filter(c => c.rg_stage === 'partnerpotenzial').length,        color: '#6366f1' },
            { label: 'Vorqualifiziert',          count: contacts.filter(c => c.rg_stage === 'vorqualifiziert').length,          color: '#f59e0b' },
            { label: 'Rekrutierungsgespräch',   count: contacts.filter(c => c.rg_stage === 'rekrutierungsgespraech').length,   color: '#8b5cf6' },
            { label: 'GST',                      count: contacts.filter(c => c.rg_stage === 'gst').length,                      color: '#06b6d4' },
            { label: 'Im Team',                  count: contacts.filter(c => c.rg_stage === 'im_team').length,                  color: '#22c55e' },
          ].map(s => {
            const max = Math.max(contacts.filter(c => c.rg_stage === 'partnerpotenzial').length, 1)
            return (
              <div key={s.label} style={{ marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
                <div style={{ height: 5, backgroundColor: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (s.count / max) * 100)}%`, backgroundColor: s.color, borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Im Team</span>
            <span style={{ fontWeight: 700, color: '#22c55e' }}>{rgTeam.length} von {rgAll.length}</span>
          </div>
        </div>
      </div>

      {/* ── MONATS-VERGLEICH ── */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📈 Monatsvergleich</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'Anrufe', this: thisMonthCalls, last: lastMonthCalls },
            { label: 'Termine', this: calls.filter(l => new Date(l.date) >= thisMonth && l.outcome === 'termin').length, last: calls.filter(l => new Date(l.date) >= lastMonthStart && new Date(l.date) < lastMonthEnd && l.outcome === 'termin').length },
            { label: 'VG Abschlüsse', this: vgAbg.filter(c => new Date(c.created_at) >= thisMonth).length, last: vgAbg.filter(c => { const d = new Date(c.created_at); return d >= lastMonthStart && d < lastMonthEnd }).length },
          ].map(s => {
            const trend = s.last > 0 ? Math.round((s.this - s.last) / s.last * 100) : 0
            const up = s.this >= s.last
            return (
              <div key={s.label} style={{ backgroundColor: 'var(--bg-hover)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{s.this}</div>
                <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: up ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                    {up ? '↑' : '↓'} {s.last > 0 ? `${Math.abs(trend)}%` : 'Neu'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>vs. {s.last} letzten Monat</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── ERINNERUNGEN ── */}
      {reminders.length > 0 && (
        <div style={{ backgroundColor: '#f59e0b12', border: '1px solid #f59e0b44', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={14} color="#f59e0b" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>Follow-up nötig — schon über 7 Tage in „Beraten"</span>
          </div>
          {reminders.slice(0, 5).map(c => {
            const days = Math.floor((Date.now() - new Date(c.last_contact || c.created_at).getTime()) / 86400000)
            return (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid #f59e0b22', fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: 12 }}>seit {days} Tagen</span>
              </div>
            )
          })}
          <Link href="/dashboard/vg" style={{ display: 'block', marginTop: 10, fontSize: 12, color: '#f59e0b', fontWeight: 700, textDecoration: 'none' }}>→ VG Pipeline öffnen</Link>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {[
          { label: '📞 Anruf eintragen', href: '/dashboard/calls', color: '#6366f1' },
          { label: '👤 Kontakt hinzufügen', href: '/dashboard/namensliste', color: '#06b6d4' },
          { label: '🤖 KI-Analyse', href: '/dashboard/ai-team', color: '#8b5cf6' },
          { label: '🎬 Content Studio', href: '/dashboard/content-studio', color: '#e1306c' },
        ].map(item => (
          <Link key={item.label} href={item.href}
            style={{ display: 'block', padding: '12px 14px', backgroundColor: 'var(--bg-card)', border: `1px solid ${item.color}33`, borderRadius: 10, fontSize: 12, color: item.color, textDecoration: 'none', fontWeight: 700, textAlign: 'center', transition: 'all 0.15s' }}>
            {item.label}
          </Link>
        ))}
      </div>

    </div>
  )
}
