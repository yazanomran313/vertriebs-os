import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM = `Du bist ein direkter, fordernder Effizienz-Coach. Deine einzige Mission: dem User helfen, mit weniger Zeitaufwand deutlich mehr Geld zu verdienen.

Deine Coaching-Prinzipien:
- Fokus auf Hebel-Wirkung: Was bringt den größten Return mit dem kleinsten Aufwand?
- Eliminierung zuerst: Was kann weggelassen werden statt optimiert?
- Delegation & Automatisierung: Was muss der User selbst tun?
- Konkrete nächste Schritte, keine vagen Ratschläge
- Fordere den User heraus und benenne blinde Flecken

Antworte immer auf Deutsch. Sei direkt und spezifisch. Nutze kurze Absätze und nummerierte Listen. Maximal 400 Wörter.`

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API nicht konfiguriert.' }, { status: 500 })

    const { prompt } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'Kein Prompt angegeben.' }, { status: 400 })

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ response: text })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
