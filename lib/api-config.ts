const DEVELOPMENT_API_BASE_URL = "http://localhost:5065"
const PRODUCTION_API_BASE_URL = "https://rdweb.zulu.com.ar/ZuluIA_Back"

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

function getDefaultApiBaseUrl(): string {
  return process.env.NODE_ENV === "production" ? PRODUCTION_API_BASE_URL : DEVELOPMENT_API_BASE_URL
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_URL ?? getDefaultApiBaseUrl()
)

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
