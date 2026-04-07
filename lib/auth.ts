import { API_BASE_URL, buildApiUrl } from "@/lib/api-config"

const AUTH_LOGIN_URL = buildApiUrl("/api/Auth/login")

const TOKEN_KEY = "zulu_token"

type AuthLoginSuccessResponse = {
  access_token: string
  token_type: string
  expires_in: number
  expires_at: number
  refresh_token: string | null
  user: {
    id: number
    user_name: string
    email: string
    nombre_completo: string
    activo: boolean
  }
}

type AuthLoginErrorResponse = {
  message?: string
  error?: string
  error_description?: string
}

export function isAuthConfigured(): boolean {
  return API_BASE_URL.length > 0
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

export async function login(userName: string, password: string): Promise<void> {
  if (!isAuthConfigured()) {
    throw new Error(
      "La API no está configurada. Verifique NEXT_PUBLIC_API_URL o la URL base definida en la aplicación."
    )
  }

  const res = await fetch(AUTH_LOGIN_URL, {
    method: "POST",
    headers: {
      accept: "*/*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_name: userName,
      email: "string",
      password,
    }),
  })

  if (!res.ok) {
    let message = "Credenciales inválidas"
    try {
      const body = (await res.json()) as AuthLoginErrorResponse
      if (body?.error_description) message = body.error_description
      else if (body?.message) message = body.message
      else if (body?.error) message = body.error
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  const data = (await res.json()) as AuthLoginSuccessResponse

  if (!data?.access_token) {
    throw new Error("No se recibió el token de acceso")
  }

  localStorage.setItem(TOKEN_KEY, data.access_token)
}

export function logout(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
}
