'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { VG_STAGES, RG_STAGES, PRODUKTIONSMONATE } from '@/lib/ergo'

interface Contact {
  id: string
  vg_stage: string | null
  rg_stage: string | null
  created_at: string
}
interface Entry { id: string; status: string }
interface TSession {
  id: string; date: string; ttv_goal: number; tv_goal: number
  ttv_entries: Entry[]
}
interface Abschluss {
  einheiten: number
  datum: string
  produkt: string
}

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function FunnelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{count} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3, backgroundColor: color,
          width: `${pct}%`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function StatistikenPage() {
  const [contacts, setContacts]   = useState<Contact[]>([])
  const [sessions, setSessions]   = useState<TSession[]>([])
  const [abschluesse, setAbschluesse] = useState<Abschluss[]>([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    const [{ data: cData }, { data: sData }, { data: aData }] = await Promise.all([
      supabase.from('contacts').select('id,vg_stage,rg_stage,created_at'),
      supabase.from('ttv_sessions').select('*, ttv_entries(id,status)').order('date'),
      supabase.from('abschluesse').select('einheiten,datum,produkt'),
    ])
    setContacts((cData || []) as Contact[])
    setSessions((sData || []) as TSession[])
    setAbschluesse((aData || []) as Abschluss[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* ── VG Funnel ── */
  const total = contacts.length
  const vgFunnel = VG_STAGES.map(s => ({
    ...s,
    count: contacts.filter(c => c.vg_stage === s.id).length,
  }))
  const rgFunnel = RG_STAGES.map(s => ({
    ...s,
    count: contacts.filter(c => c.rg_stage === s.id).length,
  }))
  const withVG = contacts.filter(c => c.vg_stage).length
  const withRG = contacts.filter(c => c.rg_stage).length
  const offen  = contacts.filter(c => !c.vg_stage && !c.rg_stage).length

  /* ── TTV Stats ── */
  const totalCalls   = sessions.reduce((s, sess) =>
    s + (sess.ttv_entries || []).filter(e => e.status !== 'offen').length, 0)
  const totalTermine = sessions.reduce((s, sess) =>
    s + (sess.ttv_entries || []).filter(e => e.status === 'termin_gelegt' || e.status === 'tv_gemacht').length, 0)
  const convRate = totalCalls > 0 ? Math.round((totalTermine / totalCalls) * 100) : 0

  /* ── Beste Wochentage (by Termine count) ── */
  const dayTermine = Array(7).fill(0)
  sessions.forEach(sess => {
    const day = new Date(sess.date).getDay()
    const termine = (sess.ttv_entries || []).filter(e =>
      e.status === 'termin_gelegt' || e.status === 'tv_gemacht'
    ).length
    dayTermine[day] += termine
  })
  const maxDay = Math.max(...dayTermine, 1)
  const bestDayIdx = dayTermine.indexOf(maxDay)

  /* ── Einheiten pro Monat ── */
  const einheitenByMonth = PRODUKTIONSMONATE.map((pm, i) => {
    const prev = i === 0 ? new Date('2026-01-01') : PRODUKTIONSMONATE[i - 1].deadline
    const sum = abschluesse
      .filter(a => {
        const d = a.datum
        return d >= prev.toISOString().split('T')[0] && d <= pm.deadline.toISOString().split('T')[0]
      })
      .reduce((s, a) => s + a.einheiten, 0)
    return { monat: pm.monat.slice(0, 3), sum }
  }).filter(m => m.sum > 0)

  const maxE = Math.max(...einheitenByMonth.map(m => m.sum), 1)

  /* ── Top Produkte ── */
  const produktMap: Record<string, number> = {}
  abschluesse.forEach(a => {
    produktMap[a.produkt] = (produktMap[a.produkt] || 0) + a.einheiten
  })
  const topProdukte = Object.entries(produktMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const totalEinheiten = abschluesse.reduce((s, a) => s + a.einheiten, 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-tertiary)' }}>
      Lade…
    </div>
  )

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px 100px' }}>

      {/* Header */}
      <div style={{ padding: '20px 0 22px' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
          Statistiken
        </h1>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
          {total} Kontakte gesamt
        </div>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <StatCard label="GESAMT" value={total} />
        <StatCard label="IN VG" value={withVG} color="#6366f1" />
        <StatCard label="IN RG" value={withRG} color="#22c55e" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        <StatCard label="OFFEN" value={offen} color="#4a5568" />
        <StatCard label="CONV." value={`${convRate}%`} color="#1e7ef7" sub="Anruf → Termin" />
        <StatCard label="EINHEITEN" value={totalEinheiten.toFixed(1).replace('.', ',')} color="#f59e0b" sub="gesamt" />
      </div>

      {/* VG Funnel */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', padding: '0 4px 10px' }}>
        VG PIPELINE
      </div>
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
        {vgFunnel.map(s => (
          <FunnelBar key={s.id} label={s.label} count={s.count} total={withVG || 1} color={s.color} />
        ))}
      </div>

      {/* RG Funnel */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', padding: '0 4px 10px', marginTop: 8 }}>
        RG PIPELINE
      </div>
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
        {rgFunnel.map(s => (
          <FunnelBar key={s.id} label={s.label} count={s.count} total={withRG || 1} color={s.color} />
        ))}
      </div>

      {/* Beste Wochentage */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', padding: '0 4px 10px', marginTop: 8 }}>
        BESTE WOCHENTAGE (Termine)
      </div>
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '18px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 80 }}>
          {WOCHENTAGE.map((label, i) => {
            const val = dayTermine[i]
            const h = Math.round((val / maxDay) * 64)
            const isBest = i === bestDayIdx && val > 0
            return (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: isBest ? '#1e7ef7' : 'var(--text-tertiary)', fontWeight: isBest ? 700 : 400 }}>{val}</span>
                <div style={{
                  width: '100%', borderRadius: 4,
                  height: Math.max(h, 4),
                  backgroundColor: isBest ? '#1e7ef7' : 'rgba(255,255,255,0.08)',
                  transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
                }} />
                <span style={{ fontSize: 10, color: isBest ? '#fff' : 'var(--text-tertiary)', fontWeight: isBest ? 700 : 400 }}>{label}</span>
              </div>
            )
          })}
        </div>
        {bestDayIdx >= 0 && dayTermine[bestDayIdx] > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#1e7ef7', textAlign: 'center', fontWeight: 600 }}>
            🏆 Bester Tag: {WOCHENTAGE[bestDayIdx]} mit {dayTermine[bestDayIdx]} Terminen
          </div>
        )}
      </div>

      {/* Einheiten pro Monat */}
      {einheitenByMonth.length > 0 && (<>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', padding: '0 4px 10px', marginTop: 8 }}>
          EINHEITEN PRO MONAT
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '18px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {einheitenByMonth.map(m => {
              const h = Math.round((m.sum / maxE) * 64)
              return (
                <div key={m.monat} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{m.sum.toFixed(0)}</span>
                  <div style={{ width: '100%', borderRadius: 4, height: Math.max(h, 4), backgroundColor: '#1e7ef7', opacity: 0.85 }} />
                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{m.monat}</span>
                </div>
              )
            })}
          </div>
        </div>
      </>)}

      {/* Top Produkte */}
      {topProdukte.length > 0 && (<>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', padding: '0 4px 10px', marginTop: 8 }}>
          TOP PRODUKTE (Einheiten)
        </div>
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
          {topProdukte.map(([produkt, e], i) => (
            <div key={produkt} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < topProdukte.length - 1 ? 12 : 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                backgroundColor: 'rgba(30,126,247,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#1e7ef7',
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{produkt}</div>
                <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.07)', marginTop: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, backgroundColor: '#1e7ef7', width: `${Math.round((e / topProdukte[0][1]) * 100)}%` }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e7ef7', flexShrink: 0 }}>
                {e.toFixed(2).replace('.', ',')} E
              </span>
            </div>
          ))}
        </div>
      </>)}

      {/* TTV Summary */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.1em', padding: '0 4px 10px', marginTop: 8 }}>
        TTV GESAMT
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <StatCard label="ANRUFE" value={totalCalls} color="#1e7ef7" sub="gesamt telefoniert" />
        <StatCard label="TERMINE" value={totalTermine} color="#22c55e" sub="vereinbart" />
      </div>
    </div>
  )
}
