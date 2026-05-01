'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, TrendingUp, Users, List, Bot } from 'lucide-react'

const navItems = [
  { href: '/dashboard',              label: 'Home',  icon: LayoutDashboard },
  { href: '/dashboard/namensliste',  label: 'Namen', icon: List },
  { href: '/dashboard/vg',           label: 'VG',    icon: TrendingUp },
  { href: '/dashboard/rg',           label: 'RG',    icon: Users },
  { href: '/dashboard/ai-team',      label: 'KI',    icon: Bot },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'stretch', zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {navItems.map(item => {
        const Icon = item.icon
        const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        return (
          <Link key={item.href} href={item.href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, textDecoration: 'none', color: active ? 'var(--accent)' : 'var(--text-secondary)', transition: 'color 0.15s' }}>
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
