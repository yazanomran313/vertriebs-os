import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY ist nicht konfiguriert.' },
      { status: 500 }
    )
  }

  const { email, name } = await req.json() as { email: string; name?: string }
  if (!email) return NextResponse.json({ error: 'E-Mail fehlt.' }, { status: 400 })

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name: name || '' },
    redirectTo: `${req.headers.get('origin') ?? 'https://command-center-pied-five.vercel.app'}/set-password`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, userId: data.user?.id })
}
