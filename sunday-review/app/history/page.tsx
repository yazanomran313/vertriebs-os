'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getMostRecentSunday, formatWeekLabel, calcStreak, type WeeklyReview } from '@/lib/supabase'
import { Flame, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

const Q_LABELS = [
  'Zeitfresser',
  'Mehr Geld mit weniger Aufwand',
  'Aktionen nächste Woche',
  'Energie-Quelle',
  'Delegieren / Automatisieren',
]

export default function HistoryPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('weekly_reviews')
      .select('*')
      .order('week_date', { ascending: false })
    setReviews((data ?? []) as WeeklyReview[])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  const streak = calcStreak(reviews)
  const thisSunday = getMostRecentSunday()
  const thisWeekDone = reviews.some(r => r.week_date === thisSunday)

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
        Laden…
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '24px 16px 90px', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Verlauf</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{reviews.length} Reviews gesamt</div>
        </div>
        {!thisWeekDone && (
          <Link href="/review" style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#6366f1', color: '#fff', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            <Plus size={14} /> Neuer Review
          </Link>
        )}
      </div>

      {/* Streak banner */}
      {streak > 0 && (
        <div style={{ backgroundColor: '#1c0f00', border: '1px solid #92400e', borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🔥</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#f59e0b' }}>{streak} {streak === 1 ? 'Woche' : 'Wochen'} in Folge</div>
            <div style={{ fontSize: 12, color: '#b45309' }}>Bleib dabei — Konstanz ist der Schlüssel!</div>
          </div>
        </div>
      )}

      {/* List */}
      {reviews.length === 0 ? (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Noch keine Reviews</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Starte deinen ersten Wochenreview.</div>
          <Link href="/review" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#6366f1', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Ersten Review starten
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((review, idx) => {
            const isOpen = expanded === review.id
            const isThisWeek = review.week_date === thisSunday
            const qAnswers = [review.q1, review.q2, review.q3, review.q4, review.q5]
            const filledCount = qAnswers.filter(Boolean).length

            return (
              <div key={review.id} style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${isThisWeek ? '#6366f140' : 'var(--border)'}`, borderRadius: 14, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : review.id)}
                  style={{ width: '100%', padding: '16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}
                >
                  {/* Week indicator */}
                  <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: isThisWeek ? '#6366f1' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                    <span style={{ fontSize: 20 }}>🧠</span>
                    {idx === 0 && streak > 0 && (
                      <div style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>
                        <Flame size={9} color="#fff" />
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{formatWeekLabel(review.week_date)}</span>
                      {isThisWeek && <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', backgroundColor: '#6366f115', borderRadius: 6, padding: '2px 7px' }}>DIESE WOCHE</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {filledCount}/5 Fragen beantwortet
                      {review.ai_insight && ' · KI-Analyse vorhanden'}
                    </div>
                  </div>

                  {isOpen ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                </button>

                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    {/* Q&A */}
                    {qAnswers.map((ans, qi) => ans ? (
                      <div key={qi} style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 5 }}>
                          {qi + 1}. {Q_LABELS[qi].toUpperCase()}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ans}</div>
                      </div>
                    ) : null)}

                    {/* AI insight */}
                    {review.ai_insight && (
                      <div style={{ marginTop: 16, backgroundColor: 'var(--bg-hover)', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #6366f1' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: '#6366f1', marginBottom: 6 }}>KI-COACHING</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          {review.ai_insight.slice(0, 300)}{review.ai_insight.length > 300 ? '…' : ''}
                        </div>
                      </div>
                    )}

                    {isThisWeek && (
                      <Link href="/review" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 14, fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                        Review bearbeiten →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <BottomNav active="history" />
    </div>
  )
}
