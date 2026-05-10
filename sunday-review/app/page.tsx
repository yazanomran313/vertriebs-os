'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getMostRecentSunday, daysUntilSunday, formatWeekLabel, calcStreak, type WeeklyReview } from '@/lib/supabase'
import { ArrowRight, Flame, Clock, ChevronRight, LogOut } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

export default function HomePage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<WeeklyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')

  const isSunday = new Date().getDay() === 0
  const thisSunday = getMostRecentSunday()
  const daysLeft = daysUntilSunday()
  const streak = calcStreak(reviews)
  const thisWeekDone = reviews.some(r => r.week_date === thisSunday)
  const lastReview = reviews[0] ?? null

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')

      const { data } = await supabase
        .from('weekly_reviews')
        .select('*')
        .order('week_date', { ascending: false })
        .limit(20)
      setReviews((data ?? []) as WeeklyReview[])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧠</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Sunday Review</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{email}</div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          <LogOut size={14} /> Abmelden
        </button>
      </div>

      {/* Streak */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: streak > 0 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
          {streak > 0 ? '🔥' : '💤'}
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: streak > 0 ? '#f59e0b' : 'var(--text-secondary)', lineHeight: 1 }}>{streak}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {streak === 0 ? 'Noch keine Streak — leg los!' : streak === 1 ? 'Woche in Folge' : 'Wochen in Folge'}
          </div>
        </div>
        {streak > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
            <Flame size={13} /> Streak aktiv
          </div>
        )}
      </div>

      {/* This week status */}
      {isSunday && !thisWeekDone ? (
        <div
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 16, padding: '22px 20px', marginBottom: 16, cursor: 'pointer' }}
          onClick={() => router.push('/review')}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#c7d2fe', marginBottom: 6 }}>HEUTE IST SONNTAG</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Zeit für deinen Wochenreview</div>
          <div style={{ fontSize: 13, color: '#c7d2fe', marginBottom: 18 }}>
            Wie kann ich mit weniger Zeitaufwand mehr Geld verdienen?
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14 }}>
            Jetzt starten <ArrowRight size={16} />
          </div>
        </div>
      ) : isSunday && thisWeekDone ? (
        <div style={{ backgroundColor: '#0d2218', border: '1px solid #166534', borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#4ade80' }}>Review diese Woche erledigt!</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Du kannst ihn jederzeit ergänzen.</div>
          <Link href="/review" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 13, color: '#4ade80', textDecoration: 'none', fontWeight: 600 }}>
            Review öffnen <ChevronRight size={14} />
          </Link>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Clock size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Nächster Review</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>
            {daysLeft} {daysLeft === 1 ? 'Tag' : 'Tage'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            bis Sonntag — {formatWeekLabel(thisSunday)}
          </div>
          {thisWeekDone && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
              ✓ Dieser Sonntag bereits erledigt
            </div>
          )}
        </div>
      )}

      {/* Core question */}
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8 }}>DEINE KERNFRAGE</div>
        <div style={{ fontSize: 14, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.6, color: 'var(--accent-light)' }}>
          &ldquo;Wie kann ich mit weniger Zeitaufwand mehr Geld verdienen?&rdquo;
        </div>
      </div>

      {/* Last review preview */}
      {lastReview && lastReview.week_date !== thisSunday && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>LETZTER REVIEW</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatWeekLabel(lastReview.week_date)}</div>
          </div>
          {lastReview.q3 && (
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>Aktionen letzte Woche: </span>
              {lastReview.q3.slice(0, 120)}{lastReview.q3.length > 120 ? '…' : ''}
            </div>
          )}
          <Link href="/history" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
            Alle Reviews <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {reviews.length === 0 && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          Noch kein Review — starte nächsten Sonntag!
        </div>
      )}

      <BottomNav active="home" />
    </div>
  )
}
