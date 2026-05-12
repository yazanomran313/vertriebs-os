import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as 'invite' | 'recovery' | 'email' | null
  const next       = searchParams.get('next') ?? '/set-password'

  // Invite + recovery/set-password both land on /set-password
  const destination = type === 'invite' || next === '/set-password'
    ? `${origin}/set-password`
    : `${origin}${next}`

  // ── PKCE code flow ──────────────────────────────────────
  if (code) {
    // Create the redirect response FIRST, then write session cookies onto it.
    // If we write to cookieStore and then return a fresh NextResponse, the
    // browser never receives those cookies and the session is lost.
    const response = NextResponse.redirect(destination)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()            { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  }

  // ── Token-hash / OTP flow (fallback for older Supabase emails) ──
  if (token_hash && type) {
    const response = NextResponse.redirect(destination)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()            { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return response
  }

  // ── Fallback: hash-fragment token (legacy Supabase implicit flow) ──
  // The client-side set-password page handles this case itself.
  return NextResponse.redirect(`${origin}/set-password`)
}
