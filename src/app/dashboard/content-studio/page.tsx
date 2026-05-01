'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Edit3, Save, X, Search, Play, BookOpen, Film, FileText } from 'lucide-react'

interface Script {
  id: string
  created_at: string
  title: string
  content: string
  format: 'reel' | 'short' | 'post' | 'skript'
  words?: number
  duration_sec?: number
  published_at?: string
  tags?: string[]
}

const FORMAT_CONFIG = {
  reel:   { label: 'Instagram Reel', icon: '📸', color: '#e1306c', bg: '#e1306c20' },
  short:  { label: 'YouTube Short',  icon: '▶️', color: '#ff0000', bg: '#ff000020' },
  post:   { label: 'Post/Caption',   icon: '✏️', color: '#6366f1', bg: '#6366f120' },
  skript: { label: 'Skript',         icon: '📄', color: '#06b6d4', bg: '#06b6d420' },
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}
function estimateDuration(words: number) {
  return Math.round(words / 2.5) // ~150 wpm speaking rate
}

const iStyle: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  boxSizing: 'border-box',
}

export default function ContentStudioPage() {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterFormat, setFilterFormat] = useState<string>('alle')
  const [mode, setMode] = useState<'list' | 'editor' | 'teleprompter'>('list')
  const [selected, setSelected] = useState<Script | null>(null)

  // Editor state
  const [title, setTitle]     = useState('')
  const [content, setContent] = useState('')
  const [format, setFormat]   = useState<Script['format']>('reel')
  const [publishedAt, setPublishedAt] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('scripts').select('*').order('created_at', { ascending: false })
    setScripts((data || []) as Script[])
    setLoading(false)
  }

  function openNew() {
    setSelected(null)
    setTitle(''); setContent(''); setFormat('reel'); setPublishedAt('')
    setMode('editor')
  }

  function openEdit(s: Script) {
    setSelected(s)
    setTitle(s.title); setContent(s.content); setFormat(s.format)
    setPublishedAt(s.published_at || '')
    setMode('editor')
  }

  function openTeleprompter(s: Script) {
    setSelected(s)
    setContent(s.content)
    setMode('teleprompter')
  }

  async function save() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const words = countWords(content)
    const duration_sec = estimateDuration(words)
    const payload = { title: title.trim(), content, format, words, duration_sec, published_at: publishedAt || null }

    if (selected) {
      const { data } = await supabase.from('scripts').update(payload).eq('id', selected.id).select().single()
      if (data) setScripts(prev => prev.map(s => s.id === selected.id ? data as Script : s))
    } else {
      const { data } = await supabase.from('scripts').insert([payload]).select().single()
      if (data) setScripts(prev => [data as Script, ...prev])
    }
    setSaving(false)
    setMode('list')
  }

  async function deleteScript(id: string) {
    if (!confirm('Skript löschen?')) return
    await supabase.from('scripts').delete().eq('id', id)
    setScripts(prev => prev.filter(s => s.id !== id))
  }

  const filtered = scripts.filter(s => {
    const matchSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase())
    const matchFormat = filterFormat === 'alle' || s.format === filterFormat
    return matchSearch && matchFormat
  })

  // ── Teleprompter mode ──
  if (mode === 'teleprompter' && selected) {
    return <TeleprompterView script={selected} onClose={() => setMode('list')} />
  }

  // ── Editor mode ──
  if (mode === 'editor') {
    const words = countWords(content)
    const secs = estimateDuration(words)
    return (
      <div style={{ maxWidth: 780 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{selected ? '✏️ Bearbeiten' : '✏️ Neues Skript'}</h1>
          <button onClick={() => setMode('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel…" style={{ ...iStyle, fontSize: 16, fontWeight: 600 }} />

          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.entries(FORMAT_CONFIG) as [Script['format'], typeof FORMAT_CONFIG.reel][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setFormat(key)}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${format === key ? cfg.color : 'var(--border)'}`, backgroundColor: format === key ? cfg.bg : 'var(--bg-hover)', color: format === key ? cfg.color : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
              <span>Skript-Text (Hook → Inhalt → CTA)</span>
              <span style={{ color: words > 0 ? '#6366f1' : 'inherit' }}>
                {words} Wörter · ~{secs}s
              </span>
            </div>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder={`Hook: "Wusstest du dass..."

Hauptinhalt:
- Punkt 1
- Punkt 2
- Punkt 3

CTA: "Folg mir für mehr!"`}
              rows={14}
              style={{ ...iStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Veröffentlichungsdatum (optional)</div>
            <input type="date" value={publishedAt} onChange={e => setPublishedAt(e.target.value)} style={iStyle} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setMode('list')}
              style={{ flex: 1, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Abbrechen
            </button>
            <button onClick={save} disabled={saving || !title.trim() || !content.trim()}
              style={{ flex: 2, backgroundColor: saving || !title.trim() || !content.trim() ? 'var(--bg-hover)' : '#6366f1', color: saving || !title.trim() || !content.trim() ? 'var(--text-secondary)' : '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── List mode ──
  const reelCount  = scripts.filter(s => s.format === 'reel').length
  const shortCount = scripts.filter(s => s.format === 'short').length
  const postCount  = scripts.filter(s => s.format === 'post').length
  const skriptCount = scripts.filter(s => s.format === 'skript').length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🎬 Content Studio</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {scripts.length} Skripte · {reelCount} Reels · {shortCount} Shorts · {postCount} Posts
          </p>
        </div>
        <button onClick={openNew}
          style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> Neues Skript
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Instagram Reels', count: reelCount, icon: <Film size={16} />, color: '#e1306c' },
          { label: 'YouTube Shorts',  count: shortCount, icon: <span style={{fontSize:16}}>▶</span>, color: '#ff0000' },
          { label: 'Posts/Captions',  count: postCount, icon: <FileText size={16} />, color: '#6366f1' },
          { label: 'Skripte',         count: skriptCount, icon: <BookOpen size={16} />, color: '#06b6d4' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Skripte durchsuchen…" style={{ ...iStyle, paddingLeft: 30 }} />
        </div>
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['alle', 'reel', 'short', 'post', 'skript'] as const).map(f => (
            <button key={f} onClick={() => setFilterFormat(f)}
              style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: filterFormat === f ? 'var(--accent)' : 'transparent', color: filterFormat === f ? '#fff' : 'var(--text-secondary)' }}>
              {f === 'alle' ? 'Alle' : FORMAT_CONFIG[f as Script['format']]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* Script List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Lade…</div>
      ) : filtered.length === 0 ? (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Noch keine Skripte</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Erstelle dein erstes Skript für Reels, Shorts oder Posts.</div>
          <button onClick={openNew} style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + Erstes Skript erstellen
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => {
            const cfg = FORMAT_CONFIG[s.format]
            return (
              <div key={s.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{cfg.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{s.title}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color, borderRadius: 6, padding: '2px 7px' }}>{cfg.label}</span>
                    {s.published_at && (
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {new Date(s.published_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.content.split('\n')[0]}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-secondary)' }}>
                    {s.words && <span>📝 {s.words} Wörter</span>}
                    {s.duration_sec && <span>⏱ ~{s.duration_sec}s</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openTeleprompter(s)} title="Teleprompter"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <Play size={12} /> Teleprompter
                  </button>
                  <button onClick={() => openEdit(s)}
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 9px', cursor: 'pointer' }}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => deleteScript(s.id)}
                    style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 7, padding: '6px 9px', cursor: 'pointer' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Teleprompter View ──────────────────────────────────────────────────────────
function TeleprompterView({ script, onClose }: { script: Script; onClose: () => void }) {
  const [speed, setSpeed] = useState(40)
  const [running, setRunning] = useState(false)
  const [fontSize, setFontSize] = useState(32)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const animRef = React.useRef<number | null>(null)
  const posRef = React.useRef(0)

  function startStop() {
    if (running) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setRunning(false)
    } else {
      setRunning(true)
      scroll()
    }
  }

  function scroll() {
    posRef.current += speed / 500
    if (containerRef.current) containerRef.current.scrollTop = posRef.current
    animRef.current = requestAnimationFrame(scroll)
  }

  function reset() {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    setRunning(false)
    posRef.current = 0
    if (containerRef.current) containerRef.current.scrollTop = 0
  }

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', backgroundColor: '#111', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>🎬 Teleprompter</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#888', fontSize: 12 }}>Schrift:</span>
        <input type="range" min={20} max={60} value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ width: 80 }} />
        <span style={{ color: '#888', fontSize: 12 }}>Speed:</span>
        <input type="range" min={10} max={120} value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width: 80 }} />
        <button onClick={reset} style={{ backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 13px', cursor: 'pointer', fontSize: 13 }}>↺ Reset</button>
        <button onClick={startStop}
          style={{ backgroundColor: running ? '#ef4444' : '#22c55e', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          {running ? '⏸ Pause' : '▶ Start'}
        </button>
        <button onClick={onClose} style={{ backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 13px', cursor: 'pointer', fontSize: 13 }}>✕ Schließen</button>
      </div>
      {/* Text */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '60px 15%', scrollbarWidth: 'none' }}>
        <div style={{ fontSize: fontSize, lineHeight: 1.7, color: '#fff', textAlign: 'center', whiteSpace: 'pre-wrap', fontWeight: 600, letterSpacing: '0.01em' }}>
          {script.content}
        </div>
        <div style={{ height: '60vh' }} />
      </div>
      {/* Center line */}
      <div style={{ position: 'fixed', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#6366f150', pointerEvents: 'none' }} />
    </div>
  )
}

// React import needed for useRef inside component
import React from 'react'
