import { getToken } from "@/lib/auth"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5065"

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Error ${res.status}: ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
      else if (body?.message) message = body.message
      else if (typeof body === "string") message = body
    } catch {
      // ignore JSON parse errors, use default message
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    cache: "no-store",
    mode: "cors",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options?.headers as Record<string, string> | undefined),
    },
  })
  return handleResponse<T>(res)
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" })
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) })
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) })
}

export async function apiDelete(path: string): Promise<void> {
  return apiFetch<void>(path, { method: "DELETE" })
}

export const api = {
  get: <T>(path: string) => apiGet<T>(path),
  post: <T>(path: string, body: unknown) => apiPost<T>(path, body),
  put: <T>(path: string, body: unknown) => apiPut<T>(path, body),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
}
