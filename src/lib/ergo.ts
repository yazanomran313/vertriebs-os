// ─── Einheiten-Formel ────────────────────────────────────────────────────────
export function calcLaufzeit(alter: number): number {
  return alter < 32 ? 35 : Math.max(1, 67 - alter)
}
export function calcEinheiten(sparsumme: number, alter: number): number {
  return Math.round(sparsumme * calcLaufzeit(alter) * 0.023579 * 100) / 100
}

// ─── P-Schluss Produktionsmonate 2026 ────────────────────────────────────────
export const PRODUKTIONSMONATE = [
  { monat: 'Januar',    deadline: new Date('2026-02-04T17:30:00') },
  { monat: 'Februar',   deadline: new Date('2026-03-04T17:30:00') },
  { monat: 'März',      deadline: new Date('2026-04-07T17:30:00') },
  { monat: 'April',     deadline: new Date('2026-05-06T17:30:00') },
  { monat: 'Mai',       deadline: new Date('2026-06-03T17:30:00') },
  { monat: 'Juni',      deadline: new Date('2026-07-03T17:30:00') },
  { monat: 'Juli',      deadline: new Date('2026-08-05T17:30:00') },
  { monat: 'August',    deadline: new Date('2026-09-03T17:30:00') },
  { monat: 'September', deadline: new Date('2026-10-05T17:30:00') },
  { monat: 'Oktober',   deadline: new Date('2026-11-04T17:30:00') },
  { monat: 'November',  deadline: new Date('2026-12-03T17:30:00') },
  { monat: 'Dezember',  deadline: new Date('2027-01-06T17:30:00') },
]
export function getCurrentProduktionsmonat() {
  const now = new Date()
  return PRODUKTIONSMONATE.find(p => p.deadline > now) ?? PRODUKTIONSMONATE[11]
}
export function formatCountdown(deadline: Date): { text: string; status: 'normal' | 'today' | 'critical' } {
  const diff = deadline.getTime() - Date.now()
  if (diff <= 0) return { text: 'Abgelaufen', status: 'critical' }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const status = diff < 6 * 3600000 ? 'critical' : days === 0 ? 'today' : 'normal'
  return { text: days > 0 ? `${days}T ${hours}h ${mins}m` : `${hours}h ${mins}m`, status }
}

// ─── VG Stages ───────────────────────────────────────────────────────────────
export const VG_STAGES = [
  { id: 'kundenpotenzial', label: 'Kundenpotenzial', color: '#6366f1' },
  { id: 'vorqualifiziert', label: 'Vorqualifiziert',  color: '#f59e0b' },
  { id: 'beraten',         label: 'Beraten',          color: '#06b6d4' },
  { id: 'abgeschlossen',   label: 'Abgeschlossen',    color: '#22c55e' },
]

// ─── RG Stages ───────────────────────────────────────────────────────────────
export const RG_STAGES = [
  { id: 'partnerpotenzial',      label: 'Partnerpotenzial',      color: '#6366f1' },
  { id: 'vorqualifiziert',       label: 'Vorqualifiziert',       color: '#f59e0b' },
  { id: 'rekrutierungsgespraech',label: 'Rekrutierungsgespräch', color: '#8b5cf6' },
  { id: 'gst',                   label: 'GST',                   color: '#06b6d4' },
  { id: 'im_team',               label: 'Im Team',               color: '#22c55e' },
]

// ─── ERGO Pro Karrierestufen ──────────────────────────────────────────────────
export const KARRIERESTUFEN = [
  'Repräsentant',
  'Leitender Repräsentant',
  'Hauptrepräsentant',
  'Chefrepräsentant',
  'Direktionsrepräsentant Stufe 5',
  'Direktionsrepräsentant Stufe 6',
]
