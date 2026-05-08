'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function PwaSetup() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Register SW
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
      console.log('[SW] Registered', reg.scope)

      // Check if user has a TTV session today and send reminder if needed
      const checkReminder = async () => {
        const today = new Date().toISOString().split('T')[0]
        const { data } = await supabase
          .from('ttv_sessions')
          .select('id')
          .eq('date', today)
          .limit(1)
        const hasSessionToday = (data?.length ?? 0) > 0

        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_TTV_REMINDER',
            hasSessionToday,
          })
        }
      }

      // Run reminder check once per session (with 10s delay for page load)
      const alreadyChecked = sessionStorage.getItem('ttv-reminder-checked')
      if (!alreadyChecked) {
        sessionStorage.setItem('ttv-reminder-checked', '1')
        setTimeout(checkReminder, 10_000)
      }
    }).catch(err => {
      console.warn('[SW] Registration failed', err)
    })

    // Request notification permission when user interacts (not on load)
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
