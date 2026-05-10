'use client'

import { useEffect } from 'react'
import { supabase, getMostRecentSunday } from '@/lib/supabase'

export default function PwaSetup() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
      console.log('[SW] Registered', reg.scope)

      const checkSundayReminder = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const sunday = getMostRecentSunday()
        const { data } = await supabase
          .from('weekly_reviews')
          .select('id')
          .eq('week_date', sunday)
          .eq('user_id', user.id)
          .limit(1)
        const hasDoneReview = (data?.length ?? 0) > 0

        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_SUNDAY_REMINDER',
            hasDoneReview,
          })
        }
      }

      const alreadyChecked = sessionStorage.getItem('sunday-reminder-checked')
      if (!alreadyChecked) {
        sessionStorage.setItem('sunday-reminder-checked', '1')
        setTimeout(checkSundayReminder, 15_000)
      }
    }).catch(err => {
      console.warn('[SW] Registration failed', err)
    })

    // Request notification permission on first user interaction
    const requestPermission = () => {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {})
      }
      document.removeEventListener('click', requestPermission, { capture: true })
    }
    if (Notification.permission === 'default') {
      document.addEventListener('click', requestPermission, { capture: true })
    }

    return () => {
      document.removeEventListener('click', requestPermission, { capture: true })
    }
  }, [])

  return null
}
