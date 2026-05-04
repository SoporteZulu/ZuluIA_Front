/** @type {import('next').NextConfig} */
const DEVELOPMENT_API_BASE_URL = "http://localhost:5065"
const STATIC_IIS_BUILD_TARGET = "iis-static"
const DEFAULT_IIS_BASE_PATH = "/Front_IA"

const normalizeApiBaseUrl = (value) => value.trim().replace(/\/+$/, "")
const normalizeBasePath = (value) => {
  const trimmedValue = value.trim().replace(/\/+$/, "")
  if (!trimmedValue) return ""
  return trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`
}
const isStaticIisBuild = process.env.BUILD_TARGET === STATIC_IIS_BUILD_TARGET

const getBasePath = () => {
  const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH
  if (typeof configuredBasePath === "string") {
    const normalizedBasePath = normalizeBasePath(configuredBasePath)
    if (normalizedBasePath) {
      return normalizedBasePath
    }
  }

  return isStaticIisBuild ? DEFAULT_IIS_BASE_PATH : ""
}

const getApiBaseUrl = () => {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL
  const normalizedApiUrl =
    typeof configuredApiUrl === "string" ? normalizeApiBaseUrl(configuredApiUrl) : ""

  if (normalizedApiUrl) {
    return normalizedApiUrl
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL must be set when NODE_ENV is production.")
  }

  return DEVELOPMENT_API_BASE_URL
}

const apiBaseUrl = getApiBaseUrl()
const basePath = getBasePath()

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(basePath ? { basePath } : {}),
  images: {
    unoptimized: true,
  },
  ...(isStaticIisBuild
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {
        async rewrites() {
          return [
            {
              source: "/api-proxy/:path*",
              destination: `${apiBaseUrl}/api/:path*`,
            },
          ]
        },
      }),
}

export default nextConfig
