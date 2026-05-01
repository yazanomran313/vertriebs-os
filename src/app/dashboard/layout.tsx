import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar — nur auf Desktop sichtbar */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Hauptinhalt */}
      <main
        className="main-content"
        style={{
          flex: 1,
          backgroundColor: 'var(--bg-primary)',
          overflowY: 'auto',
          padding: 32,
        }}
      >
        {children}
      </main>

      {/* Bottom Nav — nur auf Mobile sichtbar */}
      <div className="mobile-nav">
        <BottomNav />
      </div>
    </div>
  )
}
