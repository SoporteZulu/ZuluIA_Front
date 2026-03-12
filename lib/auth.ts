const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://jygtddlvzaojekyvdyan.supabase.co'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5Z3RkZGx2emFvamVreXZkeWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTYwMTMsImV4cCI6MjA4NzY5MjAxM30.CLtVTvJAcwVbrg_jii-nwyE4pm9k9beefOz0a_guUH4'

const TOKEN_KEY = 'zulu_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    let message = 'Credenciales inválidas'
    try {
      const body = await res.json()
      if (body?.error_description) message = body.error_description
      else if (body?.message) message = body.message
      else if (body?.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  const data = await res.json()
  if (!data?.access_token) throw new Error('No se recibió el token de acceso')

  localStorage.setItem(TOKEN_KEY, data.access_token)
}

export function logout(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}
