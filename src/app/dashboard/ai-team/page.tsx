'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Bot, Send, User, Sparkles, TrendingUp, Users, Target, ChevronRight, RotateCcw } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Contact {
  id: string
  name: string
  pipeline: string
  stage: string
  einheiten: number | null
  beruf: string | null
  alter_jahre: number | null
  sparsumme: number | null
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: 'Pipeline analysieren', prompt: 'Analysiere meine aktuelle Pipeline und gib mir konkrete Empfehlungen was ich heute tun soll.' },
  { icon: Target, label: 'Einwände behandeln', prompt: 'Welche typischen Einwände begegnen mir bei der Altersvorsorge und wie behandle ich sie am besten?' },
  { icon: Users, label: 'Rekrutierung Tipps', prompt: 'Gib mir 5 konkrete Strategien, wie ich schneller neue Partner rekrutieren kann.' },
  { icon: Sparkles, label: 'Abschlussquote steigern', prompt: 'Wie steigere ich meine Abschlussquote von "Beraten" zu "Abgeschlossen"? Gib mir ein konkretes Gesprächs-Framework.' },
]

function formatMessage(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('## ')) return <div key={i} style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 12, marginBottom: 4 }}>{line.replace('## ', '')}</div>
    if (line.startsWith('# ')) return <div key={i} style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, marginBottom: 4 }}>{line.replace('# ', '')}</div>
    if (line.startsWith('- ') || line.startsWith('• ')) return (
      <div key={i} style={{ display: 'flex', gap: 8, marginLeft: 4, marginBottom: 2 }}>
        <span style={{ color: '#6366f1', flexShrink: 0 }}>›</span>
        <span>{line.replace(/^[•-] /, '')}</span>
      </div>
    )
    if (/^\d+\. /.test(line)) return (
      <div key={i} style={{ display: 'flex', gap: 8, marginLeft: 4, marginBottom: 2 }}>
        <span style={{ color: '#6366f1', fontWeight: 600, flexShrink: 0 }}>{line.match(/^\d+/)?.[0]}.</span>
        <span>{line.replace(/^\d+\. /, '')}</span>
      </div>
    )
    if (line === '') return <div key={i} style={{ height: 6 }} />
    return <span key={i}>{line}{i < lines.length - 1 ? ' ' : ''}</span>
  })
}

export default function KIAnalysePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('contacts').select('id, name, pipeline, stage, einheiten, beruf, alter_jahre, sparsumme')
      .then(({ data }) => { if (data) setContacts(data) })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function buildContext() {
    const vg = contacts.filter(c => c.pipeline === 'vg')
    const rg = contacts.filter(c => c.pipeline === 'rg')
    const vgAbg = vg.filter(c => c.stage === 'abgeschlossen')
    const vgBeraten = vg.filter(c => c.stage === 'beraten')
    const vgE = vgAbg.reduce((s, c) => s + (c.einheiten || 0), 0)
    const rgTeam = rg.filter(c => c.stage === 'im_team')

    return `[AKTUELLE PIPELINE-DATEN]
VG (Kundenverkauf): ${vg.length} Kontakte gesamt, ${vgAbg.length} abgeschlossen (${vgE.toFixed(1)} Einheiten), ${vgBeraten.length} in Beraten
RG (Rekrutierung): ${rg.length} Kontakte gesamt, ${rgTeam.length} im Team
Namensliste VG: ${vg.filter(c => c.stage === 'namensliste').length} Kontakte
Namensliste RG: ${rg.filter(c => c.stage === 'namensliste').length} Kontakte`
  }

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return

    const userMsg: Message = { role: 'user', content: content.trim(), timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: messages.length === 0 ? buildContext() : undefined,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Fehler: ${err instanceof Error ? err.message : 'Verbindung fehlgeschlagen'}`,
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const vgAbg = contacts.filter(c => c.pipeline === 'vg' && c.stage === 'abgeschlossen')
  const totalE = vgAbg.reduce((s, c) => s + (c.einheiten || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)', maxHeight: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>KI-Analyse</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 11, margin: 0 }}>Dein persönlicher Vertriebscoach</p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <RotateCcw size={12} /> Neu
            </button>
          )}
        </div>
      </div>

      {/* Welcome / Quick Prompts */}
      {messages.length === 0 && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'VG Kontakte', value: contacts.filter(c => c.pipeline === 'vg').length, color: '#6366f1' },
              { label: 'RG Kontakte', value: contacts.filter(c => c.pipeline === 'rg').length, color: '#22c55e' },
              { label: 'Einheiten', value: `${totalE.toFixed(1)} E`, color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', marginBottom: 10 }}>SCHNELLSTART</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_PROMPTS.map(qp => {
                const Icon = qp.icon
                return (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.prompt)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#6366f115', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color="#6366f1" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{qp.label}</span>
                    <ChevronRight size={14} color="var(--text-secondary)" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 16, display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'linear-gradient(135deg, #1e293b, #334155)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
              }}>
                {msg.role === 'user' ? <User size={14} color="#fff" /> : <Bot size={14} color="#6366f1" />}
              </div>
              <div style={{
                maxWidth: '80%',
                backgroundColor: msg.role === 'user' ? '#6366f1' : 'var(--bg-card)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                padding: '12px 14px', fontSize: 13, lineHeight: 1.6,
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              }}>
                {msg.role === 'assistant' ? formatMessage(msg.content) : msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #1e293b, #334155)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={14} color="#6366f1" />
              </div>
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', backgroundColor: '#6366f1',
                      animation: 'bounce 1.2s infinite',
                      animationDelay: `${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <div style={{ flexShrink: 0, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Frag mich etwas… (Enter = Senden)"
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none', resize: 'none',
            fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            backgroundColor: input.trim() && !loading ? '#6366f1' : 'var(--bg-hover)',
            border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}
        >
          <Send size={14} color={input.trim() && !loading ? '#fff' : 'var(--text-secondary)'} />
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
