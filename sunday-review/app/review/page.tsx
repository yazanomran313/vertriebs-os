'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getMostRecentSunday, formatWeekLabel, type WeeklyReview } from '@/lib/supabase'
import { Save, Sparkles, Bot, User, ChevronDown, ChevronUp } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

const QUESTIONS = [
  { key: 'q1', label: 'Was hat mir diese Woche am meisten Zeit gestohlen?', hint: 'Meetings, Ablenkungen, unnötige Aufgaben…' },
  { key: 'q2', label: 'Was hätte mir mit weniger Aufwand mehr Geld gebracht?', hint: 'Aktivitäten mit hohem Return, Chancen die du verpasst hast…' },
  { key: 'q3', label: 'Was sind meine 3 konkreten Aktionen für nächste Woche?', hint: 'Spezifisch, messbar, fokussiert auf Hebel-Wirkung…' },
  { key: 'q4', label: 'Wo war meine Energie und Fokus am höchsten?', hint: 'Welche Tätigkeiten fühlen sich leicht und produktiv an?' },
  { key: 'q5', label: 'Was könnte ich delegieren oder automatisieren?', hint: 'Aufgaben die andere genauso gut erledigen könnten…' },
] as const

type QKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5'

interface AiMsg { role: 'user' | 'assistant'; content: string }

function formatAiText(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('## ')) return <div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{line.slice(3)}</div>
    if (line.startsWith('# ')) return <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 8, marginBottom: 4 }}>{line.slice(2)}</div>
    if (line.startsWith('- ') || line.startsWith('• ')) return (
      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, marginLeft: 4 }}>
        <span style={{ color: 'var(--accent)', flexShrink: 0 }}>›</span>
        <span>{line.replace(/^[•-] /, '')}</span>
      </div>
    )
    if (/^\d+\. /.test(line)) return (
      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3, marginLeft: 4 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>{line.match(/^\d+/)?.[0]}.</span>
        <span>{line.replace(/^\d+\. /, '')}</span>
      </div>
    )
    if (line === '') return <div key={i} style={{ height: 5 }} />
    return <span key={i}>{line}{i < text.split('\n').length - 1 ? ' ' : ''}</span>
  })
}

export default function ReviewPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<QKey, string>>({ q1: '', q2: '', q3: '', q4: '', q5: '' })
  const [review, setReview] = useState<WeeklyReview | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiMsgs, setAiMsgs] = useState<AiMsg[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [userId, setUserId] = useState('')
  const [expanded, setExpanded] = useState<number | null>(0)

  const thisSunday = getMostRecentSunday()
  const answeredCount = QUESTIONS.filter(q => answers[q.key].trim()).length

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const { data } = await supabase
      .from('weekly_reviews')
      .select('*')
      .eq('week_date', thisSunday)
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setReview(data as WeeklyReview)
      setAnswers({ q1: data.q1 ?? '', q2: data.q2 ?? '', q3: data.q3 ?? '', q4: data.q4 ?? '', q5: data.q5 ?? '' })
      if (data.ai_insight) {
        setAiMsgs([{ role: 'assistant', content: data.ai_insight }])
        setShowAi(true)
      }
    }
  }, [router, thisSunday])

  useEffect(() => { load() }, [load])

  async function saveReview() {
    setSaving(true)
    const payload = { ...answers, user_id: userId, week_date: thisSunday }

    if (review) {
      await supabase.from('weekly_reviews').update(payload).eq('id', review.id)
    } else {
      const { data } = await supabase.from('weekly_reviews').insert([payload]).select().single()
      if (data) setReview(data as WeeklyReview)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function analyzeWithAi() {
    setAiLoading(true)
    setShowAi(true)

    const prompt = `Hier sind meine Antworten für den Wochenreview (${formatWeekLabel(thisSunday)}):

**1. Was hat mir am meisten Zeit gestohlen?**
${answers.q1 || '(keine Antwort)'}

**2. Was hätte mir mit weniger Aufwand mehr Geld gebracht?**
${answers.q2 || '(keine Antwort)'}

**3. Meine 3 Aktionen für nächste Woche:**
${answers.q3 || '(keine Antwort)'}

**4. Wo war meine Energie am höchsten?**
${answers.q4 || '(keine Antwort)'}

**5. Was könnte ich delegieren/automatisieren?**
${answers.q5 || '(keine Antwort)'}

Analysiere meine Reflexion und gib mir konkrete, direkte Empfehlungen um mit weniger Zeitaufwand mehr Geld zu verdienen.`

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const insight = data.response
      setAiMsgs([{ role: 'user', content: prompt }, { role: 'assistant', content: insight }])

      // Save AI insight to DB
      if (review) {
        await supabase.from('weekly_reviews').update({ ai_insight: insight }).eq('id', review.id)
      } else {
        const { data: newReview } = await supabase
          .from('weekly_reviews')
          .upsert([{ ...answers, user_id: userId, week_date: thisSunday, ai_insight: insight }])
          .select().single()
        if (newReview) setReview(newReview as WeeklyReview)
      }
    } catch (err) {
      setAiMsgs([{ role: 'assistant', content: `Fehler: ${err instanceof Error ? err.message : 'Verbindung fehlgeschlagen'}` }])
    } finally {
      setAiLoading(false)
    }
  }

  const iStyle = {
    width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--text-primary)',
    resize: 'vertical' as const, minHeight: 90, lineHeight: 1.6,
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '24px 16px 90px', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 6 }}>
          WOCHENREVIEW — {formatWeekLabel(thisSunday).toUpperCase()}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, marginBottom: 8 }}>
          Wie kann ich mit weniger Zeit mehr Geld verdienen?
        </h1>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 6, backgroundColor: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(answeredCount / QUESTIONS.length) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{answeredCount}/5</div>
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {QUESTIONS.map((q, idx) => {
          const filled = !!answers[q.key].trim()
          const open = expanded === idx
          return (
            <div key={q.key} style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${filled ? '#6366f140' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
              <button
                onClick={() => setExpanded(open ? null : idx)}
                style={{ width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
              >
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${filled ? '#6366f1' : 'var(--border)'}`, backgroundColor: filled ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: filled ? '#fff' : 'var(--text-secondary)' }}>
                  {filled ? '✓' : idx + 1}
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: filled ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.4 }}>{q.label}</span>
                {open ? <ChevronUp size={14} color="var(--text-secondary)" /> : <ChevronDown size={14} color="var(--text-secondary)" />}
              </button>
              {open && (
                <div style={{ padding: '0 16px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{q.hint}</div>
                  <textarea
                    value={answers[q.key]}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                    placeholder="Schreib hier deine Gedanken…"
                    autoFocus
                    style={iStyle}
                  />
                  {idx < QUESTIONS.length - 1 && (
                    <button
                      onClick={() => setExpanded(idx + 1)}
                      style={{ marginTop: 10, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Weiter →
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          onClick={saveReview}
          disabled={saving || answeredCount === 0}
          style={{
            flex: 1, backgroundColor: saving || answeredCount === 0 ? 'var(--bg-hover)' : '#6366f1',
            color: saving || answeredCount === 0 ? 'var(--text-secondary)' : '#fff',
            border: 'none', borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700,
            cursor: saving || answeredCount === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <Save size={14} />
          {saving ? 'Speichere…' : saved ? 'Gespeichert ✓' : 'Speichern'}
        </button>
        <button
          onClick={analyzeWithAi}
          disabled={aiLoading || answeredCount < 2}
          style={{
            flex: 1, backgroundColor: aiLoading || answeredCount < 2 ? 'var(--bg-hover)' : '#0d1526',
            color: aiLoading || answeredCount < 2 ? 'var(--text-secondary)' : 'var(--accent-light)',
            border: `1px solid ${answeredCount >= 2 ? '#6366f150' : 'var(--border)'}`,
            borderRadius: 10, padding: '13px', fontSize: 13, fontWeight: 700,
            cursor: aiLoading || answeredCount < 2 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <Sparkles size={14} />
          {aiLoading ? 'Analysiere…' : 'KI-Coaching'}
        </button>
      </div>

      {/* AI Section */}
      {showAi && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 20, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#1e293b,#334155)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={14} color="#6366f1" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 13 }}>KI-Coaching</span>
          </div>

          <div style={{ padding: '14px 16px' }}>
            {aiLoading ? (
              <div style={{ display: 'flex', gap: 5, padding: '8px 0' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#6366f1', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            ) : aiMsgs.length > 0 ? (
              aiMsgs.filter(m => m.role === 'assistant').map((msg, i) => (
                <div key={i} style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                  {formatAiText(msg.content)}
                </div>
              ))
            ) : null}
          </div>

          {!aiLoading && aiMsgs.length > 0 && (
            <div style={{ padding: '0 16px 14px' }}>
              <button
                onClick={analyzeWithAi}
                style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Sparkles size={12} /> Neu analysieren
              </button>
            </div>
          )}
        </div>
      )}

      {/* Who asked */}
      {!showAi && answeredCount < 2 && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', padding: '0 20px' }}>
          Beantworte mindestens 2 Fragen um das KI-Coaching freizuschalten.
        </div>
      )}

      <BottomNav active="review" />
    </div>
  )
}
