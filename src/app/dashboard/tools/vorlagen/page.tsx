'use client'

import { useState } from 'react'
import { Check, Copy, ChevronDown, ChevronRight } from 'lucide-react'

const TEMPLATES = [
  {
    category: 'ERSTKONTAKT',
    color: '#6366f1',
    emoji: '👋',
    items: [
      {
        name: 'Kaltansprache (WhatsApp)',
        text: 'Hallo [Name]! 👋 Mein Name ist [dein Name] – ich beschäftige mich mit Vermögensaufbau und finanzieller Absicherung.\n\nIch bin gerade dabei, in meinem Netzwerk mit interessanten Menschen zu sprechen. Wärst du kurz offen für ein 5-Minuten-Gespräch?',
      },
      {
        name: 'Nach Empfehlung',
        text: 'Hallo [Name]! Ich bin [dein Name]. [Empfehlungsgeber] hat mich auf dich aufmerksam gemacht – er meinte, ein kurzes Gespräch mit mir könnte für dich spannend sein.\n\nHätte ich kurz 5 Minuten von dir?',
      },
      {
        name: 'Instagram / Social Media',
        text: 'Hey [Name]! 😊 Ich hab dein Profil gesehen – super spannend was du machst!\n\nIch arbeite im Bereich Finanzplanung und Vermögensaufbau. Magst du mal kurz tauschen? Manchmal ergeben sich da interessante Gemeinsamkeiten.',
      },
    ],
  },
  {
    category: 'NACHFASSEN',
    color: '#FF9F0A',
    emoji: '🔁',
    items: [
      {
        name: 'Nach erstem Gespräch',
        text: 'Hey [Name]! Wollte kurz nachfragen, ob du die Möglichkeit hattest, über unser Gespräch nachzudenken.\n\nGibt es noch Fragen von deiner Seite? 😊',
      },
      {
        name: 'Kein Interesse → Türe offen lassen',
        text: 'Hey [Name], alles gut – kein Stress! Ich respektiere das voll.\n\nFalls sich bei dir mal was ändert oder du Fragen rund um das Thema hast, bin ich gerne da. Alles Gute dir! 🙌',
      },
      {
        name: 'Lange kein Kontakt',
        text: 'Hey [Name]! Lange nicht mehr gemeldet – wie läuft\'s bei dir so? 😊\n\nIch bin gerade wieder aktiver dabei, mit Leuten aus meinem Netzwerk zu sprechen. Wärst du nochmal offen für ein kurzes Update?',
      },
    ],
  },
  {
    category: 'TERMIN',
    color: '#30D158',
    emoji: '📅',
    items: [
      {
        name: 'Terminbestätigung',
        text: 'Hey [Name]! Ich bestätige kurz unseren Termin:\n\n📅 Datum: [Datum]\n🕐 Uhrzeit: [Uhrzeit]\n📍 Ort/Format: [Ort oder "per Zoom"]\n\nFalls etwas dazwischenkommt, meld dich gerne. Bis dann! 😊',
      },
      {
        name: 'Terminerinnerung (Tag vorher)',
        text: 'Hey [Name]! Kurze Erinnerung – morgen haben wir unseren Termin um [Uhrzeit] Uhr. 😊\n\nIch freu mich drauf! Bis dann.',
      },
      {
        name: 'Termin absagen / verschieben',
        text: 'Hey [Name], leider muss ich unseren Termin am [Datum] verschieben – tut mir leid!\n\nWann hättest du nächste Woche nochmal Zeit? Meld dich kurz, dann finden wir was. 🙏',
      },
    ],
  },
  {
    category: 'NACH BERATUNG',
    color: '#06b6d4',
    emoji: '📋',
    items: [
      {
        name: 'Zusammenfassung senden',
        text: 'Hey [Name]! War ein super Gespräch heute – danke für deine Zeit! 😊\n\nWie besprochen schick ich dir kurz die wichtigsten Punkte:\n\n📌 [Punkt 1]\n📌 [Punkt 2]\n📌 [Punkt 3]\n\nBei Fragen bin ich jederzeit da!',
      },
      {
        name: 'Abschluss-Follow-up',
        text: 'Hey [Name]! Wollte kurz nachhaken – hast du dir unsere Lösung nochmal durch den Kopf gehen lassen?\n\nIch stehe für Fragen bereit und würde mich freuen, den nächsten Schritt mit dir zusammen anzugehen. 💪',
      },
    ],
  },
  {
    category: 'TEAM / REKRUTIERUNG',
    color: '#8b5cf6',
    emoji: '🤝',
    items: [
      {
        name: 'Erstansprache für RG',
        text: 'Hey [Name]! Ich schaue mich gerade in meinem Netzwerk nach ambitionierten Leuten um, die Interesse haben könnten, sich nebenberuflich oder hauptberuflich im Bereich Finanzdienstleistung aufzustellen.\n\nWärst du offen für ein kurzes Infogespräch?',
      },
      {
        name: 'Nach RG-Gespräch',
        text: 'Hey [Name]! Hat mich gefreut, mit dir zu sprechen! 😊\n\nWie gesagt: Ich sehe in dir echtes Potenzial für diesen Weg. Nimm dir die Zeit, darüber nachzudenken – und meld dich, wenn du Fragen hast. 💪',
      },
    ],
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button onClick={handleCopy} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
      backgroundColor: copied ? '#30D15820' : '#6366f118',
      color: copied ? '#30D158' : '#6366f1',
      fontSize: 12, fontWeight: 700, flexShrink: 0,
      transition: 'all 0.15s',
    }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Kopiert!' : 'Kopieren'}
    </button>
  )
}

function CategorySection({ cat }: { cat: typeof TEMPLATES[0] }) {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Category header */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9, flexShrink: 0,
          backgroundColor: cat.color + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15,
        }}>
          {cat.emoji}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, letterSpacing: '0.08em', flex: 1, textAlign: 'left' }}>
          {cat.category}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 4 }}>{cat.items.length}</span>
        {open ? <ChevronDown size={14} color="var(--text-tertiary)" /> : <ChevronRight size={14} color="var(--text-tertiary)" />}
      </button>

      {open && (
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {cat.items.map((item, i) => (
            <div key={i} style={{ borderBottom: i < cat.items.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              {/* Item header */}
              <button onClick={() => setExpanded(expanded === i ? null : i)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
              }}>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                  {expanded !== i && (
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.text.replace(/\n/g, ' ')}
                    </div>
                  )}
                </div>
                {expanded !== i
                  ? <ChevronRight size={14} color="var(--text-tertiary)" />
                  : <ChevronDown size={14} color="var(--text-tertiary)" />
                }
              </button>

              {/* Expanded content */}
              {expanded === i && (
                <div style={{ padding: '0 16px 14px' }}>
                  <div style={{
                    backgroundColor: 'var(--bg-hover)', borderRadius: 10,
                    padding: '12px 14px', marginBottom: 10,
                    fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {item.text}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {item.text.match(/\[([^\]]+)\]/g)?.map(p => (
                        <span key={p} style={{ fontSize: 10, fontWeight: 700, color: '#FF9F0A', backgroundColor: '#FF9F0A15', padding: '2px 7px', borderRadius: 6 }}>
                          {p}
                        </span>
                      ))}
                    </div>
                    <CopyButton text={item.text} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VorlagenPage() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 100px' }}>

      <div style={{ padding: '16px 0 20px' }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>💬 Vorlagen</h1>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
          WhatsApp-Texte für jeden Situation · Tippen → kopieren → senden
        </div>
      </div>

      <div style={{
        backgroundColor: '#6366f115', border: '1px solid #6366f130',
        borderRadius: 12, padding: '10px 14px', marginBottom: 20,
        fontSize: 12, color: '#6366f1', lineHeight: 1.5,
      }}>
        💡 Tippe auf eine Vorlage → Text erscheint → <strong>Kopieren</strong> → direkt in WhatsApp einfügen.
        Ersetze Platzhalter wie <strong>[Name]</strong> vor dem Senden.
      </div>

      {TEMPLATES.map(cat => (
        <CategorySection key={cat.category} cat={cat} />
      ))}
    </div>
  )
}
