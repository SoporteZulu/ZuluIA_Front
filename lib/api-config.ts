const DEVELOPMENT_API_BASE_URL = "http://localhost:5065"

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

function getConfiguredApiBaseUrl(): string | null {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL

  if (typeof configuredApiUrl !== "string") {
    return null
  }

  const normalizedApiUrl = normalizeBaseUrl(configuredApiUrl)
  return normalizedApiUrl.length > 0 ? normalizedApiUrl : null
}

function getApiBaseUrl(): string {
  const configuredApiUrl = getConfiguredApiBaseUrl()

  if (configuredApiUrl) {
    return configuredApiUrl
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL must be set when NODE_ENV is production.")
  }

  return DEVELOPMENT_API_BASE_URL
}

export const API_BASE_URL = getApiBaseUrl()

export function buildApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
