/** @type {import('next').NextConfig} */
const defaultApiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://rdweb.zulu.com.ar/ZuluIA_Back"
    : "http://localhost:5065"

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || defaultApiBaseUrl).replace(/\/+$/, "")

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
