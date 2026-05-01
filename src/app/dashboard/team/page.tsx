'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, Trash2, Crown, Star, Award, Shield, User, Phone, MessageCircle, UserPlus } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  role: string
  parent_id: string | null
  einheiten: number
  telefon: string | null
  created_at: string
}

const ROLES = [
  { key: 'Rep',  label: 'Repräsentant',             short: 'Rep',  color: '#6b7280', bg: '#6b728020', stufe: 1 },
  { key: 'LR',   label: 'Leitender Repräsentant',   short: 'LR',   color: '#6366f1', bg: '#6366f120', stufe: 2 },
  { key: 'HR',   label: 'Hauptrepräsentant',        short: 'HR',   color: '#8b5cf6', bg: '#8b5cf620', stufe: 3 },
  { key: 'CR',   label: 'Chefrepräsentant',         short: 'CR',   color: '#f59e0b', bg: '#f59e0b20', stufe: 4 },
  { key: 'DR5',  label: 'Direktionsrepräsentant 5', short: 'DR5',  color: '#ef4444', bg: '#ef444420', stufe: 5 },
  { key: 'DR6',  label: 'Direktionsrepräsentant 6', short: 'DR6',  color: '#e1306c', bg: '#e1306c20', stufe: 6 },
]

// Legacy mapping for backward compat with old role IDs
const CAREER_LEVELS = ROLES.map(r => ({
  id: r.key,
  label: r.short,
  fullLabel: r.label,
  color: r.color,
  icon: r.stufe <= 1 ? User : r.stufe <= 2 ? Shield : r.stufe <= 3 ? Award : r.stufe <= 4 ? Star : Crown,
  stufe: r.stufe,
}))

function getLevel(role: string) {
  return CAREER_LEVELS.find(l => l.id === role) ?? CAREER_LEVELS[0]
}

function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

interface TreeNode extends TeamMember { children: TreeNode[] }

function buildTree(members: TeamMember[], parentId: string | null = null): TreeNode[] {
  return members
    .filter(m => m.parent_id === parentId)
    .map(m => ({ ...m, children: buildTree(members, m.id) }))
}

// ─── Org Node ────────────────────────────────────────────────────────────────
function OrgNode({
  node,
  isRoot = false,
  onAdd,
  onDelete,
}: {
  node: TreeNode
  isRoot?: boolean
  onAdd: (parentId: string) => void
  onDelete: (id: string) => void
}) {
  const lvl = getLevel(node.role)
  const LvlIcon = lvl.icon
  const size = isRoot ? 88 : 68
  const fontSize = isRoot ? 24 : 18

  return (
    <div className="org-level">
      {/* ── Circle card ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        {/* Delete button (hover via group) */}
        {!isRoot && (
          <button
            onClick={() => onDelete(node.id)}
            className="org-delete"
            title="Löschen"
            style={{
              position: 'absolute', top: -6, right: -6, zIndex: 10,
              width: 20, height: 20, borderRadius: '50%',
              backgroundColor: '#ef4444', border: '2px solid var(--bg-secondary)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.15s',
            }}
          >
            <X size={10} />
          </button>
        )}

        {/* Avatar circle */}
        <div
          style={{
            width: size, height: size, borderRadius: '50%',
            background: `linear-gradient(135deg, ${lvl.color}22, ${lvl.color}44)`,
            border: `3px solid ${lvl.color}`,
            boxShadow: isRoot
              ? `0 0 0 5px ${lvl.color}18, 0 8px 32px ${lvl.color}30`
              : `0 2px 12px ${lvl.color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize, fontWeight: 800, color: lvl.color,
            cursor: 'default', position: 'relative',
          }}
          className="org-avatar"
        >
          {initials(node.name)}
          {isRoot && (
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 22, height: 22, borderRadius: '50%',
              backgroundColor: lvl.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-secondary)',
            }}>
              <LvlIcon size={11} color="#fff" />
            </div>
          )}
        </div>

        {/* Name + role */}
        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 6, minWidth: 100 }}>
          <div style={{ fontWeight: 700, fontSize: isRoot ? 15 : 13, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {node.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <div style={{ fontSize: 10, color: lvl.color, fontWeight: 700, letterSpacing: '0.04em' }}>
              {lvl.fullLabel}
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, backgroundColor: lvl.color + '22', color: lvl.color, borderRadius: 8, padding: '1px 5px', lineHeight: 1.4 }}>
              S{lvl.stufe}
            </span>
          </div>
          {/* Phone links */}
          {node.telefon && (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
              <a href={`tel:${node.telefon}`}
                style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', backgroundColor: '#3b82f620', borderRadius: 6, color: '#3b82f6', textDecoration: 'none', fontSize: 10, gap: 3 }}>
                <Phone size={9} /> {node.telefon}
              </a>
              <a href={`https://wa.me/${node.telefon.replace(/\+/g, '')}`}
                target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', padding: '2px 5px', backgroundColor: '#22c55e20', borderRadius: 6, color: '#22c55e', textDecoration: 'none' }}>
                <MessageCircle size={9} />
              </a>
            </div>
          )}
        </div>

        {/* Add partner button */}
        <button
          onClick={() => onAdd(node.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            backgroundColor: '#6366f115', border: '1px dashed #6366f144',
            borderRadius: 8, padding: '4px 10px',
            fontSize: 11, color: '#6366f1', cursor: 'pointer', fontWeight: 600,
            marginBottom: 4,
          }}
        >
          <UserPlus size={11} /> Partner
        </button>
      </div>

      {/* ── Children ── */}
      {node.children.length > 0 && (
        <>
          {/* Vertical stem down from node */}
          <div style={{ width: 2, height: 28, backgroundColor: 'var(--border)' }} />

          {/* Children row */}
          <div className="org-children">
            {node.children.map(child => (
              <div key={child.id} className="org-child">
                <OrgNode node={child} onAdd={onAdd} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Add Modal ───────────────────────────────────────────────────────────────
function AddModal({
  members,
  preselectedParent,
  onClose,
  onSave,
}: {
  members: TeamMember[]
  preselectedParent: string | null
  onClose: () => void
  onSave: (m: Omit<TeamMember, 'id' | 'created_at'>) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('Rep')
  const [parentId, setParentId] = useState<string>(preselectedParent ?? 'root')
  const [telefon, setTelefon] = useState('')
  const [saving, setSaving] = useState(false)

  function formatDE(raw: string) {
    const d = raw.replace(/[^\d+]/g, '')
    if (!d) return ''
    if (d.startsWith('+49')) return d
    if (d.startsWith('0049')) return '+49' + d.slice(4)
    if (d.startsWith('0')) return '+49' + d.slice(1)
    return '+49' + d
  }

  async function handle() {
    if (!name.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      role,
      parent_id: parentId === 'root' ? null : parentId,
      einheiten: 0,
      telefon: telefon.trim() ? formatDE(telefon.trim()) : null,
    })
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20,
    }}>
      <div style={{
        backgroundColor: 'var(--bg-secondary)', borderRadius: 18,
        padding: 26, width: '100%', maxWidth: 400,
        border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Partner hinzufügen</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {[
          { label: 'NAME', el: <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} autoFocus placeholder="Vor- und Nachname" style={inputStyle} /> },
          { label: 'KARRIERESTUFE', el: (
            <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
              {ROLES.map(r => <option key={r.key} value={r.key}>Stufe {r.stufe} — {r.short} · {r.label}</option>)}
            </select>
          )},
          { label: 'DIREKT UNTER', el: (
            <select value={parentId} onChange={e => setParentId(e.target.value)} style={inputStyle}>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({getLevel(m.role).label})</option>)}
              {members.length === 0 && <option value="root">— Top-Position (Du selbst)</option>}
              {members.length > 0 && <option value="root">— Keine (Top-Position)</option>}
            </select>
          )},
          { label: 'TELEFON (optional)', el: (
            <input value={telefon} onChange={e => setTelefon(e.target.value)}
              onBlur={e => setTelefon(e.target.value.trim() ? formatDE(e.target.value.trim()) : '')}
              placeholder="01x..." style={inputStyle} />
          )},
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6, letterSpacing: '0.06em' }}>{label}</label>
            {el}
          </div>
        ))}

        <button
          onClick={handle}
          disabled={saving || !name.trim()}
          style={{
            width: '100%', backgroundColor: saving || !name.trim() ? 'var(--bg-hover)' : '#6366f1',
            color: saving || !name.trim() ? 'var(--text-secondary)' : '#fff',
            border: 'none', borderRadius: 10, padding: 13, fontSize: 14,
            fontWeight: 700, cursor: saving || !name.trim() ? 'default' : 'pointer', marginTop: 4,
          }}
        >
          {saving ? 'Speichern…' : 'Hinzufügen'}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 12px', fontSize: 14, color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box',
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [addParent, setAddParent] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('team_members').select('*').order('created_at')
    if (data) setMembers(data)
    setLoading(false)
  }

  async function saveMember(m: Omit<TeamMember, 'id' | 'created_at'>) {
    const { error } = await supabase.from('team_members').insert(m)
    if (!error) { await load(); setShowAdd(false); setAddParent(null) }
  }

  async function deleteMember(id: string) {
    if (!confirm('Wirklich löschen? Partner darunter bleiben erhalten.')) return
    await supabase.from('team_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  function openAdd(parentId: string) {
    setAddParent(parentId)
    setShowAdd(true)
  }

  const tree = buildTree(members)
  const totalPartner = Math.max(0, members.length - 1)

  return (
    <div>
      <style>{`
        .org-level {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .org-children {
          display: flex;
          align-items: flex-start;
          gap: 0;
        }
        .org-child {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 20px 0;
          position: relative;
        }
        /* vertical line from horizontal bar down to child circle */
        .org-child::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 28px;
          background: var(--border);
        }
        /* horizontal connecting line between siblings */
        .org-child::after {
          content: '';
          position: absolute;
          top: 0;
          height: 2px;
          background: var(--border);
          left: 0;
          right: 0;
        }
        .org-child:first-child::after { left: 50%; }
        .org-child:last-child::after  { right: 50%; }
        .org-child:only-child::after  { display: none; }
        .org-child:only-child::before { display: none; }

        /* show delete button on hover */
        .org-avatar:hover ~ .org-delete,
        .org-delete:hover { opacity: 1 !important; }
        div:hover > div > .org-delete { opacity: 1 !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Team</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            {totalPartner} Partner · {members.length} Personen gesamt
          </p>
        </div>
        <button
          onClick={() => { setAddParent(null); setShowAdd(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: '#6366f1', color: '#fff',
            border: 'none', borderRadius: 10, padding: '10px 16px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Partner hinzufügen
        </button>
      </div>

      {/* Empty state */}
      {members.length === 0 && !loading && (
        <div style={{
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '50px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Noch keine Struktur</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Füge zuerst dich selbst als Top-Position hinzu,<br />dann deine direkte Partner darunter.
          </div>
          <button
            onClick={() => { setAddParent(null); setShowAdd(true) }}
            style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Struktur starten
          </button>
        </div>
      )}

      {/* Org Chart */}
      {tree.length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, overflow: 'auto', padding: '32px 24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', minWidth: 'max-content' }}>
            <div style={{ display: 'flex', gap: 40 }}>
              {tree.map((root, i) => (
                <OrgNode
                  key={root.id}
                  node={root}
                  isRoot={i === 0 && tree.length === 1}
                  onAdd={openAdd}
                  onDelete={deleteMember}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Karrierestufen Legende ── */}
      <div style={{ marginTop: 28, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.1em', marginBottom: 12 }}>KARRIERESTUFEN — ERGO PRO</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ROLES.map(r => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: r.bg, border: `1px solid ${r.color}33`, borderRadius: 10, padding: '8px 12px', flex: '1 1 140px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: r.color + '33', border: `2px solid ${r.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: r.color, flexShrink: 0 }}>
                {r.stufe}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.short}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{r.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <AddModal
          members={members}
          preselectedParent={addParent}
          onClose={() => { setShowAdd(false); setAddParent(null) }}
          onSave={saveMember}
        />
      )}
    </div>
  )
}
