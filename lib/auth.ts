const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TOKEN_KEY = 'zulu_token'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

export async function login(email: string, password: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase no está configurado. Verifique las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  }
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
