'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────
interface Bedarfsfeld {
  titel: string
  prioritaet: 'hoch' | 'mittel' | 'niedrig'
  begruendung: string
  potenzial: string
  produkt_empfehlung: string
}
interface Vertrag {
  art: string
  versicherungsnummer: string
  beitrag_jaehrlich: string
  anbieter: string
  optimierungspotenzial: string
}
interface Immobilie {
  objekt: string
  ort: string
  nutzung: string
}
interface Analyse {
  kunde: {
    name: string
    beruf: string
    geburtsjahr: string
    wohnort: string
    einkommen_netto_monatlich: string
    familienstand: string
    kinder: string[]
  }
  immobilien: Immobilie[]
  bedarfsfelder: Bedarfsfeld[]
  bestehende_vertraege: Vertrag[]
  offene_fragen: string[]
}

export interface ClientAnalysisContact {
  id: string
  name: string
  beruf?: string | null
}

interface Props {
  contact: ClientAnalysisContact
  onClose: () => void
}

// ── Priority badge config ────────────────────────────────────────────
const PRIO: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  hoch:    { dot: '#FF453A', text: '#FF453A', bg: '#FF453A18', label: 'HOCH'    },
  mittel:  { dot: '#FF9F0A', text: '#FF9F0A', bg: '#FF9F0A18', label: 'MITTEL'  },
  niedrig: { dot: '#6366f1', text: '#6366f1', bg: '#6366f118', label: 'NIEDRIG' },
}

// ── PDF export via print window ──────────────────────────────────────
function exportPDF(analyse: Analyse, contactName: string) {
  const pLabel: Record<string, string> = { hoch: '🔴 HOCH', mittel: '🟠 MITTEL', niedrig: '🔵 NIEDRIG' }

  const rows = (pairs: [string, string | undefined | null][]) =>
    pairs.filter(([, v]) => v).map(([l, v]) =>
      `<div class="row"><span class="lbl">${l}</span><span>${v}</span></div>`
    ).join('')

  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>KI-Analyse — ${contactName}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111;font-size:14px}
  h1{font-size:22px;margin:0 0 4px}
  .meta{color:#888;font-size:12px;margin-bottom:32px}
  h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#666;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:28px 0 12px}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
  .lbl{color:#666}
  .card{border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px}
  .card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .title{font-size:14px;font-weight:700}
  .badge{font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;border:1px solid}
  .hoch{color:#ef4444;background:#fee2e2;border-color:#fca5a5}
  .mittel{color:#f59e0b;background:#fef3c7;border-color:#fcd34d}
  .niedrig{color:#6366f1;background:#ede9fe;border-color:#a5b4fc}
  .sub{font-size:12px;color:#555;margin-top:5px}
  .sub strong{color:#111}
  .opt{background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:6px 10px;margin-top:8px;font-size:12px;color:#c2410c}
  ul{padding-left:18px;margin:0}
  li{padding:4px 0;font-size:13px;color:#444}
  @media print{body{margin:0}}
</style></head><body>
<h1>KI-Analyse: ${contactName}</h1>
<div class="meta">Erstellt am ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>

<h2>Kundenprofil</h2>
${rows([
    ['Name', analyse.kunde.name || contactName],
    ['Beruf', analyse.kunde.beruf],
    ['Geburtsjahr', analyse.kunde.geburtsjahr],
    ['Wohnort', analyse.kunde.wohnort],
    ['Nettoeinkommen', analyse.kunde.einkommen_netto_monatlich],
    ['Familienstand', analyse.kunde.familienstand],
    ['Kinder', analyse.kunde.kinder?.join(', ')],
  ])}

${analyse.bedarfsfelder?.length ? `
<h2>Bedarfsfelder</h2>
${analyse.bedarfsfelder.map(b => `
<div class="card">
  <div class="card-head">
    <span class="title">${b.titel}</span>
    <span class="badge ${b.prioritaet}">${pLabel[b.prioritaet] || b.prioritaet}</span>
  </div>
  ${b.begruendung ? `<div class="sub"><strong>Begründung:</strong> ${b.begruendung}</div>` : ''}
  ${b.produkt_empfehlung ? `<div class="sub"><strong>Empfehlung:</strong> ${b.produkt_empfehlung}</div>` : ''}
  ${b.potenzial ? `<div class="sub"><strong>Potenzial:</strong> ${b.potenzial}</div>` : ''}
</div>`).join('')}` : ''}

${analyse.bestehende_vertraege?.length ? `
<h2>Bestehende Verträge</h2>
${analyse.bestehende_vertraege.map(v => `
<div class="card">
  <div class="card-head">
    <span class="title">${v.art}</span>
    ${v.anbieter ? `<span style="font-size:12px;color:#666">${v.anbieter}</span>` : ''}
  </div>
  ${v.versicherungsnummer ? `<div class="sub">Nr. ${v.versicherungsnummer}</div>` : ''}
  ${v.beitrag_jaehrlich ? `<div class="sub">Beitrag: ${v.beitrag_jaehrlich}</div>` : ''}
  ${v.optimierungspotenzial ? `<div class="opt">⚡ ${v.optimierungspotenzial}</div>` : ''}
</div>`).join('')}` : ''}

${analyse.immobilien?.filter(i => i.objekt || i.ort).length ? `
<h2>Immobilien</h2>
${analyse.immobilien.map(i => `
<div class="card">
  <span class="title">${i.objekt || 'Immobilie'}${i.ort ? ` — ${i.ort}` : ''}</span>
  ${i.nutzung ? `<div class="sub">${i.nutzung}</div>` : ''}
</div>`).join('')}` : ''}

${analyse.offene_fragen?.length ? `
<h2>Offene Fragen</h2>
<ul>${analyse.offene_fragen.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}

</body></html>`

  const win = window.open('', '_blank')
  if (!win) { alert('Popup-Blocker aktiv — bitte deaktivieren und erneut versuchen.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 300)
}

// ── Component ────────────────────────────────────────────────────────
export default function ClientAnalysis({ contact, onClose }: Props) {
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [analyse, setAnalyse]   = useState<Analyse | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  async function run() {
    if (!notes.trim()) return
    setLoading(true)
    setError('')
    setAnalyse(null)
    try {
      const res  = await fetch('/api/ki/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setError(json.error || 'Analyse fehlgeschlagen.')
      } else {
        setAnalyse(json.data as Analyse)
        setExpanded({})
      }
    } catch {
      setError('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  const iStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
    borderRadius: 10, fontSize: 14, color: 'var(--text-primary)', outline: 'none',
    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
  }

  const SectionLabel = ({ emoji, text, count }: { emoji: string; text: string; count?: number }) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.06em', marginBottom: 10 }}>
      {emoji} {text}{count !== undefined ? ` (${count})` : ''}
    </div>
  )

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', zIndex: 400, display: 'flex', alignItems: 'flex-end' }}
    >
      <div style={{ backgroundColor: '#1C1C1E', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 600, margin: '0 auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header ── */}
        <div style={{ flexShrink: 0, padding: '0 20px' }}>
          <div style={{ width: 36, height: 4, backgroundColor: '#3A3A3C', borderRadius: 2, margin: '12px auto 16px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <span style={{ fontWeight: 700, fontSize: 16 }}>KI-Analyse</span>
                <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: '#6366f120', color: '#6366f1', padding: '2px 7px', borderRadius: 6 }}>Sonnet 4</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>{contact.name}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: 22, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>
        </div>

        {/* Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 44px' }}>

          {/* ── Input state ── */}
          {!analyse && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                KUNDENNOTIZEN EINFÜGEN
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={`Füge hier rohe Gesprächsnotizen ein…\n\nz.B. Alter, Beruf, Einkommen, Familie, bestehende Verträge, Ziele, Wünsche, Einwände, Immobilien…`}
                rows={9}
                style={iStyle}
                autoFocus
              />

              {error && (
                <div style={{ backgroundColor: '#FF453A15', border: '1px solid #FF453A40', borderRadius: 10, padding: '11px 14px', marginTop: 12, fontSize: 13, color: '#FF453A' }}>
                  ❌ {error}
                </div>
              )}

              <button
                onClick={run}
                disabled={loading || !notes.trim()}
                style={{
                  width: '100%', marginTop: 14, padding: '14px',
                  backgroundColor: loading || !notes.trim() ? 'var(--bg-hover)' : '#6366f1',
                  color: loading || !notes.trim() ? 'var(--text-tertiary)' : '#fff',
                  border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
                  cursor: loading || !notes.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.25)', borderTop: '2.5px solid #fff', borderRadius: '50%', animation: 'ki-spin 0.75s linear infinite' }} />
                    Analysiere…
                  </>
                ) : '✨ Analysieren'}
              </button>
              <style>{`@keyframes ki-spin { to { transform: rotate(360deg) } }`}</style>
            </>
          )}

          {/* ── Result state ── */}
          {analyse && (
            <>
              {/* Action bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button
                  onClick={() => { setAnalyse(null); setError('') }}
                  style={{ flex: 1, padding: '10px', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  ← Neu analysieren
                </button>
                <button
                  onClick={() => exportPDF(analyse, contact.name)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#6366f115', border: '1px solid #6366f135', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#6366f1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  ↓ Als PDF speichern
                </button>
              </div>

              {/* Kundenprofil ── */}
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                <SectionLabel emoji="👤" text="KUNDENPROFIL" />
                {([
                  ['Name', analyse.kunde.name || contact.name],
                  ['Beruf', analyse.kunde.beruf],
                  ['Geburtsjahr', analyse.kunde.geburtsjahr],
                  ['Wohnort', analyse.kunde.wohnort],
                  ['Nettoeinkommen', analyse.kunde.einkommen_netto_monatlich],
                  ['Familienstand', analyse.kunde.familienstand],
                  ['Kinder', analyse.kunde.kinder?.length ? analyse.kunde.kinder.join(', ') : null],
                ] as [string, string | null | undefined][])
                  .filter(([, v]) => v)
                  .map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{l}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', marginLeft: 12 }}>{v}</span>
                    </div>
                  ))}
              </div>

              {/* Bedarfsfelder ── */}
              {analyse.bedarfsfelder?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel emoji="🎯" text="BEDARFSFELDER" count={analyse.bedarfsfelder.length} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analyse.bedarfsfelder.map((b, i) => {
                      const p      = PRIO[b.prioritaet] ?? PRIO.niedrig
                      const isOpen = !!expanded[i]
                      return (
                        <div key={i} style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${p.dot}28`, borderRadius: 14, overflow: 'hidden' }}>
                          <div
                            onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                            style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 8 }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.dot, flexShrink: 0 }} />
                              <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.titel}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: p.text, backgroundColor: p.bg, padding: '2px 8px', borderRadius: 6 }}>{p.label}</span>
                              {isOpen ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
                            </div>
                          </div>

                          {isOpen && (
                            <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${p.dot}18` }}>
                              {b.begruendung && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>BEGRÜNDUNG</div>
                                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{b.begruendung}</div>
                                </div>
                              )}
                              {b.produkt_empfehlung && (
                                <div style={{ marginTop: 10 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 4 }}>PRODUKTEMPFEHLUNG</div>
                                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{b.produkt_empfehlung}</div>
                                </div>
                              )}
                              {b.potenzial && (
                                <div style={{ marginTop: 10, backgroundColor: '#6366f110', border: '1px solid #6366f120', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 6 }}>
                                  <span style={{ fontSize: 13, flexShrink: 0 }}>💰</span>
                                  <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, lineHeight: 1.5 }}>{b.potenzial}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Bestehende Verträge ── */}
              {analyse.bestehende_vertraege?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel emoji="📋" text="BESTEHENDE VERTRÄGE" count={analyse.bestehende_vertraege.length} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {analyse.bestehende_vertraege.map((v, i) => (
                      <div key={i} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{v.art}</span>
                          {v.anbieter && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.anbieter}</span>}
                        </div>
                        {v.versicherungsnummer && (
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 3 }}>Nr: {v.versicherungsnummer}</div>
                        )}
                        {v.beitrag_jaehrlich && (
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Beitrag: {v.beitrag_jaehrlich}</div>
                        )}
                        {v.optimierungspotenzial && (
                          <div style={{ backgroundColor: '#FF9F0A12', border: '1px solid #FF9F0A28', borderRadius: 8, padding: '7px 10px', marginTop: 8, display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>⚡</span>
                            <span style={{ fontSize: 12, color: '#FF9F0A', lineHeight: 1.5 }}>{v.optimierungspotenzial}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Immobilien ── */}
              {analyse.immobilien?.filter(i => i.objekt || i.ort).length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <SectionLabel emoji="🏠" text="IMMOBILIEN" />
                  {analyse.immobilien.filter(i => i.objekt || i.ort).map((im, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 14px', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {im.objekt || 'Immobilie'}{im.ort ? ` — ${im.ort}` : ''}
                      </div>
                      {im.nutzung && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{im.nutzung}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Offene Fragen ── */}
              {analyse.offene_fragen?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <SectionLabel emoji="❓" text="OFFENE FRAGEN" count={analyse.offene_fragen.length} />
                  <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 14px' }}>
                    {analyse.offene_fragen.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < analyse.offene_fragen.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'flex-start' }}>
                        <span style={{ color: '#6366f1', fontWeight: 800, fontSize: 15, flexShrink: 0, marginTop: -1 }}>?</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
