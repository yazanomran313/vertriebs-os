import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, name } = await req.json() as { email: string; name?: string }
  return NextResponse.json({
    message: `Bitte lade ${email} manuell in Supabase ein: Authentication → Users → Invite user`,
    email,
    name,
  })
}
