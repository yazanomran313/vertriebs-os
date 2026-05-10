import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const SYSTEM = `Du bist ein erfahrener Finanz- und Versicherungsberater in Deutschland.
Analysiere rohe Kundennotizen und gib NUR ein JSON-Objekt zurück (kein Markdown, keine Erklärung):
{
  "kunde": {
    "name": "", "beruf": "", "geburtsjahr": "", "wohnort": "",
    "einkommen_netto_monatlich": "", "familienstand": "", "kinder": []
  },
  "immobilien": [{ "objekt": "", "ort": "", "nutzung": "" }],
  "bedarfsfelder": [{
    "titel": "", "prioritaet": "hoch|mittel|niedrig",
    "begruendung": "", "potenzial": "", "produkt_empfehlung": ""
  }],
  "bestehende_vertraege": [{
    "art": "", "versicherungsnummer": "", "beitrag_jaehrlich": "",
    "anbieter": "", "optimierungspotenzial": ""
  }],
  "offene_fragen": []
}`

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return NextResponse.json({ error: 'KI nicht konfiguriert. ANTHROPIC_API_KEY fehlt.' }, { status: 500 })

  const { notes } = await req.json() as { notes: string }
  if (!notes?.trim()) return NextResponse.json({ error: 'Keine Notizen übergeben.' }, { status: 400 })

  try {
    const client = new Anthropic({ apiKey: key })

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: 'user', content: notes }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    try {
      return NextResponse.json({ ok: true, data: JSON.parse(clean) })
    } catch {
      return NextResponse.json({ error: 'Analyse konnte nicht verarbeitet werden.', raw }, { status: 422 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: `API-Fehler: ${message}` }, { status: 500 })
  }
}
