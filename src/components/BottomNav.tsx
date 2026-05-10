'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BarChart2, Wrench, AlignJustify,
  BookUser, Users, TrendingUp,
  Phone, GitBranch, UserPlus, ChevronRight, LogOut, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const primaryNav = [
  { href: '/dashboard',     label: 'Übersicht', icon: BarChart2  },
  { href: '/dashboard/ttv', label: 'TTV',        icon: Phone      },
  { href: '/dashboard/vg',  label: 'VG',         icon: TrendingUp },
]

const menuGroups = [
  {
    label: 'KONTAKTE',
    items: [
      { href: '/dashboard/kontakte', label: 'Kontaktliste',      icon: BookUser  },
      { href: '/dashboard/rg',       label: 'RG — Rekrutierung', icon: Users     },
    ],
  },
  {
    label: 'TRACKING',
    items: [
      { href: '/dashboard/calls',  label: 'Anrufe', icon: Phone  },
      { href: '/dashboard/tools',  label: 'Tools',  icon: Wrench },
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

export default function BottomNav() {
  const pathname   = usePathname()
  const router     = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email ?? '',
          name: (data.user.user_metadata?.name as string) || data.user.email?.split('@')[0] || 'Nutzer',
        })
      }
    })
  }, [])

  const isMenuActive = !primaryNav.some(n =>
    n.href === '/dashboard' ? pathname === n.href : pathname.startsWith(n.href)
  )

  function handleMenuNav(href: string) {
    setMenuOpen(false)
    router.push(href)
  }

  async function handleLogout() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'VO'

  return (
    <>
      {/* Backdrop */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 98,
          }}
        />
      )}

      {/* Menu Drawer */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        bottom: 'calc(78px + env(safe-area-inset-bottom))',
        maxHeight: '82vh',
        backgroundColor: '#0d1220',
        borderRadius: '20px 20px 0 0',
        overflowY: 'auto',
        zIndex: 99,
        transform: menuOpen ? 'translateY(0)' : 'translateY(105%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        WebkitOverflowScrolling: 'touch',
      }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* User card */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '18px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 24,
            background: 'linear-gradient(135deg, #1e7ef7, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0,
            letterSpacing: '0.5px',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>
              {user?.name ?? '…'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
              {user?.email ?? ''}
            </div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
          >
            <X size={18} color="rgba(255,255,255,0.35)" />
          </button>
        </div>

        {/* Nav groups */}
        <div style={{ padding: '8px 16px 8px' }}>
          {menuGroups.map(group => (
            <div key={group.label}>
              <div style={{
                padding: '16px 4px 6px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.25)',
              }}>
                {group.label}
              </div>

              {group.items.map(item => {
                const Icon   = item.icon
                const active = pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <button
                    key={item.href}
                    onClick={() => handleMenuNav(item.href)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      width: '100%', padding: '13px 14px',
                      background: active ? 'rgba(30,126,247,0.12)' : 'rgba(255,255,255,0.03)',
                      border: 'none', borderRadius: 14,
                      cursor: 'pointer', textAlign: 'left', marginBottom: 4,
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      backgroundColor: active ? 'rgba(30,126,247,0.2)' : 'rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color={active ? '#1e7ef7' : 'rgba(255,255,255,0.55)'} />
                    </div>
                    <span style={{
                      flex: 1, fontSize: 15, fontWeight: active ? 600 : 400,
                      color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                    }}>
                      {item.label}
                    </span>
                    <ChevronRight size={14} color="rgba(255,255,255,0.18)" />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Logout */}
        <div style={{ padding: '4px 16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              width: '100%', padding: '13px 14px', marginTop: 8,
              background: 'rgba(239,68,68,0.08)', border: 'none',
              borderRadius: 14, cursor: 'pointer',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'rgba(239,68,68,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <LogOut size={16} color="#ef4444" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#ef4444' }}>
              Abmelden
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        backgroundColor: '#090d17',
        display: 'flex',
        alignItems: 'stretch',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(78px + env(safe-area-inset-bottom))',
        borderTop: '0.5px solid rgba(255,255,255,0.06)',
      }}>

        {/* Primary tabs */}
        {primaryNav.map(item => {
          const Icon   = item.icon
          const active = item.href === '/dashboard'
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const isActive = active && !menuOpen
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 5, textDecoration: 'none',
                color: isActive ? '#ffffff' : '#4a5568',
                transition: 'color 0.15s',
              }}
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.2 : 1.7}
                color={isActive ? '#ffffff' : '#4a5568'}
              />
              <span style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.01em',
                color: isActive ? '#ffffff' : '#4a5568',
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Menu tab */}
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 5, background: 'none', border: 'none', cursor: 'pointer',
            color: menuOpen || isMenuActive ? '#ffffff' : '#4a5568',
            transition: 'color 0.15s',
          }}
        >
          <AlignJustify
            size={24}
            strokeWidth={menuOpen || isMenuActive ? 2.2 : 1.7}
            color={menuOpen || isMenuActive ? '#ffffff' : '#4a5568'}
          />
          <span style={{
            fontSize: 10,
            fontWeight: menuOpen || isMenuActive ? 600 : 400,
            letterSpacing: '0.01em',
            color: menuOpen || isMenuActive ? '#ffffff' : '#4a5568',
          }}>
            Menü
          </span>
        </button>
      </nav>
    </>
  )
}
