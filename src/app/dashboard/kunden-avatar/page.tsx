'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calcEinheiten, calcLaufzeit } from '@/lib/ergo'
import { Users, TrendingUp, Star, BarChart3 } from 'lucide-react'

interface Contact {
  id: string; name: string; beruf: string | null
  sparsumme: number | null; alter_jahre: number | null; einheiten: number | null
  vg_stage: string | null
  haushaltsplan: Record<string, number> | null
}

const EINNAHMEN_KEYS = ['gehalt','nebenjob','miete_ein','kindergeld','sonstige_ein']
const AUSGABEN_KEYS  = ['wohnen','nebenkosten','auto','lebensmittel','handy','freizeit','versicherungen','kredite','sonstige_aus']

const AUFBAU_PRODUKTE = [
  { key: 'private_av', label: 'Private Altersvorsorge' },
  { key: 'kidspolice', label: 'Kidspolice' },
  { key: 'ruerup',     label: 'Rürup' },
  { key: 'bav',        label: 'bAV' },
]
const SCHUTZ_PRODUKTE = [
  { key: 'immobilien',   label: 'Immobilien' },
  { key: 'pkv',          label: 'PKV' },
  { key: 'risikoleben',  label: 'Risikolebensversicherung' },
  { key: 'zahn',         label: 'Zahnzusatz' },
  { key: 'bu',           label: 'BU' },
  { key: 'haftpflicht',  label: 'Haftpflicht' },
  { key: 'rechtsschutz', label: 'Rechtsschutz' },
  { key: 'hausrat',      label: 'Hausrat' },
  { key: 'auto_vers',    label: 'Autoversicherung' },
]

function avg(arr: number[]) { return arr.length ? arr.reduce((a,b) => a+b,0) / arr.length : 0 }

export default function KundenAvatarPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('contacts').select('id,name,beruf,sparsumme,alter_jahre,einheiten,vg_stage,haushaltsplan')
      .not('vg_stage','is',null)
      .then(({ data }) => { if (data) setContacts(data as Contact[]); setLoading(false) })
  }, [])

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'var(--text-secondary)' }}>Lade…</div>

  const withAge  = contacts.filter(c => c.alter_jahre)
  const withSpar = contacts.filter(c => c.sparsumme)
  const withE    = contacts.filter(c => c.einheiten)
  const withHP   = contacts.filter(c => c.haushaltsplan && Object.keys(c.haushaltsplan).length > 0)

  const avgAlter    = Math.round(avg(withAge.map(c => c.alter_jahre!)))
  const avgSparsumme = Math.round(avg(withSpar.map(c => c.sparsumme!)))
  const avgEinheiten = avg(withE.map(c => c.einheiten!))
  const avgLaufzeit  = avgAlter ? calcLaufzeit(avgAlter) : 0

  // Top 10%
  const sorted   = [...withE].sort((a,b) => (b.einheiten||0)-(a.einheiten||0))
  const top10Cnt = Math.max(1, Math.ceil(sorted.length * 0.1))
  const top10    = sorted.slice(0, top10Cnt)
  const top10AvgE = avg(top10.map(c => c.einheiten!))

  // Beruf distribution
  const berufMap: Record<string, number> = {}
  contacts.forEach(c => { if (c.beruf) berufMap[c.beruf] = (berufMap[c.beruf]||0)+1 })
  const topBerufe = Object.entries(berufMap).sort((a,b)=>b[1]-a[1]).slice(0,5)

  // Haushaltsplan averages
  const avgEin = withHP.length ? Math.round(avg(withHP.map(c => EINNAHMEN_KEYS.reduce((s,k) => s+(c.haushaltsplan![k]||0),0)))) : 0
  const avgAus = withHP.length ? Math.round(avg(withHP.map(c => AUSGABEN_KEYS.reduce((s,k) => s+(c.haushaltsplan![k]||0),0)))) : 0
  const avgUeberschuss = avgEin - avgAus

  // Product distribution (from haushaltsplan.produkte)
  const allProdukte = [...AUFBAU_PRODUKTE, ...SCHUTZ_PRODUKTE]
  const produktDist = allProdukte.map(p => {
    const count = withHP.filter(c => {
      const prod = c.haushaltsplan?.produkte as Record<string,unknown> | undefined
      if (!prod) return false
      const val = prod[p.key]
      if (typeof val === 'boolean') return val
      if (typeof val === 'object' && val !== null) return (val as {active?:boolean}).active
      return false
    }).length
    return { ...p, count, pct: withHP.length ? Math.round(count/withHP.length*100) : 0 }
  }).sort((a,b) => b.count - a.count)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>👤 Kunden-Avatar</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          {contacts.length} VG-Kunden analysiert · {withHP.length} mit Haushaltsplan
        </p>
      </div>

      {contacts.length === 0 ? (
        <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:48, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
          <div style={{ fontWeight:600, fontSize:15, marginBottom:8 }}>Noch keine Daten</div>
          <div style={{ fontSize:13, color:'var(--text-secondary)' }}>Füge Kunden in die VG-Pipeline hinzu und trage Haushaltspläne ein.</div>
        </div>
      ) : (
        <>
          {/* ── Avatar Card + Top 10% ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

            {/* Durchschnittskunde */}
            <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <Users size={16} color="#6366f1" />
                <span style={{ fontWeight:700, fontSize:14 }}>Durchschnittskunde</span>
              </div>

              {/* Avatar circle */}
              <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#6366f133,#8b5cf633)', border:'3px solid #6366f1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>
                  👤
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Ø Alter', value: avgAlter ? `${avgAlter} Jahre` : '—', color:'#6366f1' },
                  { label:'Ø Sparsumme', value: avgSparsumme ? `${avgSparsumme} €/Mon` : '—', color:'#f59e0b' },
                  { label:'Ø Einheiten', value: withE.length ? `${avgEinheiten.toFixed(1)} E` : '—', color:'#22c55e' },
                  { label:'Ø Laufzeit', value: avgLaufzeit ? `${avgLaufzeit} Jahre` : '—', color:'#06b6d4' },
                ].map(s => (
                  <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', backgroundColor:'var(--bg-hover)', borderRadius:8 }}>
                    <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {topBerufe.length > 0 && (
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'var(--text-secondary)', marginBottom:6, letterSpacing:'0.06em' }}>HÄUFIGSTE BERUFE</div>
                  {topBerufe.map(([beruf, cnt]) => (
                    <div key={beruf} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                      <span>{beruf}</span>
                      <span style={{ color:'#6366f1', fontWeight:600 }}>{cnt}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top 10% */}
            <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid #f59e0b33', borderRadius:14, padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <Star size={16} color="#f59e0b" />
                <span style={{ fontWeight:700, fontSize:14 }}>Top 10% Kunden</span>
                <span style={{ fontSize:11, backgroundColor:'#f59e0b20', color:'#f59e0b', borderRadius:10, padding:'2px 8px', fontWeight:700 }}>{top10Cnt} Personen</span>
              </div>

              <div style={{ backgroundColor:'#f59e0b15', border:'1px solid #f59e0b30', borderRadius:10, padding:'12px', textAlign:'center', marginBottom:14 }}>
                <div style={{ fontSize:28, fontWeight:800, color:'#f59e0b' }}>{top10AvgE.toFixed(1)} E</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)' }}>Ø Einheiten Top 10%</div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {top10.slice(0,8).map((c, i) => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', backgroundColor:'var(--bg-hover)', borderRadius:8 }}>
                    <span style={{ fontSize:12, fontWeight:800, color: i===0?'#f59e0b':i===1?'#94a3b8':'#cd7c3a', width:18, textAlign:'center' }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                      {c.beruf && <div style={{ fontSize:11, color:'var(--text-secondary)' }}>{c.beruf}</div>}
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:'#f59e0b', flexShrink:0 }}>{c.einheiten?.toFixed(1)} E</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Haushaltsplan Durchschnitt ── */}
          {withHP.length > 0 && (
            <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <BarChart3 size={16} color="#06b6d4" />
                <span style={{ fontWeight:700, fontSize:14 }}>Ø Haushaltsplan</span>
                <span style={{ fontSize:11, color:'var(--text-secondary)', marginLeft:4 }}>({withHP.length} Kunden)</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Ø Einnahmen', value:`${avgEin.toLocaleString('de-DE')} €`, color:'#22c55e' },
                  { label:'Ø Ausgaben',  value:`${avgAus.toLocaleString('de-DE')} €`, color:'#ef4444' },
                  { label:'Ø Überschuss',value:`${avgUeberschuss >= 0?'+':''}${avgUeberschuss.toLocaleString('de-DE')} €`, color: avgUeberschuss >= 0 ? '#22c55e' : '#ef4444' },
                ].map(s => (
                  <div key={s.label} style={{ backgroundColor:'var(--bg-hover)', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Bar visual */}
              {avgEin > 0 && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                    <span style={{ color:'var(--text-secondary)' }}>Ausgaben vs. Einnahmen</span>
                    <span style={{ color: avgUeberschuss >= 0 ? '#22c55e' : '#ef4444', fontWeight:600 }}>
                      {Math.round((avgAus/avgEin)*100)}% ausgegeben
                    </span>
                  </div>
                  <div style={{ height:10, backgroundColor:'var(--bg-hover)', borderRadius:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(100,(avgAus/avgEin)*100)}%`, backgroundColor: avgAus>avgEin?'#ef4444':'#06b6d4', borderRadius:6, transition:'width 0.4s' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Produkte Verteilung ── */}
          {withHP.length > 0 && produktDist.some(p => p.count > 0) && (
            <div style={{ backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                <TrendingUp size={16} color="#8b5cf6" />
                <span style={{ fontWeight:700, fontSize:14 }}>Produkte Verteilung</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {produktDist.filter(p => p.count > 0).map(p => (
                  <div key={p.key}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                      <span style={{ color:'var(--text-primary)' }}>{p.label}</span>
                      <span style={{ fontWeight:600, color:'#8b5cf6' }}>{p.count} Kunden ({p.pct}%)</span>
                    </div>
                    <div style={{ height:6, backgroundColor:'var(--bg-hover)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${p.pct}%`, backgroundColor:'#8b5cf6', borderRadius:3, transition:'width 0.4s' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
