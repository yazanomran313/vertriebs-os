'use client'

import { useState, useRef } from 'react'
import { Upload, X, Check, AlertCircle, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ParsedContact {
  name: string
  phone: string
  selected: boolean
}

interface Props {
  onClose: () => void
  onImported: () => void
}

function parseVCard(text: string): ParsedContact[] {
  const contacts: ParsedContact[] = []
  const cards = text.split(/BEGIN:VCARD/i).slice(1)

  for (const card of cards) {
    let name = ''
    let phone = ''

    for (const line of card.split('\n')) {
      const l = line.trim()
      if (/^FN:/i.test(l)) name = l.replace(/^FN:/i, '').trim()
      else if (/^N:/i.test(l) && !name) {
        const parts = l.replace(/^N:/i, '').split(';')
        name = [parts[1], parts[0]].filter(Boolean).join(' ').trim()
      } else if (/^TEL/i.test(l)) {
        const val = l.split(':').slice(1).join(':').trim()
        if (val && !phone) phone = val
      }
    }

    if (name) contacts.push({ name, phone, selected: true })
  }

  return contacts
}

function parseCSV(text: string): ParsedContact[] {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  const header = lines[0].toLowerCase().split(',').map((h) => h.replace(/"/g, '').trim())

  const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('vorname') || h === 'first name' || h === 'given name')
  const lastNameIdx = header.findIndex((h) => h.includes('nachname') || h === 'last name' || h === 'family name')
  const phoneIdx = header.findIndex((h) => h.includes('phone') || h.includes('telefon') || h.includes('mobile') || h.includes('handy'))

  if (nameIdx === -1) return []

  const contacts: ParsedContact[] = []

  for (const line of lines.slice(1)) {
    const cols = line.split(',').map((c) => c.replace(/"/g, '').trim())
    let name = cols[nameIdx] || ''
    if (lastNameIdx !== -1 && cols[lastNameIdx]) name = `${name} ${cols[lastNameIdx]}`.trim()
    const phone = phoneIdx !== -1 ? cols[phoneIdx] || '' : ''
    if (name) contacts.push({ name, phone, selected: true })
  }

  return contacts
}

export default function ContactImport({ onClose, onImported }: Props) {
  const [contacts, setContacts] = useState<ParsedContact[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError('')
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      let parsed: ParsedContact[] = []

      if (file.name.toLowerCase().endsWith('.vcf')) {
        parsed = parseVCard(text)
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        parsed = parseCSV(text)
      } else {
        setError('Bitte eine .vcf oder .csv Datei hochladen.')
        return
      }

      if (parsed.length === 0) {
        setError('Keine Kontakte gefunden. Prüfe das Dateiformat.')
        return
      }

      setContacts(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function toggleAll(val: boolean) {
    setContacts(contacts.map((c) => ({ ...c, selected: val })))
  }

  async function importContacts() {
    const toImport = contacts.filter((c) => c.selected)
    if (toImport.length === 0) return
    setImporting(true)

    const rows = toImport.map((c) => ({
      name: c.name,
      phone: c.phone,
      source: 'Import',
      type: 'kunde',
      stage: 'neu',
      notes: '',
      last_contact: new Date().toISOString().split('T')[0],
    }))

    await supabase.from('contacts').insert(rows)
    setImporting(false)
    setStep('done')
    setTimeout(() => {
      onImported()
      onClose()
    }, 1500)
  }

  const selectedCount = contacts.filter((c) => c.selected).length

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: '#00000099', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, width: 560, maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Kontakte importieren</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              {step === 'upload' && 'iPhone (.vcf) oder Google/Android (.csv)'}
              {step === 'preview' && `${contacts.length} Kontakte gefunden in ${fileName}`}
              {step === 'done' && 'Import abgeschlossen'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {step === 'upload' && (
            <div>
              {/* Drag & Drop Zone */}
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
              >
                <Upload size={32} color="var(--accent)" style={{ marginBottom: 12 }} />
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Datei hier reinziehen</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>oder klicken zum Auswählen</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>.vcf · .csv</div>
                <input ref={fileRef} type="file" accept=".vcf,.csv" style={{ display: 'none' }}
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </div>

              {error && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Anleitung */}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'iPhone / iCloud', steps: 'iCloud.com → Kontakte → Alle auswählen → Exportieren als vCard (.vcf)' },
                  { label: 'Android / Google', steps: 'contacts.google.com → Exportieren → Google CSV (.csv)' },
                  { label: 'Mac Kontakte App', steps: 'Kontakte öffnen → Alle auswählen → Ablage → Exportieren → vCard (.vcf)' },
                ].map((item) => (
                  <div key={item.label} style={{ backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={13} color="var(--accent)" /> {item.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.steps}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selectedCount} von {contacts.length} ausgewählt</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => toggleAll(true)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Alle</button>
                  <button onClick={() => toggleAll(false)} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>Keine</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {contacts.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setContacts(contacts.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: c.selected ? 'var(--bg-hover)' : 'transparent', border: `1px solid ${c.selected ? 'var(--border)' : 'transparent'}`, borderRadius: 8, cursor: 'pointer' }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${c.selected ? 'var(--accent)' : 'var(--border)'}`, backgroundColor: c.selected ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {c.selected && <Check size={11} color="#fff" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                      {c.phone && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#22c55e20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={28} color="#22c55e" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{selectedCount} Kontakte importiert</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Alle in Pipeline unter &quot;Neu&quot; eingetragen.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={importContacts}
              disabled={importing || selectedCount === 0}
              style={{ width: '100%', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: importing || selectedCount === 0 ? 'not-allowed' : 'pointer', opacity: selectedCount === 0 ? 0.5 : 1 }}
            >
              {importing ? 'Importiere...' : `${selectedCount} Kontakte importieren`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
