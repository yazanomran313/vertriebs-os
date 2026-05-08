import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import PwaSetup from '@/components/PwaSetup'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      /* FTMO gradient — navy at top, near-black at bottom */
      background: 'linear-gradient(180deg, #0d1526 0%, #060a12 100%)',
      backgroundAttachment: 'fixed',
    }}>
      <PwaSetup />

      {/* Sidebar — Desktop only */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Main content */}
      <main
        className="main-content"
        style={{
          flex: 1,
          background: 'transparent',
          overflowY: 'auto',
          padding: 32,
          minHeight: '100vh',
        }}
      >
        {children}
      </main>

      {/* Bottom Nav — Mobile only */}
      <div className="mobile-nav">
        <BottomNav />
      </div>
    </div>
  )
}
