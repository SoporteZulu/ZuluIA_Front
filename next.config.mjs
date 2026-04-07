/** @type {import('next').NextConfig} */
const DEVELOPMENT_API_BASE_URL = "http://localhost:5065"

const normalizeApiBaseUrl = (value) => value.trim().replace(/\/+$/, "")

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

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
