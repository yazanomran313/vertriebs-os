'use client'

import { useState } from 'react'
import Link from 'next/link'
import { calcEinheiten, calcLaufzeit } from '@/lib/ergo'
import {
  TrendingUp, Users, Brain, Calculator,
  ChevronRight, RotateCcw, MessageCircle,
  Trophy, BarChart2,
} from 'lucide-react'

/* ─── Einheitenrechner ─── */
function Einheitenrechner() {
  const [sparsumme, setSparsumme] = useState('')
  const [alter, setAlter]         = useState('')
  const [open, setOpen]           = useState(false)

  const s = parseFloat(sparsumme)
  const a = parseInt(alter)
  const valid     = s > 0 && a >= 18 && a <= 66
  const laufzeit  = valid ? calcLaufzeit(a) : null
  const einheiten = valid ? calcEinheiten(s, a) : null

  const iStyle: React.CSSProperties = {
    flex: 1, padding: '13px 12px',
    backgroundColor: 'var(--bg-hover)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    fontSize: 16, fontWeight: 700, color: '#fff', outline: 'none',
    textAlign: 'center', WebkitAppearance: 'none', width: '100%',
    boxSizing: 'border-box',
  }

  function reset() { setSparsumme(''); setAlter('') }

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)',
      borderRadius: 16, overflow: 'hidden', marginBottom: 8,
    }}>
      {/* Row header — like FTMO list item */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left', minHeight: 56,
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          backgroundColor: 'rgba(255,159,10,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Calculator size={18} color="#f59e0b" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Einheitenrechner</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
            {valid ? `${einheiten?.toFixed(2).replace('.', ',')} E · ${laufzeit} Jahre` : 'Sparsumme & Alter eingeben'}
          </div>
        </div>
        <ChevronRight
          size={16}
          color="rgba(255,255,255,0.2)"
          style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>

      {/* Expanded calculator */}
      {open && (
        <div style={{ padding: '0 16px 18px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6 }}>
                SPARSUMME / MON (€)
              </div>
              <input
                type="number" inputMode="decimal" value={sparsumme}
                onChange={e => setSparsumme(e.target.value)}
                placeholder="200"
                style={iStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', marginBottom: 6 }}>
                ALTER (Jahre)
              </div>
              <input
                type="number" inputMode="numeric" value={alter}
                onChange={e => setAlter(e.target.value)}
                placeholder="32"
                style={iStyle}
              />
            </div>
          </div>

          {valid && einheiten !== null && laufzeit !== null ? (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: 14, padding: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.1em', marginBottom: 2 }}>EINHEITEN</div>
                  <div style={{ fontSize: 34, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                    {einheiten.toFixed(2).replace('.', ',')}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(245,158,11,0.5)', marginTop: 2 }}>E</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Laufzeit',      val: `${laufzeit} Jahre`,          color: '#1e7ef7' },
                    { label: 'Sparsumme',     val: `${s} €/Mon`,                color: '#22c55e' },
                    { label: 'Jahresbeitrag', val: `${(s * 12).toFixed(0)} €`,  color: '#06b6d4' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{item.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: 8 }}>
                  ABSCHLÜSSE FÜR ZIEL
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {[10, 20, 30, 50, 100].map(target => (
                    <div key={target} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>
                        {Math.ceil(target / einheiten)}×
                      </div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{target}E</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '18px',
              textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13,
            }}>
              {!sparsumme && !alter
                ? '👆 Sparsumme und Alter eingeben'
                : a < 18 || a > 66
                  ? '⚠️ Alter muss zwischen 18 und 66 liegen'
                  : '⚠️ Bitte gültige Werte eingeben'
              }
            </div>
          )}

          {(sparsumme || alter) && (
            <button onClick={reset}
              style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12 }}>
              <RotateCcw size={11} /> Zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── FTMO-Style Tool Row ─── */
function ToolRow({ href, icon, title, subtitle, iconColor = '#1e7ef7', iconBg }: {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
  iconColor?: string
  iconBg?: string
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block', marginBottom: 8 }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 16,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        minHeight: 62,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          backgroundColor: iconBg ?? `${iconColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>
        </div>
        <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
      </div>
    </Link>
  )
}

/* ─── Section Header ─── */
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '0 4px', marginBottom: 10, marginTop: 24,
    }}>
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════ */
export default function ToolsPage() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 80px' }}>

      {/* FTMO-Style Page Header */}
      <div style={{ padding: '20px 4px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
          Tools
        </h1>
      </div>

      {/* ABSCHLÜSSE & STATS */}
      <SectionLabel>Tracking</SectionLabel>

      <ToolRow
        href="/dashboard/abschluesse"
        icon={<Trophy size={18} color="#f59e0b" />}
        title="Abschluss-Tracker"
        subtitle="Einheiten erfassen & Monatsziel verfolgen"
        iconColor="#f59e0b"
      />
      <ToolRow
        href="/dashboard/statistiken"
        icon={<BarChart2 size={18} color="#1e7ef7" />}
        title="Statistiken"
        subtitle="Pipeline, Conversion & beste Wochentage"
        iconColor="#1e7ef7"
      />

      {/* SALES */}
      <SectionLabel>Sales Pipeline</SectionLabel>

      <ToolRow
        href="/dashboard/vg"
        icon={<TrendingUp size={18} color="#6366f1" />}
        title="VG — Kunden"
        subtitle="Verkaufspipeline & Abschlüsse"
        iconColor="#6366f1"
      />
      <ToolRow
        href="/dashboard/rg"
        icon={<Users size={18} color="#22c55e" />}
        title="RG — Rekrutierung"
        subtitle="Teamaufbau & Partner-Pipeline"
        iconColor="#22c55e"
      />

      {/* RECHNER */}
      <SectionLabel>Rechner</SectionLabel>
      <Einheitenrechner />

      {/* KOMMUNIKATION */}
      <SectionLabel>Kommunikation</SectionLabel>
      <ToolRow
        href="/dashboard/tools/vorlagen"
        icon={<MessageCircle size={18} color="#25D366" />}
        title="WhatsApp-Vorlagen"
        subtitle="Texte für jeden Moment — 1 Tap kopieren"
        iconColor="#25D366"
      />

      {/* ANALYSE */}
      <SectionLabel>Analyse</SectionLabel>
      <ToolRow
        href="/dashboard/kunden-avatar"
        icon={<Brain size={18} color="#8b5cf6" />}
        title="Kunden-Avatar"
        subtitle="Idealprofil & Haushaltsplan"
        iconColor="#8b5cf6"
      />
    </div>
  )
}
