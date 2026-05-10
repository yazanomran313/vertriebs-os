'use client'

import Link from 'next/link'
import { Home, BookOpen, Clock } from 'lucide-react'

const ITEMS = [
  { href: '/', label: 'Home', icon: Home, id: 'home' },
  { href: '/review', label: 'Review', icon: BookOpen, id: 'review' },
  { href: '/history', label: 'Verlauf', icon: Clock, id: 'history' },
]

export default function BottomNav({ active }: { active: 'home' | 'review' | 'history' }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      backgroundColor: 'var(--bg-card)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      zIndex: 100,
    }}>
      {ITEMS.map(item => {
        const Icon = item.icon
        const isActive = active === item.id
        return (
          <Link key={item.href} href={item.href} style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            textDecoration: 'none',
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            transition: 'color 0.15s',
          }}>
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
