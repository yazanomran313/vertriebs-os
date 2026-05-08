import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) return null
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// GET /api/admin/invitations — liste aller eingeladenen aber noch nicht bestätigten User
export async function GET() {
  const admin = adminClient()
  if (!admin) return NextResponse.json({ error: 'Service key fehlt.' }, { status: 500 })

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Eingeladen aber noch kein Passwort gesetzt = email_confirmed_at ist null
  const pending = (data.users ?? [])
    .filter(u => !u.email_confirmed_at && !u.confirmed_at)
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      name: (u.user_metadata?.name as string) ?? null,
      invited_at: u.created_at,
    }))

  return NextResponse.json({ pending })
}

// DELETE /api/admin/invitations — widerruft eine Einladung (löscht den Auth-User)
export async function DELETE(req: NextRequest) {
  const admin = adminClient()
  if (!admin) return NextResponse.json({ error: 'Service key fehlt.' }, { status: 500 })

  const { userId } = await req.json() as { userId: string }
  if (!userId) return NextResponse.json({ error: 'userId fehlt.' }, { status: 400 })

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
