import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export interface WeeklyReview {
  id: string
  user_id: string
  week_date: string
  q1: string | null
  q2: string | null
  q3: string | null
  q4: string | null
  q5: string | null
  ai_insight: string | null
  created_at: string
}

/** Returns the ISO date string of the most recent Sunday (today if Sunday) */
export function getMostRecentSunday(from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

/** Days until next Sunday (0 if today is Sunday) */
export function daysUntilSunday(): number {
  const day = new Date().getDay()
  return day === 0 ? 0 : 7 - day
}

export function formatWeekLabel(sundayIso: string): string {
  const d = new Date(sundayIso + 'T12:00:00')
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function calcStreak(reviews: WeeklyReview[]): number {
  if (reviews.length === 0) return 0
  const sorted = [...reviews].sort((a, b) => b.week_date.localeCompare(a.week_date))
  const thisSunday = getMostRecentSunday()
  let streak = 0
  let expected = thisSunday
  for (const r of sorted) {
    if (r.week_date === expected) {
      streak++
      const d = new Date(expected + 'T12:00:00')
      d.setDate(d.getDate() - 7)
      expected = d.toISOString().split('T')[0]
    } else {
      break
    }
  }
  return streak
}
