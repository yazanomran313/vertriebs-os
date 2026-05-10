'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, TrendingUp, Users, GitBranch,
  Phone, UserPlus, LogOut, BookUser,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const navGroups = [
  {
    label: 'ÜBERSICHT',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'KONTAKTE',
    items: [
      { href: '/dashboard/kontakte', label: 'Kontaktliste',      icon: BookUser   },
      { href: '/dashboard/vg',       label: 'VG — Kunden',       icon: TrendingUp },
      { href: '/dashboard/rg',       label: 'RG — Rekrutierung', icon: Users      },
    ],
  },
  {
    label: 'TRACKING',
    items: [
      { href: '/dashboard/ttv',   label: 'TTV Kalender', icon: Phone },
      { href: '/dashboard/calls', label: 'Anrufe',       icon: Phone },
    ],
  },
  {
    label: 'TEAM',
    items: [
      { href: '/dashboard/team',  label: 'Org-Chart',    icon: GitBranch },
      { href: '/dashboard/admin', label: 'Team-Zugänge', icon: UserPlus  },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside style={{
      width: 220, minHeight: '100vh',
      backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      padding: '20px 0', flexShrink: 0, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', flexShrink: 0 }}>VO</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Vertriebs-OS</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Yazan Omran</div>
          </div>
        </div>
      </div>

      {navGroups.map(group => (
        <div key={group.label} style={{ marginBottom: 18 }}>
          <div style={{ padding: '0 16px 5px', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>{group.label}</div>
          {group.items.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '7px 16px',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'var(--bg-hover)' : 'transparent',
                  borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
                  textDecoration: 'none', transition: 'all 0.15s',
                }}>
                <Icon size={14} style={{ flexShrink: 0 }} />{item.label}
              </Link>
            )
          })}
        </div>
      ))}

      {/* User + Logout */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {userEmail && (
          <div style={{
            padding: '4px 16px 8px',
            fontSize: 11, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {userEmail}
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', fontSize: 13, color: 'var(--text-secondary)',
            background: 'none', border: 'none', cursor: 'pointer', width: '100%',
          }}
        >
          <LogOut size={14} />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
