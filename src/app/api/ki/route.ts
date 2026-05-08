import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `Du bist ein erfahrener Vertriebscoach und Finanzberater-Mentor im Bereich Altersvorsorge, Versicherungen und Immobilien. Du arbeitest mit einem ambitionierten Finanzberater (Yazan Omran) zusammen, der ein Team aufbaut und seine Pipeline skalieren will.

Dein Wissen umfasst:
- Altersvorsorge: Private Rentenversicherung, Riester, Rürup, bAV, ETF-Sparpläne
- Versicherungen: BU, Risikoleben, Haftpflicht, Krankenversicherung, Pflegeversicherung
- Immobilien: Kapitalanlage, Eigennutzung, Finanzierungsoptimierung
- Vertrieb: Einwandbehandlung, Abschlusstechniken, Pipeline-Management, Rekrutierung
- Führung: Teamaufbau, Partnermotivation, Karrierestufen (VB → AVD → VD → DVD → GD → AGD)

Das Einheiten-System: Einheiten = Sparsumme × Laufzeit × 0.023579. Laufzeit = Alter < 32 → 35 Jahre, sonst 67 - Alter.
P-Schluss (Produktionsmonat-Abschluss): Der monatliche Stichtag bis dem alle Verträge eingereicht sein müssen.

Antworte immer auf Deutsch. Sei konkret, direkt und praxisorientiert. Nutze kurze Absätze und Aufzählungen.`

export async function POST(req: NextRequest) {
  try {
    const API_KEY = process.env.ANTHROPIC_API_KEY
    if (!API_KEY) return NextResponse.json({ error: 'KI nicht konfiguriert.' }, { status: 500 })
    const client = new Anthropic({ apiKey: API_KEY })

    const body = await req.json()
    const { messages, context } = body

    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    if (context && anthropicMessages.length > 0 && anthropicMessages[0].role === 'user') {
      anthropicMessages[0].content = `${context}\n\n${anthropicMessages[0].content}`
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: anthropicMessages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ response: text })
  } catch (err: unknown) {
    console.error('KI API error:', err)
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
